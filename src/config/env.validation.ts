import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().required(),
  USER_SERVICE: Joi.string().required(),
  USER_SERVICE_PORT: Joi.number().required(),
  AUTH_SERVICE: Joi.string().required(),
  AUTH_SERVICE_PORT: Joi.number().required(),
  HEALTH_SERVICE: Joi.string().required(),
  HEALTH_SERVICE_PORT: Joi.number().required(),
  PET_SERVICE: Joi.string().required(),
  PET_SERVICE_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
}).unknown(true);
