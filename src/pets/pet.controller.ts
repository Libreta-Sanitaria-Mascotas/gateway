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
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { PET_SERVICE, USER_SERVICE } from 'src/config';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Pets')
@Controller('pets')
export class PetController {
  constructor(
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy,
  ) {}

  @ApiOperation({ summary: 'Register my pet' })
  @ApiBody({ type: CreatePetDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createPetDto: CreatePetDto, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await lastValueFrom(
        this.clientUserService
          .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
          .pipe(timeout(3000)),
      );
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
      console.log('error', error);
    }
  }

  @ApiOperation({ summary: 'List my pets' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await lastValueFrom(
        this.clientUserService
          .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
          .pipe(timeout(3000)),
      );
      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'Usuario no encontrado',
        });
      console.log('USER', user);  
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

  @Get(':id')
  findOne(@Param('id') id: number) {
    //return this.clientPetService.send({ cmd: 'find_one_pet' }, { id });
    return `find one pet ${id}`;
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updatePetDto: UpdatePetDto) {
    //return this.clientPetService.send({ cmd: 'update_pet' }, { ...updatePetDto, id });
    return `update pet ${JSON.stringify(updatePetDto)} ${id}`;
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return `delete pet ${id}`;
    //return this.clientPetService.send({ cmd: 'remove_pet' }, { id });
  }
}
