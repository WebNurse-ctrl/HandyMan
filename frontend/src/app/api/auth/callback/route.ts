import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAuthToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    const desc = searchParams.get('error_description') || 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=azure_denied&detail=${encodeURIComponent(desc)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_AD_REDIRECT_URI;

  if (!tenantId || !clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL('/login?error=config_missing&detail=' + encodeURIComponent(
        `Missing: ${!tenantId ? 'TENANT_ID ' : ''}${!clientId ? 'CLIENT_ID ' : ''}${!clientSecret ? 'CLIENT_SECRET ' : ''}${!redirectUri ? 'REDIRECT_URI' : ''}`
      ), request.url),
    );
  }

  // Step 1: Exchange authorization code for tokens
  let tokens;
  try {
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email User.Read',
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL(`/login?error=token_failed&detail=${encodeURIComponent(
          tokenData.error_description || tokenData.error || 'Token exchange failed'
        )}`, request.url),
      );
    }

    tokens = tokenData;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=token_exception&detail=${encodeURIComponent(msg)}`, request.url),
    );
  }

  // Step 2: Fetch user profile from Microsoft Graph
  let profile;
  try {
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!graphResponse.ok) {
      const graphError = await graphResponse.text();
      return NextResponse.redirect(
        new URL(`/login?error=graph_failed&detail=${encodeURIComponent(graphError)}`, request.url),
      );
    }

    profile = await graphResponse.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=graph_exception&detail=${encodeURIComponent(msg)}`, request.url),
    );
  }

  // Step 3: Create or update user in database
  try {
    let user = await prisma.user.findUnique({
      where: { azureAdId: profile.id },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: profile.mail || profile.userPrincipalName,
          displayName: profile.displayName,
          firstName: profile.givenName,
          lastName: profile.surname,
          department: profile.department,
          jobTitle: profile.jobTitle,
          lastLoginAt: new Date(),
        },
      });
    } else {
      let role: 'MEDEWERKER' | 'TECHNISCHE_DIENST' | 'DIENSTHOOFD' | 'FACILITAIR_MANAGER' = 'MEDEWERKER';
      const jobTitle = (profile.jobTitle || '').toLowerCase();
      if (jobTitle.includes('facilitair') || jobTitle.includes('facility')) {
        role = 'FACILITAIR_MANAGER';
      } else if (jobTitle.includes('diensthoofd') || jobTitle.includes('hoofd')) {
        role = 'DIENSTHOOFD';
      } else if (jobTitle.includes('technisch') || jobTitle.includes('onderhoud')) {
        role = 'TECHNISCHE_DIENST';
      }

      user = await prisma.user.create({
        data: {
          azureAdId: profile.id,
          email: profile.mail || profile.userPrincipalName,
          displayName: profile.displayName,
          firstName: profile.givenName,
          lastName: profile.surname,
          department: profile.department,
          jobTitle: profile.jobTitle,
          role,
          lastLoginAt: new Date(),
        },
      });
    }

    const token = await signAuthToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    return NextResponse.redirect(new URL(`/login?token=${token}`, request.url));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=db_failed&detail=${encodeURIComponent(msg)}`, request.url),
    );
  }
}
