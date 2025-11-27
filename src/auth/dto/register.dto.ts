import { IsEmail, IsNotEmpty, MinLength, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'Juan' })
    firstName: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'Pérez' })
    lastName: string;

    @IsNotEmpty()
    @IsEmail()
    @ApiProperty({ example: 'usuario@mail.com' })
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({ example: 'password123' })
    password: string;
}
