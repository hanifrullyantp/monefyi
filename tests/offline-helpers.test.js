/**
 * Offline DB helper tests (pure functions only — no Dexie in Deno).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

function generateLocalId() {
  return `local_${crypto.randomUUID()}`;
}

function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local_');
}

Deno.test('generateLocalId - Format - Starts with local_ prefix', () => {
  const id = generateLocalId();
  assertEquals(id.startsWith('local_'), true);
  assertEquals(id.length > 10, true);
});

Deno.test('isLocalId - Local prefix - Returns true', () => {
  assertEquals(isLocalId('local_abc-123'), true);
});

Deno.test('isLocalId - Server UUID - Returns false', () => {
  assertEquals(isLocalId('tx_abc-123'), false);
  assertEquals(isLocalId('550e8400-e29b-41d4-a716-446655440000'), false);
});

Deno.test('isLocalId - Non-string - Returns false', () => {
  assertEquals(isLocalId(null), false);
  assertEquals(isLocalId(undefined), false);
});
