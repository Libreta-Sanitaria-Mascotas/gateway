import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl, IsIn, IsOptional } from 'class-validator';

export class IngestFromUrlDto {
  @ApiProperty({
    description: 'URL pública del archivo a ingestar',
    example: 'https://example.com/avatar.jpg',
  })
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({
    description: 'Tipo de entidad asociada al archivo',
    example: 'user',
    enum: ['user', 'pet', 'health'],
  })
  @IsIn(['user', 'pet', 'health'])
  entityType: 'user' | 'pet' | 'health';

  @ApiProperty({
    description: 'ID de la entidad asociada',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  entityId?: string;
}
