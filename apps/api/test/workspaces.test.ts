import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import type { DomainEvent } from '../src/events';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';
const body = <T>(res: { json(): unknown }) => (res.json() as { data: T }).data;

const createWorkspace = async (owner: TestUser, name = `Team ${randomUUID().slice(0, 8)}`) => {
  const res = await api(app, owner, 'POST', '/api/workspaces', { name });
  expect(res.statusCode).toBe(201);
  return body<{ id: string; slug: string; role: string; memberCount: number }>(res);
};

const invite = (inviter: TestUser, wsId: string, email: string, role: Role) =>
  api(app, inviter, 'POST', `/api/workspaces/${wsId}/invitations`, { email, role });

/** New user who joins the workspace with `role` (invite + accept). */
const addMember = async (inviter: TestUser, wsId: string, role: Role) => {
  const user = await registerUser(app);
  const res = await invite(inviter, wsId, user.email, role);
  expect(res.statusCode).toBe(201);
  const { invitation } = body<{ invitation: { id: string } }>(res);
  expect(
    (await api(app, user, 'POST', `/api/invitations/${invitation.id}/accept`)).statusCode,
  ).toBe(200);
  return user;
};

const roleOf = async (wsId: string, userId: string) =>
  (
    await app.db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: wsId, userId } },
    })
  ).role;

const captureEvents = () => {
  const seen: DomainEvent[] = [];
  const off = app.events.subscribe((e) => seen.push(e));
  return { seen, off };
};

describe('workspaces', () => {
  it('auto-generates a slug (suffixed on conflict) and makes the creator OWNER', async () => {
    const owner = await registerUser(app);
    const tag = randomUUID().slice(0, 8);
    const ws = await createWorkspace(owner, `Équipe ${tag}`);
    expect(ws).toMatchObject({ slug: `equipe-${tag}`, role: 'OWNER', memberCount: 1 });

    const dup = await createWorkspace(owner, `Équipe ${tag}`);
    expect(dup.slug).toMatch(new RegExp(`^equipe-${tag}-[0-9a-f]{6}$`));
  });

  it('rejects a taken explicit slug (409) and an invalid one (400)', async () => {
    const owner = await registerUser(app);
    const slug = `slug-${randomUUID().slice(0, 8)}`;
    expect((await api(app, owner, 'POST', '/api/workspaces', { name: 'A', slug })).statusCode).toBe(
      201,
    );
    expect((await api(app, owner, 'POST', '/api/workspaces', { name: 'B', slug })).statusCode).toBe(
      409,
    );
    expect(
      (await api(app, owner, 'POST', '/api/workspaces', { name: 'C', slug: 'Bad Slug' }))
        .statusCode,
    ).toBe(400);
  });

  it('lists only my workspaces and answers 404 to non-members', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const stranger = await registerUser(app);

    const mine = body<{ id: string }[]>(await api(app, owner, 'GET', '/api/workspaces'));
    expect(mine.map((w) => w.id)).toContain(ws.id);
    expect(body<unknown[]>(await api(app, stranger, 'GET', '/api/workspaces'))).toEqual([]);

    const url = `/api/workspaces/${ws.id}`;
    expect((await api(app, stranger, 'GET', url)).statusCode).toBe(404);
    expect((await api(app, stranger, 'PATCH', url, { name: 'x' })).statusCode).toBe(404);
    expect((await api(app, stranger, 'GET', `${url}/members`)).statusCode).toBe(404);
  });

  it('enforces the role matrix on update and delete', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const admin = await addMember(owner, ws.id, 'ADMIN');
    const member = await addMember(owner, ws.id, 'MEMBER');
    const viewer = await addMember(owner, ws.id, 'VIEWER');
    const url = `/api/workspaces/${ws.id}`;

    for (const u of [viewer, member]) {
      expect((await api(app, u, 'GET', url)).statusCode).toBe(200);
      expect((await api(app, u, 'PATCH', url, { name: 'x' })).statusCode).toBe(403);
      expect((await api(app, u, 'DELETE', url)).statusCode).toBe(403);
    }
    const renamed = await api(app, admin, 'PATCH', url, { name: 'Renamed', description: 'd' });
    expect(renamed.statusCode).toBe(200);
    expect(body<{ name: string; role: string }>(renamed)).toMatchObject({
      name: 'Renamed',
      role: 'ADMIN',
    });
    expect((await api(app, admin, 'DELETE', url)).statusCode).toBe(403);

    expect((await api(app, owner, 'DELETE', url)).statusCode).toBe(204);
    expect((await api(app, owner, 'GET', url)).statusCode).toBe(404);
  });

  it('protects the last OWNER and keeps ADMIN away from OWNER', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const admin = await addMember(owner, ws.id, 'ADMIN');
    const member = await addMember(owner, ws.id, 'MEMBER');
    const members = `/api/workspaces/${ws.id}/members`;

    expect(
      (await api(app, admin, 'PATCH', `${members}/${owner.id}`, { role: 'ADMIN' })).statusCode,
    ).toBe(403);
    expect(
      (await api(app, admin, 'PATCH', `${members}/${member.id}`, { role: 'OWNER' })).statusCode,
    ).toBe(403);
    expect((await api(app, admin, 'DELETE', `${members}/${owner.id}`)).statusCode).toBe(403);

    expect(
      (await api(app, owner, 'PATCH', `${members}/${owner.id}`, { role: 'ADMIN' })).statusCode,
    ).toBe(409);
    expect((await api(app, owner, 'DELETE', `${members}/${owner.id}`)).statusCode).toBe(409);

    expect(
      (await api(app, owner, 'PATCH', `${members}/${member.id}`, { role: 'OWNER' })).statusCode,
    ).toBe(200);
    expect((await api(app, owner, 'DELETE', `${members}/${owner.id}`)).statusCode).toBe(204);
    expect(await roleOf(ws.id, member.id)).toBe('OWNER');
  });

  it('logs MEMBER_ROLE_CHANGED and emits member.role_changed only on real changes', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const member = await addMember(owner, ws.id, 'MEMBER');
    const events = captureEvents();
    const url = `/api/workspaces/${ws.id}/members/${member.id}`;

    expect((await api(app, owner, 'PATCH', url, { role: 'MEMBER' })).statusCode).toBe(200);
    expect((await api(app, owner, 'PATCH', url, { role: 'ADMIN' })).statusCode).toBe(200);
    events.off();

    const changes = events.seen.filter((e) => e.type === 'member.role_changed');
    expect(changes).toHaveLength(1);
    expect(changes[0]?.data).toEqual({ userId: member.id, role: 'ADMIN' });
    const act = await app.db.activity.findFirst({
      where: { workspaceId: ws.id, type: 'MEMBER_ROLE_CHANGED' },
    });
    expect(act?.data).toMatchObject({ from: 'MEMBER', to: 'ADMIN', user: { id: member.id } });
    expect(act?.actorId).toBe(owner.id);
  });

  it('lets a member leave, but blocks VIEWER and MEMBER from removing others', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const member1 = await addMember(owner, ws.id, 'MEMBER');
    const member2 = await addMember(owner, ws.id, 'MEMBER');
    const viewer = await addMember(owner, ws.id, 'VIEWER');
    const members = `/api/workspaces/${ws.id}/members`;

    expect((await api(app, viewer, 'DELETE', `${members}/${member1.id}`)).statusCode).toBe(403);
    expect((await api(app, member1, 'DELETE', `${members}/${member2.id}`)).statusCode).toBe(403);
    expect((await api(app, member1, 'DELETE', `${members}/${member1.id}`)).statusCode).toBe(204);
    expect((await api(app, member1, 'GET', `/api/workspaces/${ws.id}`)).statusCode).toBe(404);
  });

  it('removing a member drops project access, unassigns tasks and logs MEMBER_REMOVED', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const member = await addMember(owner, ws.id, 'MEMBER');
    const project = body<{ id: string }>(
      await api(app, owner, 'POST', `/api/workspaces/${ws.id}/projects`, {
        name: 'Web',
        identifier: 'WEB',
      }),
    );
    expect(
      (await api(app, owner, 'POST', `/api/projects/${project.id}/members`, { userId: member.id }))
        .statusCode,
    ).toBe(201);
    const task = await app.db.task.create({
      data: {
        projectId: project.id,
        number: 1,
        title: 'T',
        reporterId: owner.id,
        assigneeId: member.id,
      },
    });

    const events = captureEvents();
    expect(
      (await api(app, owner, 'DELETE', `/api/workspaces/${ws.id}/members/${member.id}`)).statusCode,
    ).toBe(204);
    events.off();

    expect(
      await app.db.projectMember.count({ where: { projectId: project.id, userId: member.id } }),
    ).toBe(0);
    expect((await app.db.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBeNull();
    const act = await app.db.activity.findFirst({
      where: { workspaceId: ws.id, type: 'MEMBER_REMOVED' },
    });
    expect(act?.actorId).toBe(owner.id);
    expect(act?.data).toMatchObject({ user: { id: member.id } });
    expect(events.seen).toContainEqual(
      expect.objectContaining({
        type: 'member.removed',
        workspaceId: ws.id,
        data: { userId: member.id },
      }),
    );
  });
});

describe('invitations', () => {
  it('returns the token once, stores only its hash, notifies existing users', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const invitee = await registerUser(app);

    const res = await invite(owner, ws.id, invitee.email, 'VIEWER');
    expect(res.statusCode).toBe(201);
    const { invitation, token, emailDelivery } = body<{
      invitation: { id: string };
      token: string;
      emailDelivery: string;
    }>(res);
    expect(invitation).toMatchObject({ status: 'PENDING', role: 'VIEWER', email: invitee.email });
    expect(emailDelivery).toBe('skipped'); // NODE_ENV=test → no Resend network

    const row = await app.db.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toBe(token);

    const list = await api(app, owner, 'GET', `/api/workspaces/${ws.id}/invitations`);
    expect(body<{ id: string }[]>(list).map((i) => i.id)).toContain(invitation.id);
    expect(list.body).not.toContain(token);

    const notif = await app.db.notification.findFirst({
      where: { userId: invitee.id, type: 'WORKSPACE_INVITATION' },
    });
    expect(notif?.data).toMatchObject({ invitationId: invitation.id, role: 'VIEWER' });
  });

  it('rejects duplicate pending invitations, existing members and the OWNER role', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const invitee = await registerUser(app);
    expect((await invite(owner, ws.id, invitee.email, 'VIEWER')).statusCode).toBe(201);
    expect((await invite(owner, ws.id, invitee.email, 'MEMBER')).statusCode).toBe(409);
    expect((await invite(owner, ws.id, owner.email, 'MEMBER')).statusCode).toBe(409);
    expect(
      (
        await api(app, owner, 'POST', `/api/workspaces/${ws.id}/invitations`, {
          email: 'x@test.dev',
          role: 'OWNER',
        })
      ).statusCode,
    ).toBe(400);
  });

  it('accepts by id: member joins with the invited role, logs MEMBER_JOINED, emits member.joined', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const invitee = await registerUser(app);
    const { invitation } = body<{ invitation: { id: string } }>(
      await invite(owner, ws.id, invitee.email, 'MEMBER'),
    );
    const events = captureEvents();

    const res = await api(app, invitee, 'POST', `/api/invitations/${invitation.id}/accept`);
    events.off();
    expect(res.statusCode).toBe(200);
    expect(body<{ id: string; role: string }>(res)).toMatchObject({ id: ws.id, role: 'MEMBER' });
    expect(await roleOf(ws.id, invitee.id)).toBe('MEMBER');

    const act = await app.db.activity.findFirst({
      where: { workspaceId: ws.id, type: 'MEMBER_JOINED' },
    });
    expect(act?.actorId).toBe(invitee.id);
    expect(events.seen.map((e) => e.type)).toContain('member.joined');

    expect(
      (await api(app, invitee, 'POST', `/api/invitations/${invitation.id}/accept`)).statusCode,
    ).toBe(409);
  });

  it('accepts by token, and refuses token reuse and unknown tokens', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const invitee = await registerUser(app);
    const { token } = body<{ token: string }>(await invite(owner, ws.id, invitee.email, 'ADMIN'));

    const res = await api(app, invitee, 'POST', '/api/invitations/accept', { token });
    expect(res.statusCode).toBe(200);
    expect(body<{ id: string }>(res).id).toBe(ws.id);
    expect(await roleOf(ws.id, invitee.id)).toBe('ADMIN');

    expect((await api(app, invitee, 'POST', '/api/invitations/accept', { token })).statusCode).toBe(
      409,
    );
    expect(
      (await api(app, invitee, 'POST', '/api/invitations/accept', { token: 'nope-nope' }))
        .statusCode,
    ).toBe(404);
  });

  it('only the invitee can accept or decline; the invitee sees their pending invitations', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const invitee = await registerUser(app);
    const stranger = await registerUser(app);
    const { invitation } = body<{ invitation: { id: string } }>(
      await invite(owner, ws.id, invitee.email, 'VIEWER'),
    );

    expect(
      (await api(app, stranger, 'POST', `/api/invitations/${invitation.id}/accept`)).statusCode,
    ).toBe(403);
    expect(
      (await api(app, stranger, 'POST', `/api/invitations/${invitation.id}/decline`)).statusCode,
    ).toBe(403);

    const mine = body<{ id: string }[]>(await api(app, invitee, 'GET', '/api/invitations'));
    expect(mine.map((i) => i.id)).toContain(invitation.id);
    expect(body<unknown[]>(await api(app, stranger, 'GET', '/api/invitations'))).toEqual([]);
  });

  it('decline is final; revoke stops acceptance; expired invitations cannot be accepted', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const declining = await registerUser(app);
    const revoked = await registerUser(app);
    const expired = await registerUser(app);

    const declineInv = body<{ invitation: { id: string } }>(
      await invite(owner, ws.id, declining.email, 'VIEWER'),
    ).invitation;
    const declined = await api(app, declining, 'POST', `/api/invitations/${declineInv.id}/decline`);
    expect(body<{ status: string }>(declined).status).toBe('DECLINED');
    expect(
      (await api(app, declining, 'POST', `/api/invitations/${declineInv.id}/accept`)).statusCode,
    ).toBe(409);

    const revokeInv = body<{ invitation: { id: string } }>(
      await invite(owner, ws.id, revoked.email, 'VIEWER'),
    ).invitation;
    const revokeUrl = `/api/workspaces/${ws.id}/invitations/${revokeInv.id}`;
    expect((await api(app, owner, 'DELETE', revokeUrl)).statusCode).toBe(204);
    expect((await api(app, owner, 'DELETE', revokeUrl)).statusCode).toBe(409);
    expect(
      (await api(app, revoked, 'POST', `/api/invitations/${revokeInv.id}/accept`)).statusCode,
    ).toBe(409);

    const expiredInv = body<{ invitation: { id: string } }>(
      await invite(owner, ws.id, expired.email, 'VIEWER'),
    ).invitation;
    await app.db.invitation.update({
      where: { id: expiredInv.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const pending = body<{ id: string }[]>(await api(app, expired, 'GET', '/api/invitations'));
    expect(pending.map((i) => i.id)).not.toContain(expiredInv.id);
    expect(
      (await api(app, expired, 'POST', `/api/invitations/${expiredInv.id}/accept`)).statusCode,
    ).toBe(409);
    expect(await roleOf(ws.id, expired.id).catch(() => null)).toBeNull();
  });

  it('forbids MEMBER from inviting', async () => {
    const owner = await registerUser(app);
    const ws = await createWorkspace(owner);
    const member = await addMember(owner, ws.id, 'MEMBER');
    expect((await invite(member, ws.id, 'someone@test.dev', 'VIEWER')).statusCode).toBe(403);
  });
});
