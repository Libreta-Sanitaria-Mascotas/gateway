import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../media.controller';
import { MediaHttpService } from '../media-http.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

jest.mock('src/config', () => ({
  envs: { mediaServiceUrl: 'http://media' },
  getRabbitmqUrl: () => '',
  AUTH_SERVICE: 'auth',
  USER_SERVICE: 'user',
  MEDIA_SERVICE: 'media',
}), { virtual: true });

describe('MediaController', () => {
  let controller: MediaController;
  const mediaService = {
    ingestFromUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: MediaHttpService, useValue: mediaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should call ingestFromUrl on media service', async () => {
    mediaService.ingestFromUrl.mockResolvedValue({ id: 'media1' });

    const result = await controller.ingestFromUrl({
      url: 'https://example.com/img.jpg',
      entityType: 'user',
      entityId: 'u1',
    });

    expect(mediaService.ingestFromUrl).toHaveBeenCalledWith(
      'https://example.com/img.jpg',
      'user',
      'u1',
    );
    expect(result).toEqual({ id: 'media1' });
  });
});
