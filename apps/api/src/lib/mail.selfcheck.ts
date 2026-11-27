/**
 * Runnable check for Resend invitation mail (fails loudly if key/domain broken).
 * Usage: pnpm --filter @devsync/api exec tsx --env-file-if-exists=../../.env src/lib/mail.selfcheck.ts
 */
import { loadConfig } from '../config';
import { createMailer } from './mail';

const config = loadConfig({ ...process.env, NODE_ENV: 'development' });
if (!config.RESEND_API_KEY) {
  console.error('FAIL: RESEND_API_KEY missing');
  process.exit(1);
}

const mailer = createMailer(config);
const to = process.env.MAIL_SELFCHECK_TO?.trim() || 'delivered@resend.dev';
const result = await mailer.sendWorkspaceInvitation({
  to,
  workspaceName: 'DevSync selfcheck',
  role: 'MEMBER',
  invitedByName: 'Selfcheck',
  acceptUrl: `${config.WEB_ORIGIN}/invitations/accept?token=selfcheck-not-a-real-token`,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

if (result !== 'sent') {
  console.error(`FAIL: expected sent, got ${result} (to=${to})`);
  process.exit(1);
}
console.log(`OK: invitation mail sent to ${to}`);
