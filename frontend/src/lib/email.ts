const APP_URL = 'https://handyman-eta-mocha.vercel.app';

async function getGraphAppToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) return null;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    },
  );

  if (!res.ok) {
    console.error('[email] app token fetch failed:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

export async function sendApprovalEmail(
  recipientEmail: string,
  recipientName: string,
): Promise<{ sent: boolean; reason?: string }> {
  const sender = process.env.AZURE_AD_MAIL_SENDER;
  if (!sender) {
    console.warn('[email] AZURE_AD_MAIL_SENDER not configured - skipping email');
    return { sent: false, reason: 'no_sender_configured' };
  }

  const token = await getGraphAppToken();
  if (!token) {
    return { sent: false, reason: 'no_app_token' };
  }

  const body = {
    message: {
      subject: 'Je HandyMan aanmelding is goedgekeurd',
      body: {
        contentType: 'HTML',
        content: `
          <p>Hallo ${recipientName},</p>
          <p>Goed nieuws - je aanmelding voor HandyMan is zojuist goedgekeurd door een administrator.</p>
          <p>Je kan nu de applicatie openen en aan de slag:</p>
          <p><a href="${APP_URL}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600">HandyMan openen</a></p>
          <p>Als je al ingelogd bent, ververs de pagina om toegang te krijgen.</p>
          <p>Met vriendelijke groeten,<br/>Het HandyMan team</p>
        `,
      },
      toRecipients: [{ emailAddress: { address: recipientEmail } }],
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[email] sendMail failed:', err);
    return { sent: false, reason: 'graph_error' };
  }

  return { sent: true };
}
