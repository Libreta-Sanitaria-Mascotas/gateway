import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PetModule } from './pet/pet.module';

@Module({
  imports: [
    AuthModule, 
    UsersModule, 
    PetModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
