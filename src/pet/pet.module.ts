import { Module } from '@nestjs/common';
import { PetController } from './pet.controller';

@Module({
  imports: [],
  controllers: [PetController],
  providers: [],
})
export class PetModule {}
