import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ 
    description: 'ID Token de Google obtenido desde el frontend',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjdkNmY...' 
  })
  idToken: string;
}
