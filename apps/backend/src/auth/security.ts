import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';

const scrypt = promisify(scryptCallback);
const KEY_BYTES = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, KEY_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION }) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hex] = parts;
  if (!salt || !hex || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(hex)) return false;
  const actual = Buffer.from(hex, 'hex');
  const candidate = await scrypt(password, salt, KEY_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION }) as Buffer;
  return timingSafeEqual(actual, candidate);
}

export function jwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer('landconnect-api')
    .setAudience('landconnect-mobile')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(jwtKey());
}

export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey(), {
      issuer: 'landconnect-api',
      audience: 'landconnect-mobile',
      algorithms: ['HS256'],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
