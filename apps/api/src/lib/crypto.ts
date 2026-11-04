import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 hex. Fine for high-entropy random secrets (refresh/API/invite tokens); never use for passwords. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');
