import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { AppError } from '../errors';

/** Allowlist — keep tight; expand deliberately. */
export const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
]);

export function assertAllowedContentType(contentType: string): void {
  const base = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ALLOWED_CONTENT_TYPES.has(base)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Content type not allowed: ${base || 'unknown'}`,
      { allowed: [...ALLOWED_CONTENT_TYPES] },
    );
  }
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 180);
  return base.length > 0 ? base : 'file';
}

export function attachmentPath(rootDir: string, storageKey: string): string {
  // storageKey is always uuid/uuid.ext we mint — refuse path escape
  if (storageKey.includes('..') || path.isAbsolute(storageKey)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid storage key');
  }
  return path.join(rootDir, storageKey);
}

export async function storeAttachmentStream(opts: {
  rootDir: string;
  taskId: string;
  filename: string;
  body: Readable;
  maxBytes: number;
}): Promise<{ storageKey: string; byteSize: number }> {
  const safe = sanitizeFilename(opts.filename);
  const ext = path.extname(safe).slice(0, 16);
  const storageKey = path.join(opts.taskId, `${randomUUID()}${ext}`).replace(/\\/g, '/');
  const abs = attachmentPath(opts.rootDir, storageKey);
  await mkdir(path.dirname(abs), { recursive: true });

  let byteSize = 0;
  const out = createWriteStream(abs);
  opts.body.on('data', (chunk: Buffer | string) => {
    byteSize += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    if (byteSize > opts.maxBytes) {
      opts.body.destroy();
      out.destroy();
    }
  });

  try {
    await pipeline(opts.body, out);
  } catch (err) {
    await unlink(abs).catch(() => undefined);
    throw err;
  }

  if (byteSize > opts.maxBytes) {
    await unlink(abs).catch(() => undefined);
    throw new AppError('VALIDATION_ERROR', `File exceeds ${opts.maxBytes} bytes`);
  }
  if (byteSize === 0) {
    await unlink(abs).catch(() => undefined);
    throw new AppError('VALIDATION_ERROR', 'Empty file');
  }

  return { storageKey, byteSize };
}

export async function removeAttachmentFile(rootDir: string, storageKey: string): Promise<void> {
  await unlink(attachmentPath(rootDir, storageKey)).catch(() => undefined);
}
