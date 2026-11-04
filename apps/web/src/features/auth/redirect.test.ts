import { describe, expect, it } from 'vitest';
import { safeNext, withNext } from './redirect';

describe('safeNext', () => {
  it('follows same-origin relative paths', () => {
    expect(safeNext('/w/abc/projects?x=1')).toBe('/w/abc/projects?x=1');
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '', null])(
    'falls back to /app for %s',
    (next) => {
      expect(safeNext(next)).toBe('/app');
    },
  );

  it('keeps next when building auth links', () => {
    expect(withNext('/register', '/w/abc')).toBe('/register?next=%2Fw%2Fabc');
    expect(withNext('/register', null)).toBe('/register');
  });
});
