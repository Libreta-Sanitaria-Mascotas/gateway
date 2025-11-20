import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';
import { HEALTH_SERVICE, getRabbitmqUrl } from 'src/config';
import { PetModule } from 'src/pets/pet.module';
import { UsersModule } from 'src/users/users.module';
import { CustomCacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    ClientsModule.register([{
      name: HEALTH_SERVICE,
      transport: Transport.RMQ,
      options: {
        urls: [getRabbitmqUrl()],
        queue: 'health_queue',
        queueOptions: {
          durable: true,
        },
      },
    }]),
    PetModule,
    UsersModule,
    CustomCacheModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule { }
