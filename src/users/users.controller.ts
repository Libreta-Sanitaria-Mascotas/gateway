import {
  Inject,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { USER_SERVICE, MEDIA_SERVICE } from '../config';
import { lastValueFrom } from 'rxjs';
import { PaginationDto } from '../common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy,
    @Inject(MEDIA_SERVICE) private readonly mediaClient: ClientProxy,
  ) { }

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    const credentialId = req.user?.userId;
    return this.clientUserService.send({ cmd: 'find_user_by_credential_id' }, { credentialId });
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
      this.clientUserService.send({ cmd: 'find_user_by_credential_id' }, { credentialId }),
    );

    // Upload to media service
    const payload = {
      file: {
        data: file.buffer.toString('base64'),
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      entityType: 'user' as const,
      entityId: user.id,
    };

    const media = await lastValueFrom(
      this.mediaClient.send({ cmd: 'upload_file' }, payload),
    );

    // Update user with avatar URL
    const avatarUrl = `/api/media/${media.id}`;
    await lastValueFrom(
      this.clientUserService.send(
        { cmd: 'update_user' },
        { id: user.id, avatarUrl },
      ),
    );

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
      this.clientUserService.send({ cmd: 'find_user_by_credential_id' }, { credentialId }),
    );

    if (user.avatarUrl) {
      // Extract media ID from avatarUrl
      const mediaId = user.avatarUrl.split('/').pop();
      
      // Delete from media service
      await lastValueFrom(
        this.mediaClient.send({ cmd: 'delete_file' }, { id: mediaId }),
      );

      // Update user to remove avatar URL
      await lastValueFrom(
        this.clientUserService.send(
          { cmd: 'update_user' },
          { id: user.id, avatarUrl: null },
        ),
      );
    }

    return { message: 'Avatar eliminado exitosamente' };
  }

  @ApiOperation({ summary: 'Create a new user' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateUserDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    const credentialId = req.user?.userId;
    return this.clientUserService.send({ cmd: 'create_user' }, { ...createUserDto, credentialId });
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.clientUserService.send({ cmd: 'find_all' }, paginationDto);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientUserService.send({ cmd: 'find_user' }, id);
  }

  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.clientUserService.send(
      { cmd: 'update_user' },
      { ...updateUserDto, id },
    );
  }

  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientUserService.send({ cmd: 'remove_user' }, id);
  }
}
