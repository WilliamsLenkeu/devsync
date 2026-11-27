import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { assertAllowedContentType, sanitizeFilename } from './attachments';

describe('attachments helpers', () => {
  it('sanitizes filenames', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('my report (1).pdf')).toBe('my report (1).pdf');
  });

  it('rejects disallowed content types', () => {
    expect(() => assertAllowedContentType('application/x-msdownload')).toThrow(AppError);
    expect(() => assertAllowedContentType('image/png')).not.toThrow();
  });
});
