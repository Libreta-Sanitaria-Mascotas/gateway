import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PetModule } from './pets/pet.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    AuthModule, 
    UsersModule, 
    PetModule, 
    HealthModule,
    MediaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
