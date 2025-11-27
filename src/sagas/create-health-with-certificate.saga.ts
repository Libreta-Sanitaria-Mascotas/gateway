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

interface CreateHealthWithCertificateData {
  healthData: any;
  certificate?: UploadedFilePayload;
}

@Injectable()
export class CreateHealthWithCertificateSaga
  implements ISaga<CreateHealthWithCertificateData, any>
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

  async execute(data: CreateHealthWithCertificateData) {
    let healthRecord: any = null;
    let certificate: any = null;

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

      if (data.certificate) {
        const certificateFile = data.certificate;
          const uploadCertificateStep: SagaStep = {
            name: 'upload_certificate',
            execute: async () => {
            certificate = await this.mediaHttpService.uploadFile(
              certificateFile,
              'health',
              healthRecord.id,
            );
            await this.sendWithResilience(
              this.healthService.send(
                { cmd: 'link_media' },
                { healthRecordId: healthRecord.id, mediaId: certificate.id },
              ),
            );
            return certificate;
          },
          compensate: async () => {
            if (certificate?.id) {
              await lastValueFrom(
                this.mediaService.send({ cmd: 'delete_file' }, { id: certificate.id }),
              );
              await lastValueFrom(
                this.healthService.send(
                  { cmd: 'unlink_media' },
                  { healthRecordId: healthRecord.id, mediaId: certificate.id },
                ),
              );
            }
          },
        };

        certificate = await uploadCertificateStep.execute();
        this.executedSteps.push(uploadCertificateStep);
      }

      return { healthRecord, certificate };
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
