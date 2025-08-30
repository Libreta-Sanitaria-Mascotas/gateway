import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './dto/create-health.-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';


@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    //private readonly clientHealthService: ClientProxy
  ) { }

  @Post()
  create(@Body() createHealthRecordDto: CreateHealthRecordDto) {
    return `health record ${JSON.stringify(createHealthRecordDto)}`;
  }

  @Get()
  findAll() {
    return `all health records`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `health record id ${id}`;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHealthRecordDto: UpdateHealthRecordDto) {
    return `update health record ${id}, data ${JSON.stringify(updateHealthRecordDto)}`;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `delete health register ${id}`;
  }
}
