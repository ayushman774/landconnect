import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../auth/security.js';

export const messagingRouter = Router();
const uuid = z.string().uuid();
const messageBody = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
const startBody = z.object({ recipientId: uuid }).strict();

const authenticate: RequestHandler = async (request, response, next) => {
  try {
    const match = /^Bearer (\S+)$/i.exec(request.header('authorization') ?? '');
    const id = match?.[1] ? await verifyAccessToken(match[1]) : null;
    if (!id) { response.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!user) { response.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    response.locals.user = user;
    next();
  } catch (error) { next(error); }
};

messagingRouter.use(authenticate);

const conversationInclude = {
  participants: { include: { user: { select: { id: true, name: true, role: true } } } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

messagingRouter.get('/', async (_request, response, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: response.locals.user.id } } },
      include: conversationInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const enriched = await Promise.all(conversations.map(async conversation => {
      const participant = conversation.participants.find(p => p.userId === response.locals.user.id);
      const unreadCount = await prisma.message.count({
        where: { conversationId: conversation.id, senderId: { not: response.locals.user.id },
          createdAt: { gt: participant?.lastReadAt ?? new Date(0) } },
      });
      return { ...conversation, unreadCount };
    }));
    response.json({ conversations: enriched, unreadCount: enriched.reduce((sum, item) => sum + item.unreadCount, 0) });
  } catch (error) { next(error); }
});

messagingRouter.post('/', async (request, response, next) => {
  const parsed = startBody.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  const me: string = response.locals.user.id;
  const recipientId = parsed.data.recipientId;
  if (recipientId === me) { response.status(400).json({ error: { code: 'INVALID_RECIPIENT' } }); return; }
  try {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) { response.status(404).json({ error: { code: 'RECIPIENT_NOT_FOUND' } }); return; }
    const existing = await prisma.conversation.findFirst({
      where: { AND: [
        { participants: { some: { userId: me } } },
        { participants: { some: { userId: recipientId } } },
        { participants: { every: { userId: { in: [me, recipientId] } } } },
      ] },
      include: conversationInclude,
    });
    if (existing) { response.json({ conversation: existing }); return; }
    const conversation = await prisma.conversation.create({
      data: { participants: { create: [{ userId: me }, { userId: recipientId }] } },
      include: conversationInclude,
    });
    response.status(201).json({ conversation });
  } catch (error) { next(error); }
});

async function isMember(conversationId: string, userId: string) {
  return prisma.participant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
}

messagingRouter.get('/:id/messages', async (request, response, next) => {
  const id = uuid.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    if (!await isMember(id.data, response.locals.user.id)) {
      response.status(404).json({ error: { code: 'NOT_FOUND' } }); return;
    }
    const messages = await prisma.message.findMany({
      where: { conversationId: id.data },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    response.json({ messages: messages.reverse() });
  } catch (error) { next(error); }
});

messagingRouter.post('/:id/messages', async (request, response, next) => {
  const id = uuid.safeParse(request.params.id);
  const body = messageBody.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    if (!await isMember(id.data, response.locals.user.id)) {
      response.status(404).json({ error: { code: 'NOT_FOUND' } }); return;
    }
    const message = await prisma.message.create({
      data: { conversationId: id.data, senderId: response.locals.user.id, body: body.data.body },
    });
    response.status(201).json({ message });
  } catch (error) { next(error); }
});

messagingRouter.post('/:id/read', async (request, response, next) => {
  const id = uuid.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    const result = await prisma.participant.updateMany({
      where: { conversationId: id.data, userId: response.locals.user.id },
      data: { lastReadAt: new Date() },
    });
    if (!result.count) { response.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    response.json({ unreadCount: 0 });
  } catch (error) { next(error); }
});
