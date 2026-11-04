import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const app = await buildApp({ config });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// wslc-compose has no healthchecks, so the DB may still be booting: retry before giving up.
for (let attempt = 1; ; attempt++) {
  try {
    await app.db.$queryRaw`SELECT 1`;
    break;
  } catch (err) {
    if (attempt >= 20) throw err;
    app.log.warn(`database not ready (attempt ${attempt}/20), retrying in 2s`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await app.listen({ host: config.API_HOST, port: config.API_PORT });
