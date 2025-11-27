import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, retry, timer } from 'rxjs';
import { USER_SERVICE } from '../config';
import { LoggerService } from '../common/logger/logger.service';

type CacheClient = {
  get: <T = any>(key: string) => Promise<T | undefined>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
};

@Injectable()
export class UserCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheClient,
    @Inject(USER_SERVICE) private readonly userService: ClientProxy,
    private readonly logger: LoggerService,
  ) {}

  private async sendWithResilience<T>(observable$: any) {
    return lastValueFrom(
      observable$.pipe(
        timeout(3000),
        retry({ count: 2, delay: (_err, retryCount) => timer((retryCount + 1) * 300) }),
      ),
    );
  }

  /**
   * Obtiene un usuario por credentialId con caché
   * @param credentialId ID de credencial del usuario
   * @returns Usuario encontrado
   */
  async getUserByCredentialId(credentialId: string) {
    const cacheKey = `user:credential:${credentialId}`;

    // Intentar obtener del caché
    let user = await this.cacheManager.get(cacheKey);

    if (user) {
      this.logger.debug(`Cache HIT - User ${credentialId}`, 'UserCacheService.getUserByCredentialId');
      return user;
    }

    // Si no está en caché, consultar al servicio
    this.logger.debug(`Cache MISS - Fetching user ${credentialId} from User Service`, 'UserCacheService.getUserByCredentialId');
    user = await this.sendWithResilience(
      this.userService.send({ cmd: 'find_user_by_credential_id' }, { credentialId }),
    );

    if (user) {
      // Guardar en caché por 5 minutos
      await this.cacheManager.set(cacheKey, user, 300);
      this.logger.debug(`Cached user ${credentialId}`, 'UserCacheService.getUserByCredentialId');
    }

    return user;
  }

  /**
   * Obtiene una mascota por ID con caché
   * @param petId ID de la mascota
   * @param petService Cliente del servicio de mascotas
   * @returns Mascota encontrada
   */
  async getPetById(petId: string, petService: ClientProxy) {
    const cacheKey = `pet:${petId}`;

    let pet = await this.cacheManager.get(cacheKey);

    if (pet) {
      this.logger.debug(`Cache HIT - Pet ${petId}`, 'UserCacheService.getPetById');
      return pet;
    }

    this.logger.debug(`Cache MISS - Fetching pet ${petId} from Pet Service`, 'UserCacheService.getPetById');
    pet = await this.sendWithResilience(petService.send({ cmd: 'find_pet' }, petId));

    if (pet) {
      // Guardar en caché por 10 minutos
      await this.cacheManager.set(cacheKey, pet, 600);
      this.logger.debug(`Cached pet ${petId}`, 'UserCacheService.getPetById');
    }

    return pet;
  }

  /**
   * Invalida el caché de un usuario
   * @param credentialId ID de credencial del usuario
   */
  async invalidateUser(credentialId: string) {
    const cacheKey = `user:credential:${credentialId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Cache invalidated - User ${credentialId}`, 'UserCacheService.invalidateUser');
  }

  /**
   * Invalida el caché de una mascota
   * @param petId ID de la mascota
   */
  async invalidatePet(petId: string) {
    const cacheKey = `pet:${petId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Cache invalidated - Pet ${petId}`, 'UserCacheService.invalidatePet');
  }

  /**
   * Limpia todo el caché (no disponible en todas las versiones de cache-manager)
   * Alternativa: invalidar claves específicas
   */
  async clearAll() {
    // Note: reset() may not be available in all cache-manager versions
    // In production, consider invalidating specific keys or using Redis FLUSHDB
    this.logger.warn('Cache clear not implemented - use specific invalidation', 'UserCacheService.clearAll');
  }
}
