import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, MinLength, IsString } from 'class-validator';

export class UpdateCredentialsDto {
  @ApiPropertyOptional({ example: 'nuevo@mail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;

  @ApiPropertyOptional({ example: 'nuevaPassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;
}
