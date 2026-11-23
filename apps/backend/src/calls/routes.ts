import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../auth/security.js';

export const callsRouter = Router();
const idSchema = z.string().uuid();
const startSchema = z.object({ conversationId: idSchema, type: z.enum(['AUDIO', 'VIDEO']) }).strict();

const authenticate: RequestHandler = async (request, response, next) => {
  try {
    const match = /^Bearer (\S+)$/i.exec(request.header('authorization') ?? '');
    const userId = match?.[1] ? await verifyAccessToken(match[1]) : null;
    if (!userId) { response.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) { response.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    response.locals.userId = user.id;
    next();
  } catch (error) { next(error); }
};
callsRouter.use(authenticate);

function publicCall(call: { id: string; conversationId: string; callerId: string; calleeId: string; type: string; status: string; createdAt: Date; answeredAt: Date | null; endedAt: Date | null }) {
  return { id: call.id, conversationId: call.conversationId, callerId: call.callerId, calleeId: call.calleeId, type: call.type, status: call.status, createdAt: call.createdAt, answeredAt: call.answeredAt, endedAt: call.endedAt };
}

callsRouter.post('/', async (request, response, next) => {
  const parsed = startSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    const userId: string = response.locals.userId;
    const members = await prisma.participant.findMany({ where: { conversationId: parsed.data.conversationId }, select: { userId: true } });
    if (members.length !== 2 || !members.some(member => member.userId === userId)) {
      response.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND' } }); return;
    }
    const calleeId = members.find(member => member.userId !== userId)!.userId;
    const ongoing = await prisma.call.findFirst({ where: { conversationId: parsed.data.conversationId, status: { in: ['RINGING', 'ACCEPTED'] } } });
    if (ongoing) { response.status(409).json({ error: { code: 'CALL_ALREADY_ACTIVE' } }); return; }
    const call = await prisma.call.create({ data: { conversationId: parsed.data.conversationId, callerId: userId, calleeId, type: parsed.data.type, roomName: 'landconnect-' + randomUUID() } });
    response.status(201).json({ call: publicCall(call) });
  } catch (error) { next(error); }
});

callsRouter.get('/incoming', async (_request, response, next) => {
  try {
    const calls = await prisma.call.findMany({ where: { calleeId: response.locals.userId, status: 'RINGING' }, orderBy: { createdAt: 'desc' }, take: 20, include: { caller: { select: { name: true } } } });
    response.json({ calls: calls.map(call => ({ ...publicCall(call), callerName: call.caller.name })) });
  } catch (error) { next(error); }
});

callsRouter.get('/:id', async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    const call = await prisma.call.findUnique({ where: { id: id.data } });
    if (!call || ![call.callerId, call.calleeId].includes(response.locals.userId)) { response.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    response.json({ call: publicCall(call) });
  } catch (error) { next(error); }
});

callsRouter.post('/:id/:action', async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  const action = z.enum(['accept', 'reject', 'end']).safeParse(request.params.action);
  if (!id.success || !action.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    const userId: string = response.locals.userId;
    const where = action.data === 'end'
      ? { id: id.data, status: { in: ['RINGING', 'ACCEPTED'] as ('RINGING' | 'ACCEPTED')[] }, OR: [{ callerId: userId }, { calleeId: userId }] }
      : { id: id.data, calleeId: userId, status: 'RINGING' as const };
    const data = action.data === 'accept' ? { status: 'ACCEPTED' as const, answeredAt: new Date() }
      : { status: action.data === 'reject' ? 'REJECTED' as const : 'ENDED' as const, endedAt: new Date() };
    const updated = await prisma.call.updateMany({ where, data });
    if (!updated.count) { response.status(409).json({ error: { code: 'CALL_NOT_ACTIVE_OR_NOT_ALLOWED' } }); return; }
    const call = await prisma.call.findUniqueOrThrow({ where: { id: id.data } });
    response.json({ call: publicCall(call) });
  } catch (error) { next(error); }
});

callsRouter.post('/:id/token', async (request, response, next) => {
  const id = idSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
  try {
    const userId: string = response.locals.userId;
    const call = await prisma.call.findUnique({ where: { id: id.data } });
    if (!call || ![call.callerId, call.calleeId].includes(userId)) { response.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    if (call.status !== 'ACCEPTED') { response.status(409).json({ error: { code: 'CALL_NOT_ACCEPTED' } }); return; }
    const { LIVEKIT_URL: url, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret } = process.env;
    if (!url || !key || !secret) { response.status(503).json({ error: { code: 'CALLING_NOT_CONFIGURED' } }); return; }
    const token = new AccessToken(key, secret, { identity: userId, ttl: '15m' });
    token.addGrant({ roomJoin: true, room: call.roomName, canPublish: true, canSubscribe: true, roomCreate: false });
    response.json({ url, token: await token.toJwt(), call: publicCall(call) });
  } catch (error) { next(error); }
});
