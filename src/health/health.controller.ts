import { Body, Controller, Delete, Get, Param, Patch, Post, Inject, Req, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './dto/create-health.-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HEALTH_SERVICE, PET_SERVICE } from 'src/config';
import { lastValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserCacheService } from 'src/cache/user-cache.service';


@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE) private readonly clientHealthService: ClientProxy,
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    private readonly userCacheService: UserCacheService,
  ) { }

  @ApiOperation({ summary: 'Create a new health record' })
  @ApiBody({ type: CreateHealthRecordDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createHealthRecordDto: CreateHealthRecordDto, @Req() req) {
    try {
      const credentialId = req.user?.userId;

      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user) {
        throw new RpcException({
          statusCode: 404,
          message: 'User not found',
        });
      }

      const pet = await this.userCacheService.getPetById(
        createHealthRecordDto.petId,
        this.clientPetService,
      );
      if (!pet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Pet not found',
        });
      }
      
      // Compare pet.ownerId with user.id (not credentialId)
      if (pet.ownerId !== user.id) {
        throw new RpcException({
          statusCode: 403,
          message: 'Not authorized',
        });
      }
      
      const healthRecord = await lastValueFrom(
        this.clientHealthService
          .send({ cmd: 'create_health_record' }, { ...createHealthRecordDto, petId: pet.id })
          .pipe(timeout(3000)),
      );
      return healthRecord;
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({ statusCode: error.getStatus(), message: error.message });
    }
  }

  @ApiOperation({ summary: 'Get all health records for current user pets' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllForUser(@Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user) {
        throw new RpcException({ statusCode: 404, message: 'User not found' });
      }

      const pets = await lastValueFrom(
        this.clientPetService
          .send({ cmd: 'find_all_pets_by_owner_id' }, { ownerId: user.id })
          .pipe(timeout(3000)),
      );

      if (!pets || pets.length === 0) {
        return [];
      }

      const recordsPerPet = await Promise.all(
        pets.map((pet) =>
          lastValueFrom(
            this.clientHealthService
              .send({ cmd: 'find_all_health_records_by_pet_id' }, { petId: pet.id })
              .pipe(timeout(3000)),
          ).catch(() => []),
        ),
      );

      return recordsPerPet.flat();
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({ statusCode: 500, message: error?.message ?? 'Unexpected error' });
    }
  }

  @ApiOperation({ summary: 'Get all health records by pet id' })
  @Get('pet/:petId')
  async findAll(@Param('petId') petId: string) {
    try {
      const pet = await this.userCacheService.getPetById(
        petId,
        this.clientPetService,
      );
      if (!pet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Pet not found',
        });
      }
      return await lastValueFrom(
        this.clientHealthService
          .send({ cmd: 'find_all_health_records_by_pet_id' }, { petId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await lastValueFrom(
      this.clientHealthService
        .send({ cmd: 'find_health_record_by_id' }, { id })
        .pipe(timeout(3000)),
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateHealthRecordDto: UpdateHealthRecordDto,
  ) {
    return await lastValueFrom(
      this.clientHealthService.send(
        { cmd: 'update_health_record_by_id' },
        { ...updateHealthRecordDto, id },
      ).pipe(timeout(3000)),
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return await lastValueFrom(
      this.clientHealthService
        .send({ cmd: 'delete_health_record_by_id' }, { id })
        .pipe(timeout(3000)),
    );
  }
}
