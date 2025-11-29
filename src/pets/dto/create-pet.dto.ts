import {
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export const PET_SIZES = ['small', 'medium', 'large'] as const;
export type PetSize = (typeof PET_SIZES)[number];

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
  @IsIn(['male', 'female'])
  @IsOptional()
  sex?: 'male' | 'female';

  @ApiProperty({
    description: 'The ID of the owner of the pet',
    example: '12345678-1234-1234-1234-123456789012',
  })
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiProperty({
    description: 'Media ID asociado a la foto de la mascota',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  mediaId?: string;

  @ApiProperty({
    description: 'Tamaño de la mascota',
    example: 'medium',
    enum: PET_SIZES,
    required: false,
  })
  @IsIn(PET_SIZES)
  @IsOptional()
  size?: PetSize;

  @ApiProperty({
    description: 'Peso de la mascota en kilogramos',
    example: 8.5,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  weight?: number;
}
