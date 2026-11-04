export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.statusCode = STATUS[code];
  }
}

export const unauthenticated = (m = 'Authentication required') =>
  new AppError('UNAUTHENTICATED', m);
export const forbidden = (m = 'You do not have permission to do this') =>
  new AppError('FORBIDDEN', m);
export const notFound = (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found`);
export const conflict = (m: string) => new AppError('CONFLICT', m);
export const badRequest = (m: string, details?: unknown) =>
  new AppError('VALIDATION_ERROR', m, details);

/** Wire format of every error response: `{ error: { code, message, details? } }`. */
export const errorBody = (code: ErrorCode, message: string, details?: unknown) => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
});
