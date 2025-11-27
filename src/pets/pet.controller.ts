import {
  Controller,
  Inject,
  Post,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { PET_SERVICE } from 'src/config';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserCacheService } from 'src/cache/user-cache.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePetWithPhotoSaga } from 'src/sagas/create-pet-with-photo.saga';
type UploadedPhoto = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
};

@ApiTags('Pets')
@Controller('pets')
export class PetController {
  constructor(
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    private readonly userCacheService: UserCacheService,
    private readonly createPetWithPhotoSaga: CreatePetWithPhotoSaga,
  ) {}

  @ApiOperation({ summary: 'Register my pet' })
  @ApiBody({ type: CreatePetDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createPetDto: CreatePetDto, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      // ✅ Usar caché en lugar de llamada directa al User Service
      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'Usuario no encontrado',
        });
      const pet = await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'create_pet' }, { ...createPetDto, ownerId: user.id })
          .pipe(timeout(3000)),
      );
      return pet;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: error?.status ?? 500,
            message: error?.message ?? 'No se pudo crear la mascota',
          });
    }
  }

  @ApiOperation({ summary: 'Register my pet with photo (Saga)' })
  @ApiBody({ type: CreatePetDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @Post('with-photo')
  async createWithPhoto(
    @Body() createPetDto: CreatePetDto,
    @UploadedFile() photo: UploadedPhoto,
    @Req() req,
  ) {
    const credentialId = req.user?.userId;
    const user = await this.userCacheService.getUserByCredentialId(credentialId);
    if (!user)
      throw new RpcException({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });

    return this.createPetWithPhotoSaga.execute({
      petData: { ...createPetDto, ownerId: user.id },
      photo,
    });
  }

  @ApiOperation({ summary: 'List my pets' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req) {
    try {
      const credentialId = req.user?.userId;
      // ✅ Usar caché en lugar de llamada directa al User Service
      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'Usuario no encontrado',
        });
      const pets = await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'find_all_pets_by_owner_id' }, { ownerId: user.id })
          .pipe(timeout(3000)),
      );
      if (!pets)
        throw new RpcException({
          statusCode: 404,
          message: 'No se encontraron mascotas',
        });
      return pets;
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @ApiOperation({ summary: 'Get pet by ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'Usuario no encontrado',
        });
      }

      const pet = await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'find_pet' }, id)
          .pipe(timeout(3000)),
      );
      if (!pet)
        throw new RpcException({
          statusCode: 404,
          message: 'Mascota no encontrada',
        });
      if (pet.ownerId !== user.id) {
        throw new RpcException({
          statusCode: 403,
          message: 'No autorizado',
        });
      }
      return pet;
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @ApiOperation({ summary: 'Update pet by ID' })
  @ApiBody({ type: UpdatePetDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    try {
      const pet = await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'update_pet' }, { ...updatePetDto, id })
          .pipe(timeout(3000)),
      );
      await this.userCacheService.invalidatePet(id);
      return pet;
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @ApiOperation({ summary: 'Delete pet by ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'delete_pet' }, id)
          .pipe(timeout(3000)),
      );
      await this.userCacheService.invalidatePet(id);
      return { message: 'Mascota eliminada correctamente' };
    } catch (error) {
      throw new RpcException(error);
    }
  }
}
