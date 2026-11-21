import { Prisma, UserRole } from '@prisma/client';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } from './security.js';

export const authRouter = Router();

const registration = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: z.nativeEnum(UserRole),
}).strict();

const login = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1),
}).strict();

function publicUser(user: { id: string; name: string; email: string; role: UserRole; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

authRouter.post('/register', async (request, response, next) => {
  const parsed = registration.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    return;
  }
  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash },
    });
    response.status(201).json({ user: publicUser(user), accessToken: await createAccessToken(user.id) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response.status(409).json({ error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists' } });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  const parsed = login.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    response.json({ user: publicUser(user), accessToken: await createAccessToken(user.id) });
  } catch (error) {
    next(error);
  }
});

const requireUser: RequestHandler = async (request, response, next) => {
  const header = request.header('authorization');
  const match = /^Bearer (\S+)$/i.exec(header ?? '');
  if (!match?.[1]) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    return;
  }
  try {
    const userId = await verifyAccessToken(match[1]);
    if (!userId) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

authRouter.get('/me', requireUser);
