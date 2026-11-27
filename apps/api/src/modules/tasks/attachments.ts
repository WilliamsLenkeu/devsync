import { createReadStream, existsSync } from 'node:fs';
import type { Readable } from 'node:stream';
import { authorizeTask } from '../../authz';
import { AppError, notFound } from '../../errors';
import {
  assertAllowedContentType,
  attachmentPath,
  removeAttachmentFile,
  sanitizeFilename,
  storeAttachmentStream,
} from '../../lib/attachments';
import { toUserRef, userRefSelect } from './schemas';
import type { Ctx } from './service';

const include = {
  uploadedBy: { select: userRefSelect },
} as const;

export function toAttachmentDto(row: {
  id: string;
  taskId: string;
  commentId: string | null;
  filename: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
  uploadedBy: { id: string; name: string; avatarUrl: string | null };
}) {
  return {
    id: row.id,
    taskId: row.taskId,
    commentId: row.commentId,
    filename: row.filename,
    contentType: row.contentType,
    byteSize: row.byteSize,
    uploadedBy: toUserRef(row.uploadedBy),
    createdAt: row.createdAt,
  };
}

export type AttachmentDto = ReturnType<typeof toAttachmentDto>;

export async function listAttachments(ctx: Ctx, taskId: string): Promise<AttachmentDto[]> {
  await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:read');
  const rows = await ctx.app.db.taskAttachment.findMany({
    where: { taskId },
    include,
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toAttachmentDto);
}

export async function createAttachment(
  ctx: Ctx,
  taskId: string,
  input: {
    filename: string;
    contentType: string;
    body: Readable;
    commentId?: string | null;
  },
): Promise<AttachmentDto> {
  const { task } = await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:write');
  assertAllowedContentType(input.contentType);

  if (input.commentId) {
    const comment = await ctx.app.db.taskComment.findFirst({
      where: { id: input.commentId, taskId },
      select: { id: true },
    });
    if (!comment) throw notFound('Comment');
  }

  const filename = sanitizeFilename(input.filename);
  const { storageKey, byteSize } = await storeAttachmentStream({
    rootDir: ctx.app.config.ATTACHMENTS_DIR,
    taskId,
    filename,
    body: input.body,
    maxBytes: ctx.app.config.ATTACHMENTS_MAX_BYTES,
  });

  const row = await ctx.app.db.taskAttachment.create({
    data: {
      taskId,
      commentId: input.commentId ?? null,
      uploadedById: ctx.principal.userId,
      filename,
      contentType: input.contentType.split(';')[0]!.trim().toLowerCase(),
      byteSize,
      storageKey,
    },
    include,
  });

  ctx.app.events.publish({
    type: 'attachment.created',
    workspaceId: task.project.workspaceId,
    projectId: task.projectId,
    actorId: ctx.principal.userId,
    data: { attachment: toAttachmentDto(row) },
  });

  return toAttachmentDto(row);
}

export async function deleteAttachment(ctx: Ctx, attachmentId: string): Promise<void> {
  const row = await ctx.app.db.taskAttachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { project: { select: { workspaceId: true, id: true } } } } },
  });
  if (!row) throw notFound('Attachment');

  await authorizeTask(ctx.app.db, ctx.principal, row.taskId, 'task:write');

  await ctx.app.db.taskAttachment.delete({ where: { id: attachmentId } });
  await removeAttachmentFile(ctx.app.config.ATTACHMENTS_DIR, row.storageKey);

  ctx.app.events.publish({
    type: 'attachment.deleted',
    workspaceId: row.task.project.workspaceId,
    projectId: row.task.project.id,
    actorId: ctx.principal.userId,
    data: { attachmentId, taskId: row.taskId },
  });
}

export async function openAttachmentDownload(ctx: Ctx, attachmentId: string) {
  const row = await ctx.app.db.taskAttachment.findUnique({ where: { id: attachmentId } });
  if (!row) throw notFound('Attachment');
  await authorizeTask(ctx.app.db, ctx.principal, row.taskId, 'task:read');

  const abs = attachmentPath(ctx.app.config.ATTACHMENTS_DIR, row.storageKey);
  if (!existsSync(abs)) throw new AppError('NOT_FOUND', 'Attachment file missing on disk');

  return {
    stream: createReadStream(abs),
    filename: row.filename,
    contentType: row.contentType,
    byteSize: row.byteSize,
  };
}
