import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class LoginDto {
    @IsNotEmpty()
    @IsEmail({},{message: 'El email debe ser válido'})
    @ApiProperty({example: 'usuario@mail.com'})
    email: string;

    @IsNotEmpty()
    @MinLength(6, {message: 'La contraseña debe tener al menos 6 caracteres'})
    @ApiProperty({example: 'password123'})
    password: string;
}