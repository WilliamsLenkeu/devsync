import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { createPrisma, type Db } from './db';
import { AppError, errorBody } from './errors';
import { EventBus } from './events';
import { registerModules } from './modules';
import { authPlugin } from './plugins/auth';

export interface BuildOptions {
  config: Config;
  /** Inject a client (tests); otherwise one is created from `config.DATABASE_URL` and closed with the app. */
  db?: Db;
}

export async function buildApp({ config, db }: BuildOptions) {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ['req.headers.cookie', 'req.headers.authorization'],
            ...(config.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
          },
    trustProxy: config.NODE_ENV === 'production',
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const ownsDb = !db;
  app.decorate('config', config);
  app.decorate('db', db ?? createPrisma(config.DATABASE_URL));
  app.decorate('events', new EventBus());
  if (ownsDb) app.addHook('onClose', async () => app.db.$disconnect());

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  if (config.RATE_LIMIT_ENABLED)
    await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  // CSRF defence in depth on top of SameSite=Lax: browsers always send Origin on unsafe cross-site requests.
  app.addHook('onRequest', async (req) => {
    const origin = req.headers.origin;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      origin &&
      origin !== config.WEB_ORIGIN
    ) {
      throw new AppError('FORBIDDEN', 'Cross-origin request rejected');
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DevSync API',
        version: '0.1.0',
        description:
          'REST API for DevSync. Web clients authenticate with HTTP-only cookies; agents use `Authorization: Bearer dsk_…` on `/api/agent/*`. ' +
          'Success responses are `{ data }`; errors are `{ error: { code, message, details? } }`. Rate limits: 300 req/min/IP globally, stricter on auth routes.',
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'ds_access' },
          bearerAuth: { type: 'http', scheme: 'bearer', description: 'API token (dsk_…)' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await authPlugin(app); // called directly (not registered) so its decorators live on the root instance

  app.get('/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));
  app.get('/health/ready', { schema: { hide: true } }, async (_req, reply) => {
    try {
      await app.db.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  // Handlers must be set BEFORE registering modules: an awaited register snapshots them into the child scope.
  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send(errorBody('NOT_FOUND', 'Route not found')),
  );

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send(errorBody(err.code, err.message, err.details));
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send(errorBody('VALIDATION_ERROR', 'Invalid request', err.validation));
    }
    if (err.statusCode === 429) {
      return reply.code(429).send(errorBody('RATE_LIMITED', 'Too many requests, slow down'));
    }
    if (err.code === 'P2002')
      return reply.code(409).send(errorBody('CONFLICT', 'Resource already exists'));
    if (err.code === 'P2025')
      return reply.code(404).send(errorBody('NOT_FOUND', 'Resource not found'));
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return reply.code(400).send(errorBody('VALIDATION_ERROR', err.message));
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send(errorBody('INTERNAL', 'Internal server error'));
  });

  await app.register(registerModules, { prefix: '/api' });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
export type { Db };
