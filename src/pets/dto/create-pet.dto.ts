import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
export class CreatePetDto {
  @ApiProperty({
    description: 'The name of the pet',
    example: 'Fluffy',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The species of the pet',
    example: 'Cat',
  })
  @IsString()
  @IsNotEmpty()
  species: string;

  @ApiProperty({
    description: 'The breed of the pet',
    example: 'Siamese',
  })
  @IsString()
  @IsNotEmpty()
  breed: string;

  @ApiProperty({
    description: 'The birth date of the pet',
    example: '2020-01-01',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  birthDate: Date;

  @ApiProperty({
    description: 'The sex of the pet',
    example: 'male',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['male', 'female'])
  @IsOptional()
  sex?: 'male' | 'female';

  @ApiProperty({
    description: 'The ID of the owner of the pet',
    example: '12345678-1234-1234-1234-123456789012',
  })
  @IsNotEmpty()
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
