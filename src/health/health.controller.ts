import { Body, Controller, Delete, Get, Param, Patch, Post, Inject, Req, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HEALTH_SERVICE, PET_SERVICE } from 'src/config';
import { lastValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserCacheService } from 'src/cache/user-cache.service';
import { CreateHealthWithAttachmentsSaga } from 'src/sagas/create-health-with-attachments.saga';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const healthTypeLabelsEsAr: Record<string, string> = {
  vaccine: 'Vacunación',
  consultation: 'Consulta',
  deworming: 'Desparasitación',
  analysis: 'Análisis',
  other: 'Otro',
};

const formatDateDisplay = (value: string | Date) => {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = `${date.getUTCDate()}`.padStart(2, '0');
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const withPresentation = <
  T extends { type?: string; date?: string | Date; nextVisitDate?: string | Date; hasNextVisit?: boolean }
>(
  record: T,
) =>
  record
    ? {
        ...record,
        hasNextVisit: !!record.hasNextVisit,
        typeLabel: record.type ? healthTypeLabelsEsAr[record.type] ?? record.type : undefined,
        displayDate: record.date ? formatDateDisplay(record.date) : undefined,
        displayNextVisitDate:
          record.hasNextVisit && record.nextVisitDate ? formatDateDisplay(record.nextVisitDate) : undefined,
      }
    : record;


@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_SERVICE) private readonly clientHealthService: ClientProxy,
    @Inject(PET_SERVICE) private readonly clientPetService: ClientProxy,
    private readonly userCacheService: UserCacheService,
    private readonly createHealthWithAttachmentsSaga: CreateHealthWithAttachmentsSaga,
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
          .send(
            { cmd: 'create_health_record' },
            { ...createHealthRecordDto, petId: pet.id, ownerId: user.id },
          )
          .pipe(timeout(3000)),
      );
      return withPresentation(healthRecord);
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({ statusCode: error.getStatus(), message: error.message });
    }
  }

  @ApiOperation({ summary: 'Create a new health record with attachments (Saga)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateHealthRecordDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
    }),
  )
  @Post('with-media')
  async createWithMedia(
    @Body() createHealthRecordDto: CreateHealthRecordDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
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
      if (pet.ownerId !== user.id) {
        throw new RpcException({
          statusCode: 403,
          message: 'Not authorized',
        });
      }

      const attachments = (files ?? []).map((file) => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));

      const result = await this.createHealthWithAttachmentsSaga.execute({
        healthData: { ...createHealthRecordDto, petId: pet.id, ownerId: user.id },
        attachments,
      });
      return {
        healthRecord: withPresentation(result.healthRecord),
        attachments: result.attachments ?? [],
      };
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({
            statusCode: error?.statusCode ?? error?.status ?? 500,
            message: error?.message ?? 'Unexpected error creating health record with attachments',
          });
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

      return recordsPerPet.flat().map((record) => withPresentation(record));
    } catch (error) {
      throw error instanceof RpcException
        ? error
        : new RpcException({ statusCode: 500, message: error?.message ?? 'Unexpected error' });
    }
  }

  @ApiOperation({ summary: 'Get all health records by pet id' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('pet/:petId')
  async findAll(@Param('petId') petId: string, @Req() req) {
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
        petId,
        this.clientPetService,
      );
      if (!pet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Pet not found',
        });
      }
      if (pet.ownerId !== user.id) {
        throw new RpcException({
          statusCode: 403,
          message: 'Not authorized',
        });
      }
      const records = await lastValueFrom(
        this.clientHealthService
          .send({ cmd: 'find_all_health_records_by_pet_id' }, { petId })
          .pipe(timeout(3000)),
      );
      return records?.map((record) => withPresentation(record)) ?? [];
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    try {
      const credentialId = req.user?.userId;
      const user = await this.userCacheService.getUserByCredentialId(credentialId);
      if (!user) {
        throw new RpcException({ statusCode: 404, message: 'User not found' });
      }

      const record = await lastValueFrom(
        this.clientHealthService
          .send({ cmd: 'find_health_record_by_id' }, { id })
          .pipe(timeout(3000)),
      );

      if (!record) {
        throw new RpcException({ statusCode: 404, message: 'Health record not found' });
      }

      const pet = await this.userCacheService.getPetById(
        record.petId,
        this.clientPetService,
      );
      if (!pet) {
        throw new RpcException({ statusCode: 404, message: 'Pet not found' });
      }
      if (pet.ownerId !== user.id) {
        throw new RpcException({ statusCode: 403, message: 'Not authorized' });
      }

      return withPresentation(record);
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateHealthRecordDto: UpdateHealthRecordDto,
    @Req() req,
  ) {
    const credentialId = req.user?.userId;
    const user = await this.userCacheService.getUserByCredentialId(credentialId);
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'User not found' });
    }

    const record = await lastValueFrom(
      this.clientHealthService
        .send({ cmd: 'find_health_record_by_id' }, { id })
        .pipe(timeout(3000)),
    );

    if (!record) {
      throw new RpcException({ statusCode: 404, message: 'Health record not found' });
    }

    const pet = await this.userCacheService.getPetById(
      record.petId,
      this.clientPetService,
    );
    if (!pet) {
      throw new RpcException({ statusCode: 404, message: 'Pet not found' });
    }
    if (pet.ownerId !== user.id) {
      throw new RpcException({ statusCode: 403, message: 'Not authorized' });
    }

    const updated = await lastValueFrom(
      this.clientHealthService.send(
        { cmd: 'update_health_record_by_id' },
        { ...updateHealthRecordDto, id, ownerId: user.id },
      ).pipe(timeout(3000)),
    );

    return withPresentation(updated);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    const credentialId = req.user?.userId;
    const user = await this.userCacheService.getUserByCredentialId(credentialId);
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'User not found' });
    }

    const record = await lastValueFrom(
      this.clientHealthService
        .send({ cmd: 'find_health_record_by_id' }, { id })
        .pipe(timeout(3000)),
    );
    if (!record) {
      throw new RpcException({ statusCode: 404, message: 'Health record not found' });
    }

    const pet = await this.userCacheService.getPetById(
      record.petId,
      this.clientPetService,
    );
    if (!pet) {
      throw new RpcException({ statusCode: 404, message: 'Pet not found' });
    }
    if (pet.ownerId !== user.id) {
      throw new RpcException({ statusCode: 403, message: 'Not authorized' });
    }

    return await lastValueFrom(
      this.clientHealthService
        .send({ cmd: 'delete_health_record_by_id' }, { id, ownerId: user.id })
        .pipe(timeout(3000)),
    );
  }
}
