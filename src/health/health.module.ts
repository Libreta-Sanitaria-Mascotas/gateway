import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';
import { HEALTH_SERVICE } from 'src/config';
import { envs } from 'src/config/envs';
import { PetModule } from 'src/pets/pet.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    ClientsModule.register([{
      name: HEALTH_SERVICE,
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin123@rabbitmq:5672'],
        queue: 'health_queue',
        queueOptions: {
          durable: true,
        },
      },
    }]),
    PetModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule { }
