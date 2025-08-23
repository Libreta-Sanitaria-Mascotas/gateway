import { Module } from '@nestjs/common';
import { PetController } from './pet.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PET_SERVICE } from 'src/config';
import { envs } from 'src/config/envs';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [ClientsModule.register([
    {
      name: PET_SERVICE,
      transport: Transport.TCP,
      options: {
        host: envs.petService,
        port: envs.petServicePort,
      },
    }
  ]), UsersModule],
  controllers: [PetController],
  providers: [],
})
export class PetModule { }
