import {
  Inject,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { USER_SERVICE, MEDIA_SERVICE } from '../config';
import { lastValueFrom, timeout } from 'rxjs';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserCacheService } from '../cache/user-cache.service';
import { MediaHttpService } from 'src/media/media-http.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy,
    @Inject(MEDIA_SERVICE) private readonly mediaClient: ClientProxy,
    private readonly userCacheService: UserCacheService,
    private readonly mediaHttpService: MediaHttpService,
  ) { }

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    const credentialId = req.user?.userId;
    return this.clientUserService
      .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
      .pipe(timeout(3000));
  }

  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const credentialId = req.user?.userId;
    
    // Get user data
    const user = await lastValueFrom(
      this.clientUserService
        .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
        .pipe(timeout(3000)),
    );

    // Upload to media service (HTTP, evita base64 por Rabbit)
    const media = await this.mediaHttpService.uploadFile(file, 'user', user.id);

    // Update user with avatar URL - use direct media service path
    // Frontend will access via http://localhost:3005/api/media/{id}
    const avatarUrl = `http://localhost:3005/api/media/${media.id}`;
    await lastValueFrom(
      this.clientUserService
        .send({ cmd: 'update_user' }, { id: user.id, avatarUrl })
        .pipe(timeout(3000)),
    );
    await this.userCacheService.invalidateUser(credentialId);

    return { ...user, avatarUrl };
  }

  @ApiOperation({ summary: 'Delete avatar for current user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('me/avatar')
  async deleteAvatar(@Req() req) {
    const credentialId = req.user?.userId;
    
    // Get user data
    const user = await lastValueFrom(
      this.clientUserService
        .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
        .pipe(timeout(3000)),
    );

    if (user.avatarUrl) {
      // Extract media ID from avatarUrl
      const mediaId = user.avatarUrl.split('/').pop();
      
      // Delete from media service
      await lastValueFrom(
        this.mediaClient.send({ cmd: 'delete_file' }, { id: mediaId }).pipe(timeout(3000)),
      );

      // Update user to remove avatar URL
      await lastValueFrom(
        this.clientUserService
          .send({ cmd: 'update_user' }, { id: user.id, avatarUrl: null })
          .pipe(timeout(3000)),
      );
    }
    await this.userCacheService.invalidateUser(credentialId);

    return { message: 'Avatar eliminado exitosamente' };
  }

  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateUserDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const res = await lastValueFrom(
      this.clientUserService
        .send({ cmd: 'update_user' }, { ...updateUserDto, id })
        .pipe(timeout(3000)),
    );
    if (updateUserDto?.credentialId) {
      await this.userCacheService.invalidateUser(updateUserDto.credentialId);
    }
    return res;
  }
}
