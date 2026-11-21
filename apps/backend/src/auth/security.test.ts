import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } from './security.js';

test('password hashing uses a random salt and verifies only correct passwords', async () => {
  const first = await hashPassword('A-strong-passphrase-123');
  const second = await hashPassword('A-strong-passphrase-123');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('A-strong-passphrase-123', first), true);
  assert.equal(await verifyPassword('incorrect-password', first), false);
  assert.equal(await verifyPassword('password', 'invalid-hash'), false);
});

test('JWT is signed, scoped, and rejects tampering', async () => {
  process.env.JWT_SECRET = 'a-test-only-secret-with-at-least-thirty-two-characters';
  const token = await createAccessToken('user-123');
  assert.equal(await verifyAccessToken(token), 'user-123');
  assert.equal(await verifyAccessToken(token + 'tampered'), null);
});
