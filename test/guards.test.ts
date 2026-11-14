import { describe, expect, it } from 'vitest';
import { isPathResponse, isRequest } from '../src/shared/guards';

describe('isRequest', () => {
  it('accepts known requests', () => {
    expect(isRequest({ type: 'dfp:getPath' })).toBe(true);
    expect(isRequest({ type: 'dfp:navigate', id: 'abc' })).toBe(true);
  });

  it.each([null, 'dfp:getPath', {}, { type: 'other' }, { type: 'dfp:navigate' }, { type: 'dfp:navigate', id: '' }])(
    'rejects %j',
    (value) => {
      expect(isRequest(value)).toBe(false);
    },
  );
});

describe('isPathResponse', () => {
  it('accepts a successful response', () => {
    expect(isPathResponse({ ok: true, path: [{ id: 'a', name: 'A' }, { id: null, name: 'B' }] })).toBe(true);
  });

  it('accepts a failure response', () => {
    expect(isPathResponse({ ok: false, reason: 'not-folder-view' })).toBe(true);
    expect(isPathResponse({ ok: false, reason: 'read-failed' })).toBe(true);
  });

  it.each([
    undefined,
    { ok: true },
    { ok: true, path: [{ id: 1, name: 'A' }] },
    { ok: true, path: [{ id: 'a' }] },
    { ok: false, reason: 'unknown' },
  ])('rejects %j', (value) => {
    expect(isPathResponse(value)).toBe(false);
  });
});
