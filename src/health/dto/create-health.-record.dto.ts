import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateHealthRecordDto {

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID of the pet'
    })
    @IsUUID()
    petId: string;

    @ApiProperty({
        example: 'vaccine',
        description: 'Type of the health record'
    })
    @IsIn(['vaccine', 'consultation', 'deworming', 'analysis', 'other'])
    type: 'vaccine' | 'consultation' | 'deworming' | 'analysis' | 'other';

    @ApiProperty({
        example: '2023-01-01',
        description: 'Date of the health record'
    })
    @IsDateString()
    date: string;

    @ApiProperty({
        example: 'Vaccination for Rabies',
        description: 'Title of the health record'
    })
    @IsString()
    title: string;

    @ApiProperty({
        example: 'Rabies vaccination for the pet',
        description: 'Description of the health record'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: 'Dr. J. Doe',
        description: 'Doctor of the health record'
    })
    @IsString()
    @IsOptional()
    doctor?: string;

    @ApiProperty({
        example: 'Clinic of the health record',
        description: 'Clinic of the health record'
    })
    @IsString()
    @IsOptional()
    clinic?: string;

    @ApiProperty({
        example: ['123e4567-e89b-12d3-a456-426614174000'],
        description: 'Media IDs of the health record'
    })
    @IsArray()
    @IsOptional()
    @IsUUID('all', { each: true })
    mediaIds?: string[];
}
