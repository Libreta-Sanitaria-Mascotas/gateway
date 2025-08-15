import 'dotenv/config';
import { envValidationSchema } from './env.validation';

interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  USER_SERVICE: string;
  USER_SERVICE_PORT: number;
  AUTH_SERVICE: string;
  AUTH_SERVICE_PORT: number;
  HEALTH_SERVICE: string;
  HEALTH_SERVICE_PORT: number;
  PET_SERVICE: string;
  PET_SERVICE_PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

const {error, value } = envValidationSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  nodeEnv: envVars.NODE_ENV,
  port: envVars.PORT,
  healthService: envVars.HEALTH_SERVICE,
  healthServicePort: envVars.HEALTH_SERVICE_PORT,
  petService: envVars.PET_SERVICE,
  petServicePort: envVars.PET_SERVICE_PORT,
  userService: envVars.USER_SERVICE,
  userServicePort: envVars.USER_SERVICE_PORT,
  authService: envVars.AUTH_SERVICE,
  authServicePort: envVars.AUTH_SERVICE_PORT,
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
};
