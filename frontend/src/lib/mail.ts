import { Resend } from 'resend';

const FROM_FALLBACK = 'HandyMan <noreply@handyman.local>';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY ontbreekt. Stel de env-var in om e-mails te kunnen versturen.',
    );
  }
  return new Resend(key);
}

function getFrom(): string {
  return process.env.MAIL_FROM || FROM_FALLBACK;
}

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://handyman-eta-mocha.vercel.app'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface InvitationEmailParams {
  to: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: Date;
}

function inviteEmailHtml({ inviterName, acceptUrl, expiresAt }: InvitationEmailParams): string {
  const expires = expiresAt.toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const inviter = escapeHtml(inviterName);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Uitnodiging voor HandyMan</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f7f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#06b6d4 100%);padding:32px 32px 28px;text-align:center;color:#ffffff;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.18);margin-bottom:14px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.01em;">HandyMan</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:0.9;letter-spacing:0.02em;">Facility Suite</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 12px;">
              <h2 style="margin:0 0 14px;font-size:20px;font-weight:600;color:#0f172a;">Welkom bij HandyMan</h2>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">
                <strong>${inviter}</strong> heeft je uitgenodigd om HandyMan te gebruiken,
                het facility-management platform van de organisatie.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Klik op de knop hieronder om je account te activeren en een persoonlijk wachtwoord in te stellen.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);">
                    <a href="${acceptUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Account activeren
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                Werkt de knop niet? Kopieer dan deze link naar je browser:<br />
                <a href="${acceptUrl}" style="color:#10b981;word-break:break-all;">${acceptUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                Deze uitnodiging is geldig tot <strong>${expires}</strong>. Heb je deze e-mail
                onverwacht ontvangen? Negeer hem dan veilig — er gebeurt niets zolang je niet op
                de knop klikt.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">HandyMan &middot; Facility Management Platform</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function inviteEmailText({ inviterName, acceptUrl, expiresAt }: InvitationEmailParams): string {
  const expires = expiresAt.toLocaleDateString('nl-BE');
  return [
    `Welkom bij HandyMan`,
    ``,
    `${inviterName} heeft je uitgenodigd om HandyMan te gebruiken.`,
    ``,
    `Activeer je account via deze link (geldig tot ${expires}):`,
    acceptUrl,
    ``,
    `Heb je deze e-mail onverwacht ontvangen? Negeer hem dan veilig.`,
    `— HandyMan Facility Suite`,
  ].join('\n');
}

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: getFrom(),
    to: params.to,
    subject: `${params.inviterName} heeft je uitgenodigd voor HandyMan`,
    html: inviteEmailHtml(params),
    text: inviteEmailText(params),
  });
}

export function buildAcceptInviteUrl(token: string): string {
  return `${getAppUrl().replace(/\/$/, '')}/accept-invite/${encodeURIComponent(token)}`;
}
