import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { USER_SERVICE } from '../config';

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
  ) {}

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
      console.log(`[UserCache] ⚡ HIT - Usuario ${credentialId}`);
      return user;
    }

    // Si no está en caché, consultar al servicio
    console.log(`[UserCache] 🔍 MISS - Consultando User Service para ${credentialId}`);
    user = await lastValueFrom(
      this.userService
        .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
        .pipe(timeout(3000)),
    );

    if (user) {
      // Guardar en caché por 5 minutos
      await this.cacheManager.set(cacheKey, user, 300);
      console.log(`[UserCache] 💾 Cached - Usuario ${credentialId} guardado en caché`);
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
      console.log(`[UserCache] ⚡ HIT - Mascota ${petId}`);
      return pet;
    }

    console.log(`[UserCache] 🔍 MISS - Consultando Pet Service para ${petId}`);
    pet = await lastValueFrom(
      petService.send({ cmd: 'find_pet' }, petId).pipe(timeout(3000)),
    );

    if (pet) {
      // Guardar en caché por 10 minutos
      await this.cacheManager.set(cacheKey, pet, 600);
      console.log(`[UserCache] 💾 Cached - Mascota ${petId} guardada en caché`);
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
    console.log(`[UserCache] 🗑️ INVALIDATED - Usuario ${credentialId}`);
  }

  /**
   * Invalida el caché de una mascota
   * @param petId ID de la mascota
   */
  async invalidatePet(petId: string) {
    const cacheKey = `pet:${petId}`;
    await this.cacheManager.del(cacheKey);
    console.log(`[UserCache] 🗑️ INVALIDATED - Mascota ${petId}`);
  }

  /**
   * Limpia todo el caché (no disponible en todas las versiones de cache-manager)
   * Alternativa: invalidar claves específicas
   */
  async clearAll() {
    // Note: reset() may not be available in all cache-manager versions
    // In production, consider invalidating specific keys or using Redis FLUSHDB
    console.log(`[UserCache] 🧹 CLEAR - Limpieza de caché no implementada (usar invalidación específica)`);
  }
}
