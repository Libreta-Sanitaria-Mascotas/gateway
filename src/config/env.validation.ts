import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().required(),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('debug'),
  USER_SERVICE: Joi.string().required(),
  USER_SERVICE_PORT: Joi.number().required(),
  AUTH_SERVICE: Joi.string().required(),
  AUTH_SERVICE_PORT: Joi.number().required(),
  HEALTH_SERVICE: Joi.string().required(),
  HEALTH_SERVICE_PORT: Joi.number().required(),
  PET_SERVICE: Joi.string().required(),
  PET_SERVICE_PORT: Joi.number().required(),
  MEDIA_SERVICE_URL: Joi.string().uri().required(),
  ALLOWED_ORIGINS: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
}).unknown(true);
