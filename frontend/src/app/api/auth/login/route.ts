import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI;

  if (!tenantId || !clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Azure AD not configured' },
      { status: 500 },
    );
  }

  const authUrl =
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent('openid profile email User.Read')}` +
    `&prompt=select_account`;

  return NextResponse.redirect(authUrl);
}
