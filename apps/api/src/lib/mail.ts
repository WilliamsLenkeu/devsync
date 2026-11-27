import { Resend } from 'resend';
import type { Config } from '../config';

export type EmailDelivery = 'sent' | 'skipped' | 'failed';

export type InvitationMailInput = {
  to: string;
  workspaceName: string;
  role: string;
  invitedByName: string;
  /** Full accept URL including token — never log this value. */
  acceptUrl: string;
  expiresAt: Date;
};

export type Mailer = {
  sendWorkspaceInvitation: (input: InvitationMailInput) => Promise<EmailDelivery>;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Build a mailer. Missing API key or test env → skipped (no network). Errors → failed. */
export const createMailer = (config: Config, log?: { warn: (o: object, msg: string) => void }): Mailer => {
  const key = config.RESEND_API_KEY;
  if (!key || config.NODE_ENV === 'test') {
    return {
      sendWorkspaceInvitation: async () => 'skipped',
    };
  }

  const resend = new Resend(key);
  const from = config.MAIL_FROM;

  return {
    sendWorkspaceInvitation: async (input) => {
      const subject = `Join ${input.workspaceName} on DevSync`;
      const when = input.expiresAt.toISOString().slice(0, 10);
      const html = `
<p>${escapeHtml(input.invitedByName)} invited you to <strong>${escapeHtml(input.workspaceName)}</strong>
as <strong>${escapeHtml(input.role)}</strong>.</p>
<p><a href="${escapeHtml(input.acceptUrl)}">Accept the invitation</a></p>
<p>This link expires on ${escapeHtml(when)}. If you did not expect this, ignore the email.</p>
`.trim();
      const text = [
        `${input.invitedByName} invited you to ${input.workspaceName} as ${input.role}.`,
        `Accept: ${input.acceptUrl}`,
        `Expires: ${when}`,
      ].join('\n');

      try {
        const { error } = await resend.emails.send({
          from,
          to: input.to,
          subject,
          html,
          text,
        });
        if (error) {
          log?.warn({ errName: error.name }, 'invitation email send failed');
          return 'failed';
        }
        return 'sent';
      } catch {
        log?.warn({}, 'invitation email send threw');
        return 'failed';
      }
    },
  };
};
