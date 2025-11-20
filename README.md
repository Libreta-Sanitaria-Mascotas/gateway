# Gateway (API BFF)

Puerta de entrada HTTP para la Libreta Sanitaria. Orquesta microservicios vía RabbitMQ y aplica caching, rate limiting y sagas para operaciones distribuidas.

## Funcionalidades clave
- Caché Redis para usuarios/mascotas (`CustomCacheModule`).
- Rate limiting global (Throttler) y por endpoint de media.
- Subidas de archivos en memoria o streaming + validación de tipo/tamaño.
- Vinculación automática de media con registros de salud.
- Sagas: crear mascota con foto y crear health record con certificado (compensación ante fallos).
- E2E “happy path” optimizado en `test/e2e/happy-path-optimized.e2e-spec.ts`.

## Requisitos locales
- Node 22+
- Redis y RabbitMQ (o usar `infra/docker-compose.yml` en el monorepo).
- Variables útiles (por defecto dentro del stack docker):
  - `RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672`
  - `REDIS_HOST=redis`
  - `REDIS_PORT=6379`

## Scripts
```bash
npm install
npm run start:dev        # modo watch
npm run start            # modo dev simple
npm run test             # unit
npm run test:e2e         # e2e (usa env locales)
npm run lint
```

Para el e2e optimizado, si corres fuera de Docker, exporta:
```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export RABBITMQ_URL=amqp://admin:admin123@localhost:5672
npm run test:e2e -- happy-path-optimized.e2e-spec.ts --runInBand
```

## Notas de implementación
- Módulos RabbitMQ usan `getRabbitmqUrl()` para leer `RABBITMQ_URL`.
- `CustomCacheModule` es global y usa `cache-manager-redis-store`.
- Endpoints relevantes:
  - `POST /api/pets/with-photo` (saga mascota + foto)
  - `POST /api/media/upload` y `/upload-stream` (valida mime/size, link a health)
  - Health y Pets consumen caché para validar usuario/mascota.

## Workflows sugeridos
- CI básico:
  - `npm ci`
  - `npm run lint`
  - `npm test`
  - `npm run test:e2e -- happy-path-optimized.e2e-spec.ts --runInBand` (con Redis/RabbitMQ disponibles)
