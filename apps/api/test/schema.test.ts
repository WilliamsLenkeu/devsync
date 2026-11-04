import { afterAll, describe, expect, it } from 'vitest';
import { createPrisma } from '../src/db';

const url = process.env['DATABASE_URL'];
const db = url ? createPrisma(url) : undefined;

afterAll(() => db?.$disconnect());

describe.skipIf(!db)('database constraints', () => {
  it('rejects duplicate workspace membership and cascades on workspace delete', async () => {
    const d = db!;
    const user = await d.user.create({
      data: { email: `t-${Date.now()}@x.dev`, name: 'T', passwordHash: 'x' },
    });
    const ws = await d.workspace.create({
      data: {
        name: 'W',
        slug: `w-${Date.now()}`,
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
    await expect(
      d.workspaceMember.create({ data: { workspaceId: ws.id, userId: user.id } }),
    ).rejects.toThrow();
    await d.workspace.delete({ where: { id: ws.id } });
    expect(await d.workspaceMember.count({ where: { workspaceId: ws.id } })).toBe(0);
    await d.user.delete({ where: { id: user.id } });
  });
});
