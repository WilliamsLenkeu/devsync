import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import activities from './activities/routes';
import agents from './agents/routes';
import apiTokens from './api-tokens/routes';
import auth from './auth/routes';
import notifications from './notifications/routes';
import projects from './projects/routes';
import realtime from './realtime/routes';
import tasks from './tasks/routes';
import users from './users/routes';
import workspaces from './workspaces/routes';

/** Every module is a Fastify plugin owning its own routes; mounted under `/api`. */
export const registerModules: FastifyPluginAsyncZod = async (app) => {
  for (const mod of [
    auth,
    users,
    workspaces,
    projects,
    tasks,
    activities,
    notifications,
    apiTokens,
    agents,
    realtime,
  ]) {
    await app.register(mod);
  }
};
