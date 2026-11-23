import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import { app } from '../app.js';
import { prisma } from '../db.js';
import { createAccessToken, hashPassword } from '../auth/security.js';

const enabled = process.env.RUN_DB_TESTS === '1';
let server: Server;
let baseUrl = '';
const userIds: string[] = [];
const conversationIds: string[] = [];

before(async () => {
  if (!enabled) return;
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP server');
  baseUrl = 'http://127.0.0.1:' + address.port;
});

after(async () => {
  if (!enabled) return;
  await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function account() {
  const user = await prisma.user.create({ data: {
    name: 'Messaging Test', email: 'message-' + randomUUID() + '@example.com',
    passwordHash: await hashPassword('test-only-password'), role: 'BUYER',
  } });
  userIds.push(user.id);
  return { id: user.id, token: await createAccessToken(user.id) };
}

async function call(path: string, method = 'GET', token?: string, body?: unknown) {
  const response = await fetch(baseUrl + path, { method, headers: {
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() as any };
}

test('conversation participants can send messages; outsiders cannot read them', { skip: !enabled }, async () => {
  const alice = await account(), bob = await account(), stranger = await account();
  assert.equal((await call('/api/conversations')).status, 401);
  assert.equal((await call('/api/conversations', 'POST', alice.token, { recipientId: alice.id })).status, 400);
  const started = await call('/api/conversations', 'POST', alice.token, { recipientId: bob.id });
  assert.equal(started.status, 201);
  const id: string = started.data.conversation.id;
  conversationIds.push(id);
  const duplicate = await call('/api/conversations', 'POST', alice.token, { recipientId: bob.id });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.data.conversation.id, id);
  assert.equal((await call('/api/conversations/' + id + '/messages', 'GET', stranger.token)).status, 404);
  assert.equal((await call('/api/conversations/' + id + '/messages', 'POST', stranger.token, { body: 'private' })).status, 404);
  assert.equal((await call('/api/conversations/' + id + '/messages', 'POST', alice.token, { body: ' ' })).status, 400);
  const sent = await call('/api/conversations/' + id + '/messages', 'POST', alice.token, { body: 'Hello Bob' });
  assert.equal(sent.status, 201);
  const received = await call('/api/conversations/' + id + '/messages', 'GET', bob.token);
  assert.equal(received.status, 200);
  assert.equal(received.data.messages[0].body, 'Hello Bob');
  const unread = await call('/api/conversations', 'GET', bob.token);
  assert.equal(unread.status, 200);
  assert.equal(unread.data.unreadCount, 1);
  assert.equal(unread.data.conversations[0].unreadCount, 1);
  const read = await call('/api/conversations/' + id + '/read', 'POST', bob.token);
  assert.equal(read.status, 200);
  assert.equal((await call('/api/conversations', 'GET', bob.token)).data.unreadCount, 0);
  assert.equal((await call('/api/conversations/' + id + '/read', 'POST', stranger.token)).status, 404);
  const inbox = await call('/api/conversations', 'GET', bob.token);
  assert.equal(inbox.status, 200);
  assert.ok(inbox.data.conversations.some((item: { id: string }) => item.id === id));
});
