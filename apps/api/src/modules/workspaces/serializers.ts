import { z } from 'zod';
import { workspaceRoleSchema, type WorkspaceRole } from '@devsync/shared';
import type { Db } from '../../db';
import { dateTime, uuid } from '../../lib/schemas';

const withMemberCount = { _count: { select: { members: true } } } as const;
export const userRefSelect = { select: { id: true, name: true, avatarUrl: true } } as const;
const memberUserSelect = {
  select: { id: true, name: true, email: true, avatarUrl: true },
} as const;
export const invitationInclude = {
  workspace: { select: { name: true } },
  invitedBy: userRefSelect,
} as const;

export const workspaceSchema = z.object({
  id: uuid,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  role: workspaceRoleSchema,
  memberCount: z.number().int(),
  createdAt: dateTime,
  updatedAt: dateTime,
});
export type WorkspaceOut = z.infer<typeof workspaceSchema>;

export const userRefSchema = z.object({
  id: uuid,
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export const memberSchema = z.object({
  userId: uuid,
  role: workspaceRoleSchema,
  joinedAt: dateTime,
  user: userRefSchema.extend({ email: z.string() }),
});
export type MemberOut = z.infer<typeof memberSchema>;

export const invitationSchema = z.object({
  id: uuid,
  workspaceId: uuid,
  workspaceName: z.string(),
  email: z.string(),
  role: workspaceRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED']),
  invitedBy: userRefSchema,
  expiresAt: dateTime,
  createdAt: dateTime,
});
export type InvitationOut = z.infer<typeof invitationSchema>;

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { members: number };
};

export const toWorkspace = (w: WorkspaceRow, role: WorkspaceRole): WorkspaceOut => ({
  id: w.id,
  name: w.name,
  slug: w.slug,
  description: w.description,
  role,
  memberCount: w._count.members,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});

export const toUserRef = (u: { id: string; name: string; avatarUrl: string | null }) => ({
  id: u.id,
  name: u.name,
  avatarUrl: u.avatarUrl,
});

export const loadWorkspace = async (
  db: Db,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceOut> => {
  const m = await db.workspaceMember.findUniqueOrThrow({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { include: withMemberCount } },
  });
  return toWorkspace(m.workspace, m.role);
};

type MemberRow = {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
};

export const toMember = (m: MemberRow): MemberOut => ({
  userId: m.userId,
  role: m.role,
  joinedAt: m.joinedAt,
  user: m.user,
});

export const memberInclude = { user: memberUserSelect } as const;

export const loadMember = async (db: Db, workspaceId: string, userId: string) =>
  toMember(
    await db.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: memberInclude,
    }),
  );

type InvitationRow = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationOut['status'];
  expiresAt: Date;
  createdAt: Date;
  workspace: { name: string };
  invitedBy: { id: string; name: string; avatarUrl: string | null };
};

export const toInvitation = (i: InvitationRow): InvitationOut => ({
  id: i.id,
  workspaceId: i.workspaceId,
  workspaceName: i.workspace.name,
  email: i.email,
  role: i.role,
  status: i.status,
  invitedBy: toUserRef(i.invitedBy),
  expiresAt: i.expiresAt,
  createdAt: i.createdAt,
});
