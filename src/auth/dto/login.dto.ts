import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
export class LoginDto {
    @IsNotEmpty()
    @IsEmail()
    @ApiProperty({example: 'usuario@mail.com'})
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({example: 'password123'})
    password: string;
}