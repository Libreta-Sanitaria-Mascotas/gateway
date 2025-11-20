import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { UserCacheService } from './user-cache.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE, getRabbitmqUrl } from '../config';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        return {
          // Typing workaround: redisStore type is compatible with cache-manager store
          store: (await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'redis',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            ttl: 300, // 5 minutos
          })) as any,
        };
      },
    }),
    ClientsModule.register([
      {
        name: USER_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'user_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [UserCacheService],
  exports: [CacheModule, UserCacheService],
})
export class CustomCacheModule {}
