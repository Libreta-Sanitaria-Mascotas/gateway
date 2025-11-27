import 'dotenv/config';
import { ObjectSchema } from 'joi';

/**
 * Carga y valida variables de entorno con el esquema Joi proporcionado.
 * Útil para evitar duplicar lógica de validación en cada servicio.
 */
export function loadEnv<T>(schema: ObjectSchema): T {
  const { error, value } = schema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value as T;
}
