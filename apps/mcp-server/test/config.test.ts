import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const TOKEN = 'dsk_test_0123456789abcdefghijklmnopqrstuvwxyz';

describe('loadConfig', () => {
  it('requires DEVSYNC_API_TOKEN', () => {
    expect(() => loadConfig({})).toThrow(/DEVSYNC_API_TOKEN is missing/);
  });

  it('rejects a token without the dsk_ prefix, without echoing it', () => {
    const invalid = () => loadConfig({ DEVSYNC_API_TOKEN: 'sk_secret123' });
    expect(invalid).toThrow(/must start with 'dsk_'/);
    expect(invalid).toThrow(/^(?!.*secret123)/);
  });

  it('defaults the API URL and strips trailing slashes', () => {
    expect(loadConfig({ DEVSYNC_API_TOKEN: TOKEN })).toEqual({
      apiUrl: 'http://localhost:3000',
      token: TOKEN,
    });
    expect(loadConfig({ DEVSYNC_API_TOKEN: TOKEN, DEVSYNC_API_URL: 'https://api.x.io//' }).apiUrl).toBe(
      'https://api.x.io',
    );
  });

  it('rejects non-http URLs', () => {
    expect(() => loadConfig({ DEVSYNC_API_TOKEN: TOKEN, DEVSYNC_API_URL: 'ftp://x' })).toThrow(/http or https/);
    expect(() => loadConfig({ DEVSYNC_API_TOKEN: TOKEN, DEVSYNC_API_URL: 'nope' })).toThrow(/not a valid URL/);
  });
});
