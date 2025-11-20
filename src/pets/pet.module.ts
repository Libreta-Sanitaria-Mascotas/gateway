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
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin123@rabbitmq:5672'],
        queue: 'pet_queue',
        queueOptions: {
          durable: true,
        },
      },
    }
  ]), UsersModule],
  controllers: [PetController],
  providers: [],
  exports: [ClientsModule],
})
export class PetModule { }
