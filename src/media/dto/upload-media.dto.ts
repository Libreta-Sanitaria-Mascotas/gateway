import { IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadMediaDto {
  @ApiProperty({
    enum: ['pet', 'health'],
    description: 'Tipo de entidad a la que pertenece el archivo',
  })
  @IsEnum(['pet', 'health'])
  entityType: 'pet' | 'health';

  @ApiProperty({
    description: 'ID de la entidad (pet o health record)',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'ID del registro de salud (opcional, para vinculación automática)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  healthRecordId?: string;
}
