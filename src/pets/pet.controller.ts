import { Controller, Inject, Post, Get, Param, Patch, Body, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { PET_SERVICE, USER_SERVICE } from 'src/config';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('pets')
export class PetController {
  constructor(
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy,
  ) { }

  @ApiOperation({ summary: 'Create a new pet' })
  @ApiBody({ type: CreatePetDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createPetDto: CreatePetDto, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await lastValueFrom(this.clientUserService.send({ cmd: 'find_user_by_auth_id' }, { credentialId }));
      const pet = await lastValueFrom(this.clientPetService.send({ cmd: 'create_pet' }, { ...createPetDto, ownerId: user.id }));
      console.log('pet', pet);
      return pet;
    } catch (error) {
      console.log('error', error);
    }
  }

  @Get()
  findAll() {
    return this.clientPetService.send({ cmd: 'find_all_pets' }, {});
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
