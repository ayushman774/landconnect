import { Prisma, PropertyStatus, PropertyType, UserRole } from '@prisma/client';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../auth/security.js';

export const propertyRouter = Router();

const createProperty = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(5000),
  type: z.nativeEnum(PropertyType),
  priceRupees: z.number().int().positive().max(100000000000),
  areaSqFt: z.number().positive().max(1000000000),
  address: z.string().trim().min(8).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  imageUrls: z.array(z.string().url().max(2048).refine(url => new URL(url).protocol === 'https:', 'HTTPS images only')).max(10).default([]),
  publish: z.boolean().default(false),
}).strict().refine(value => (value.latitude === undefined) === (value.longitude === undefined), {
  message: 'Latitude and longitude must be provided together',
});

const idParam = z.string().uuid();
const listQuery = z.object({
  type: z.nativeEnum(PropertyType).optional(),
  search: z.string().trim().max(100).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

const ownerSelect = { id: true, name: true, role: true } as const;
const include = { owner: { select: ownerSelect }, images: { orderBy: { position: 'asc' as const } } };

function serialize(property: any) {
  return {
    ...property,
    priceRupees: Number(property.pricePaise) / 100,
    areaSqFt: Number(property.areaSqFt),
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    pricePaise: undefined,
  };
}

const authenticate: RequestHandler = async (request, response, next) => {
  try {
    const match = /^Bearer (\\S+)$/i.exec(request.header('authorization') ?? '');
    const userId = match?.[1] ? await verifyAccessToken(match[1]) : null;
    if (!userId) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue' } });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    response.locals.user = user;
    next();
  } catch (error) { next(error); }
};

propertyRouter.get('/', async (request, response, next) => {
  const parsed = listQuery.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    return;
  }
  const { type, search, cursor, limit } = parsed.data;
  try {
    const rows = await prisma.property.findMany({
      where: {
        status: PropertyStatus.PUBLISHED,
        ...(type ? { type } : {}),
        ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { address: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    response.json({ properties: page.map(serialize), nextCursor: hasMore ? page[page.length - 1]?.id : null });
  } catch (error) { next(error); }
});

propertyRouter.get('/mine', authenticate, async (_request, response, next) => {
  try {
    const rows = await prisma.property.findMany({
      where: { ownerId: response.locals.user.id },
      include,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    response.json({ properties: rows.map(serialize) });
  } catch (error) { next(error); }
});

propertyRouter.get('/:id', async (request, response, next) => {
  const parsed = idParam.safeParse(request.params.id);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    return;
  }
  try {
    const property = await prisma.property.findUnique({ where: { id: parsed.data }, include });
    if (!property || property.status !== PropertyStatus.PUBLISHED) {
      response.status(404).json({ error: { code: 'NOT_FOUND' } });
      return;
    }
    response.json({ property: serialize(property) });
  } catch (error) { next(error); }
});

propertyRouter.post('/', authenticate, async (request, response, next) => {
  const user = response.locals.user as { id: string; role: UserRole };
  if (user.role === UserRole.BUYER) {
    response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only sellers and brokers can list property' } });
    return;
  }
  const parsed = createProperty.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    return;
  }
  const { imageUrls, priceRupees, publish, areaSqFt, ...details } = parsed.data;
  try {
    const property = await prisma.property.create({
      data: {
        ...details,
        ownerId: user.id,
        pricePaise: BigInt(priceRupees) * 100n,
        areaSqFt: new Prisma.Decimal(areaSqFt),
        status: publish ? PropertyStatus.PUBLISHED : PropertyStatus.DRAFT,
        images: { create: imageUrls.map((url, position) => ({ url, position })) },
      },
      include,
    });
    response.status(201).json({ property: serialize(property) });
  } catch (error) { next(error); }
});
