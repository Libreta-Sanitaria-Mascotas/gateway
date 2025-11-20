import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { ISaga, SagaStep } from './saga.interface';
import { MEDIA_SERVICE, PET_SERVICE } from 'src/config';
type UploadedPhoto = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

interface CreatePetWithPhotoData {
  petData: any;
  photo?: UploadedPhoto;
}

@Injectable()
export class CreatePetWithPhotoSaga implements ISaga<CreatePetWithPhotoData, any> {
  private executedSteps: SagaStep[] = [];

  constructor(
    @Inject(PET_SERVICE) private readonly petService: ClientProxy,
    @Inject(MEDIA_SERVICE) private readonly mediaService: ClientProxy,
  ) {}

  async execute(data: CreatePetWithPhotoData) {
    let pet: any = null;
    let photo: any = null;
    try {
      const createPetStep: SagaStep = {
        name: 'create_pet',
        execute: async () => {
          pet = await lastValueFrom(
            this.petService.send({ cmd: 'create_pet' }, data.petData),
          );
          return pet;
        },
        compensate: async () => {
          if (pet) {
            await lastValueFrom(
              this.petService.send({ cmd: 'delete_pet' }, { id: pet.id }),
            );
          }
        },
      };
      pet = await createPetStep.execute();
      this.executedSteps.push(createPetStep);

      if (data.photo) {
        const photoFile = data.photo;
        const uploadPhotoStep: SagaStep = {
          name: 'upload_photo',
          execute: async () => {
            const payload = {
              file: {
                data: photoFile.buffer.toString('base64'),
                originalname: photoFile.originalname,
                mimetype: photoFile.mimetype,
                size: photoFile.size,
              },
              entityType: 'pet',
              entityId: pet.id,
            };
            photo = await lastValueFrom(
              this.mediaService.send({ cmd: 'upload_file' }, payload),
            );
            return photo;
          },
          compensate: async () => {
            if (photo) {
              await lastValueFrom(
                this.mediaService.send({ cmd: 'delete_file' }, { id: photo.id }),
              );
            }
          },
        };
        photo = await uploadPhotoStep.execute();
        this.executedSteps.push(uploadPhotoStep);
      }

      return { pet, photo };
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  async compensate() {
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      try {
        await this.executedSteps[i].compensate();
      } catch (err) {
        // En modo mejor esfuerzo: loguear y continuar
        console.error(
          `[Saga] Error compensando paso ${this.executedSteps[i].name}:`,
          err,
        );
      }
    }
    this.executedSteps = [];
  }
}
