/** Mentions are stored as `@[Name](user:<uuid>)` (docs/api-contract.md). */
const MENTION = /@\[([^\]\n]+)\]\(user:([^)\s]+)\)/g;

export type CommentSegment = { kind: 'text'; value: string } | { kind: 'mention'; name: string; userId: string };

export function parseMentions(body: string): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ kind: 'text', value: body.slice(last, start) });
    segments.push({ kind: 'mention', name: match[1], userId: match[2] });
    last = start + match[0].length;
  }
  if (last < body.length) segments.push({ kind: 'text', value: body.slice(last) });
  return segments;
}

/** Text typed after a trailing `@` (detection only at the end of the body, by design). */
export const mentionQuery = (body: string): string | null => body.match(/@([^\s@[\]()]*)$/)?.[1] ?? null;

export function insertMention(body: string, member: { id: string; name: string }): string {
  const name = member.name.replace(/[[\]()]/g, '');
  return body.replace(/@([^\s@[\]()]*)$/, `@[${name}](user:${member.id}) `);
}
