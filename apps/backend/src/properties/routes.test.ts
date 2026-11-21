import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { app } from '../app.js';
import { prisma } from '../db.js';
import { createAccessToken, hashPassword } from '../auth/security.js';

const integration = process.env.RUN_DB_TESTS === '1';
let server: Server;
let baseUrl = '';
const users: string[] = [];
const properties: string[] = [];

before(async () => {
  if (!integration) return;
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!integration) return;
  await prisma.property.deleteMany({ where: { id: { in: properties } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function createUser(role: 'BUYER' | 'SELLER' | 'BROKER') {
  const user = await prisma.user.create({
    data: { name: 'Integration Test', email: `test-${randomUUID()}@example.com`, passwordHash: await hashPassword('integration-test-password'), role },
  });
  users.push(user.id);
  return createAccessToken(user.id);
}

async function request(path: string, method = 'GET', token?: string, body?: unknown) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() as any };
}

const listing = {
  title: 'Agricultural land near Bengaluru',
  description: 'Well connected parcel with road access and clear boundaries.',
  type: 'AGRICULTURAL',
  priceRupees: 2500000,
  areaSqFt: 12000,
  address: 'Near Bengaluru, Karnataka, India',
  imageUrls: ['https://example.com/land.jpg'],
  publish: true,
};

test('property API enforces roles, validates input, and publishes discoverable listings', { skip: !integration }, async () => {
  const buyer = await createUser('BUYER');
  const seller = await createUser('SELLER');

  assert.equal((await request('/api/properties', 'POST', undefined, listing)).status, 401);
  assert.equal((await request('/api/properties', 'POST', buyer, listing)).status, 403);
  assert.equal((await request('/api/properties', 'POST', seller, { ...listing, priceRupees: -1 })).status, 400);

  const created = await request('/api/properties', 'POST', seller, listing);
  assert.equal(created.status, 201);
  properties.push(created.data.property.id);
  assert.equal(created.data.property.priceRupees, listing.priceRupees);
  assert.equal(created.data.property.images.length, 1);

  const discovered = await request('/api/properties?type=AGRICULTURAL&search=Bengaluru');
  assert.equal(discovered.status, 200);
  assert.ok(discovered.data.properties.some((item: { id: string }) => item.id === created.data.property.id));

  const details = await request(`/api/properties/${created.data.property.id}`);
  assert.equal(details.status, 200);

  const mine = await request('/api/properties/mine', 'GET', seller);
  assert.equal(mine.status, 200);
  assert.ok(mine.data.properties.some((item: { id: string }) => item.id === created.data.property.id));

  const draft = await request('/api/properties', 'POST', seller, { ...listing, publish: false });
  assert.equal(draft.status, 201);
  properties.push(draft.data.property.id);
  assert.equal((await request(`/api/properties/${draft.data.property.id}`)).status, 404);
});
