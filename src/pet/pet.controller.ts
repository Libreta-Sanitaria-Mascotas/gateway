import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PetService } from './pet.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Controller()
export class PetController {
  constructor(private readonly petService: PetService) {}

  @MessagePattern('createPet')
  create(@Payload() createPetDto: CreatePetDto) {
    return this.petService.create(createPetDto);
  }

  @MessagePattern('findAllPet')
  findAll() {
    return this.petService.findAll();
  }

  @MessagePattern('findOnePet')
  findOne(@Payload() id: number) {
    return this.petService.findOne(id);
  }

  @MessagePattern('updatePet')
  update(@Payload() updatePetDto: UpdatePetDto) {
    return this.petService.update(updatePetDto.id, updatePetDto);
  }

  @MessagePattern('removePet')
  remove(@Payload() id: number) {
    return this.petService.remove(id);
  }
}
