import { Controller, Inject, Post, Get, Param, Patch, Body, Delete } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Controller('pets')
export class PetController {
  constructor(@Inject(PET_SERVICE) private readonly clientPetService: ClientProxy) { }

  @Post()
  create(@Body() createPetDto: CreatePetDto) {
    //return this.clientPetService.send({ cmd: 'create_pet' }, createPetDto);
    return `create pet ${createPetDto}`;
  }

  @Get()
  findAll() {
    //return this.clientPetService.send({ cmd: 'find_all_pets' }, {});
    return `find all pets`;
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    //return this.clientPetService.send({ cmd: 'find_one_pet' }, { id });
    return `find one pet ${id}`;
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updatePetDto: UpdatePetDto) {
    //return this.clientPetService.send({ cmd: 'update_pet' }, { ...updatePetDto, id });
    return `update pet ${id}`;
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return `delete pet ${id}`;
    //return this.clientPetService.send({ cmd: 'remove_pet' }, { id });
  }
}
