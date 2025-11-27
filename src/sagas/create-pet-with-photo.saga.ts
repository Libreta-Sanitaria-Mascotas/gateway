import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, retry, timeout, timer } from 'rxjs';
import { ISaga, SagaStep } from './saga.interface';
import { MEDIA_SERVICE, PET_SERVICE } from 'src/config';
import { MediaHttpService } from 'src/media/media-http.service';
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
    private readonly mediaHttpService: MediaHttpService,
  ) {}

  private async sendWithResilience<T>(observable$: any) {
    return lastValueFrom(
      observable$.pipe(
        timeout(3000),
        retry({ count: 2, delay: (_err, retryCount) => timer((retryCount + 1) * 300) }),
      ),
    );
  }

  async execute(data: CreatePetWithPhotoData) {
    let pet: any = null;
    let photo: any = null;
    try {
      const createPetStep: SagaStep = {
        name: 'create_pet',
        execute: async () => {
          pet = await this.sendWithResilience(
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
              photo = await this.mediaHttpService.uploadFile(photoFile, 'pet', pet.id);
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
      } catch (compensationError) {
        // Best-effort compensation - log via service if needed
      }
    }
    this.executedSteps = [];
  }
}
