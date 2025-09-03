import { Body, Controller, Delete, Get, Param, Patch, Post, Inject, Req } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './dto/create-health.-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HEALTH_SERVICE, PET_SERVICE, USER_SERVICE } from 'src/config';
import { lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';


@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE) private readonly clientHealthService: ClientProxy,
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy
  ) { }

  @ApiOperation({ summary: 'Create a new health record' })
  @ApiBody({ type: CreateHealthRecordDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createHealthRecordDto: CreateHealthRecordDto, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      const pet = await lastValueFrom(this.clientPetService.send({ cmd: 'find_pet' }, createHealthRecordDto.petId));
      if (!pet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Pet not found',
        });
      }
      if (pet.ownerId !== credentialId) {
        throw new RpcException({
          statusCode: 403,
          message: 'Not authorized',
        });
      }
      const healthRecord = await lastValueFrom(this.clientHealthService.send({ cmd: 'create_health_record' }, { ...createHealthRecordDto, petId: pet.id }));
      return healthRecord;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({ statusCode: error.getStatus(), message: error.message });
    }
  }

  @ApiOperation({ summary: 'Get all health records by pet id' })
  @Get(':petId')
  async findAll(@Param('petId') petId: string) {
    try {
      const pet = await lastValueFrom(this.clientPetService.send({ cmd: 'find_pet' }, petId));
      if (!pet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Pet not found',
        });
      }
      return await lastValueFrom(this.clientHealthService.send({ cmd: 'find_all_health_records_by_pet_id' }, { petId }));
    } catch (error) {
      throw new RpcException(error);
    }
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
