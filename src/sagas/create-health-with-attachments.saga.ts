import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, retry, timeout, timer } from 'rxjs';
import { HEALTH_SERVICE, MEDIA_SERVICE } from 'src/config';
import { MediaHttpService } from 'src/media/media-http.service';
import { ISaga, SagaStep } from './saga.interface';
type UploadedFilePayload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

interface CreateHealthWithAttachmentsData {
  healthData: any;
  attachments?: UploadedFilePayload[];
}

@Injectable()
export class CreateHealthWithAttachmentsSaga
  implements ISaga<CreateHealthWithAttachmentsData, any>
{
  private executedSteps: SagaStep[] = [];

  constructor(
    @Inject(HEALTH_SERVICE) private readonly healthService: ClientProxy,
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

  async execute(data: CreateHealthWithAttachmentsData) {
    let healthRecord: any = null;
    const uploadedAttachments: any[] = [];

    try {
      const createHealthStep: SagaStep = {
        name: 'create_health_record',
        execute: async () => {
          healthRecord = await this.sendWithResilience(
            this.healthService.send({ cmd: 'create_health_record' }, data.healthData),
          );
          return healthRecord;
        },
        compensate: async () => {
          if (healthRecord?.id) {
            await lastValueFrom(
              this.healthService.send(
                { cmd: 'delete_health_record_by_id' },
                { id: healthRecord.id },
              ),
            );
          }
        },
      };

      healthRecord = await createHealthStep.execute();
      this.executedSteps.push(createHealthStep);

      if (data.attachments?.length) {
        const uploadAttachmentsStep: SagaStep = {
          name: 'upload_attachments',
          execute: async () => {
            for (const attachment of data.attachments ?? []) {
              const media = await this.mediaHttpService.uploadFile(
                attachment,
                'health',
                healthRecord.id,
              );
              uploadedAttachments.push(media);
              await this.sendWithResilience(
                this.healthService.send(
                  { cmd: 'link_media' },
                  { healthRecordId: healthRecord.id, mediaId: media.id },
                ),
              );
              healthRecord.mediaIds = [...(healthRecord?.mediaIds ?? []), media.id];
            }
            return uploadedAttachments;
          },
          compensate: async () => {
            for (const media of uploadedAttachments) {
              try {
                await lastValueFrom(
                  this.mediaService.send({ cmd: 'delete_file' }, { id: media.id }),
                );
                await lastValueFrom(
                  this.healthService.send(
                    { cmd: 'unlink_media' },
                    { healthRecordId: healthRecord.id, mediaId: media.id },
                  ),
                );
              } catch (err) {
                // best-effort compensation; log could be added here
              }
            }
          },
        };

        this.executedSteps.push(uploadAttachmentsStep);
        await uploadAttachmentsStep.execute();
      }

      return { healthRecord, attachments: uploadedAttachments };
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
