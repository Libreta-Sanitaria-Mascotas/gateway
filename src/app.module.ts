import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PetModule } from './pets/pet.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { envs } from './config';
import { LoggerService } from './common/logger/logger.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: envs.redis.host,
      port: envs.redis.port,
      ttl: 300,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    PetModule,
    HealthModule,
    UsersModule,
    MediaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('gateway'),
    },
  ],
  exports: [LoggerService],
})
export class AppModule {}
