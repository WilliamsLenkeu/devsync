/**
 * Development seed: a demo workspace so a fresh clone has something to look at.
 * Data goes through the real services, so activities/notifications are genuine rows.
 * Refuses to run in production. Idempotent: does nothing if the demo workspace exists.
 */
import argon2 from 'argon2';
import { recordActivity } from '../src/activity';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { addComment, createTask, moveTask } from '../src/modules/tasks/service';
import type { Principal } from '../src/types';

const config = loadConfig({ ...process.env, LOG_LEVEL: 'silent' });
if (config.NODE_ENV === 'production') throw new Error('Refusing to seed a production database');

const PASSWORD = process.env['DEMO_PASSWORD'] ?? 'devsync-demo-123';
const SLUG = 'acme-engineering';

const app = await buildApp({ config });
const { db } = app;

if (await db.workspace.findUnique({ where: { slug: SLUG } })) {
  console.log(`Seed skipped: workspace "${SLUG}" already exists.`);
  await app.close();
  process.exit(0);
}

const passwordHash = await argon2.hash(PASSWORD);
const [ada, lin] = await Promise.all(
  [
    { email: 'ada@devsync.dev', name: 'Ada Lovelace' },
    { email: 'lin@devsync.dev', name: 'Linus Torvalds' },
  ].map((u) =>
    db.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash } }),
  ),
);
if (!ada || !lin) throw new Error('user seed failed');

const workspace = await db.workspace.create({
  data: {
    name: 'Acme Engineering',
    slug: SLUG,
    description: 'Demo workspace',
    members: {
      create: [
        { userId: ada.id, role: 'OWNER' },
        { userId: lin.id, role: 'MEMBER' },
      ],
    },
  },
});

const asAda: Principal = { userId: ada.id };
const asLin: Principal = { userId: lin.id };
const ctx = (principal: Principal) => ({ app, principal });

const mkProject = async (name: string, identifier: string, description: string) => {
  const project = await db.project.create({
    data: {
      workspaceId: workspace.id,
      name,
      identifier,
      description,
      createdById: ada.id,
      members: { create: [{ userId: ada.id }, { userId: lin.id }] },
    },
  });
  await recordActivity(db, asAda, {
    workspaceId: workspace.id,
    projectId: project.id,
    type: 'PROJECT_CREATED',
    data: { name, identifier },
  });
  return project;
};

const web = await mkProject('Web App', 'WEB', 'Customer-facing React application');
const platform = await mkProject('Platform API', 'API', 'Public REST API and integrations');

const day = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * day);

const seedTasks = [
  {
    p: web,
    title: 'Redesign onboarding flow',
    priority: 'HIGH',
    to: 'IN_PROGRESS',
    who: lin,
    due: 3,
    labels: ['design'],
  },
  {
    p: web,
    title: 'Fix login redirect loop on Safari',
    priority: 'URGENT',
    to: 'IN_REVIEW',
    who: ada,
    due: -2,
    labels: ['bug'],
  },
  {
    p: web,
    title: 'Add dark mode to settings page',
    priority: 'LOW',
    to: 'TODO',
    who: null,
    due: null,
    labels: ['ui'],
  },
  {
    p: web,
    title: 'Accessibility audit of the Kanban board',
    priority: 'MEDIUM',
    to: 'BACKLOG',
    who: null,
    due: null,
    labels: [],
  },
  {
    p: web,
    title: 'Ship notification bell',
    priority: 'MEDIUM',
    to: 'DONE',
    who: ada,
    due: null,
    labels: ['feature'],
  },
  {
    p: platform,
    title: 'Rate-limit the public endpoints',
    priority: 'HIGH',
    to: 'IN_PROGRESS',
    who: ada,
    due: 5,
    labels: ['security'],
  },
  {
    p: platform,
    title: 'Document webhook payloads',
    priority: 'LOW',
    to: 'TODO',
    who: lin,
    due: 10,
    labels: ['docs'],
  },
  {
    p: platform,
    title: 'Migrate sessions to rotating refresh tokens',
    priority: 'HIGH',
    to: 'DONE',
    who: lin,
    due: null,
    labels: ['security'],
  },
  {
    p: platform,
    title: 'Investigate slow dashboard query',
    priority: 'MEDIUM',
    to: 'BACKLOG',
    who: null,
    due: null,
    labels: ['performance'],
  },
] as const;

const created = [];
for (const t of seedTasks) {
  const task = await createTask(ctx(asAda), t.p.id, {
    title: t.title,
    priority: t.priority,
    status: 'BACKLOG',
    assigneeId: t.who?.id ?? null,
    dueDate: t.due === null ? null : inDays(t.due),
    labels: t.labels.map((name) => ({ name })),
  });
  if (t.to !== 'BACKLOG') await moveTask(ctx(asAda), task.id, { status: t.to });
  created.push(task);
}

const first = created[0];
if (first) {
  await addComment(
    ctx(asAda),
    first.id,
    `@[${lin.name}](user:${lin.id}) can you take the first draft of the wireframes?`,
  );
  await addComment(ctx(asLin), first.id, 'On it — will share a Figma link tomorrow.');
}

await app.close();
console.log(`Seeded workspace "${workspace.name}" with ${created.length} tasks.`);
console.log(`Sign in as ada@devsync.dev or lin@devsync.dev (password: ${PASSWORD}).`);
