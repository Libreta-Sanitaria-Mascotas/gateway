import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of } from 'rxjs';
import { UserCacheService } from './user-cache.service';
import { USER_SERVICE } from '../config';
import { LoggerService } from '../common/logger/logger.service';

describe('UserCacheService', () => {
  let service: UserCacheService;
  let cacheManager: any;
  let userService: any;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: USER_SERVICE,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<UserCacheService>(UserCacheService);
    cacheManager = moduleRef.get(CACHE_MANAGER);
    userService = moduleRef.get(USER_SERVICE);
  });

  it('debe retornar usuario del caché si existe', async () => {
    const mockUser = { id: '123', firstName: 'Test' };
    cacheManager.get.mockResolvedValue(mockUser);

    const result = await service.getUserByCredentialId('cred-123');

    expect(result).toEqual(mockUser);
    expect(cacheManager.get).toHaveBeenCalledWith('user:credential:cred-123');
    expect(userService.send).not.toHaveBeenCalled();
  });

  it('debe consultar servicio si no está en caché', async () => {
    const mockUser = { id: '123', firstName: 'Test' };
    cacheManager.get.mockResolvedValue(null);
    userService.send.mockReturnValue(of(mockUser));

    const result = await service.getUserByCredentialId('cred-123');

    expect(result).toEqual(mockUser);
    expect(cacheManager.set).toHaveBeenCalledWith(
      'user:credential:cred-123',
      mockUser,
      300,
    );
  });
});
