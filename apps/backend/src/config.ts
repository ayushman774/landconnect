import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
});

export const config = schema.parse(process.env);
export const allowedOrigins = config.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
