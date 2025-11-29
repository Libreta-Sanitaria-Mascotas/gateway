import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateHealthRecordDto } from './create-health-record.dto';

export class UpdateHealthRecordDto extends PartialType(CreateHealthRecordDto) {
  @IsUUID()
  @IsOptional()
  id?: string;
}
