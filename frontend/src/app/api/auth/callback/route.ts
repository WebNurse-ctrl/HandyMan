import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Azure AD error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(new URL('/login?error=azure_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const redirectUri = process.env.AZURE_AD_REDIRECT_URI;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code,
          redirect_uri: redirectUri!,
          grant_type: 'authorization_code',
          scope: 'openid profile email User.Read',
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const tokens = await tokenResponse.json();

    // Fetch user profile from Microsoft Graph
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!graphResponse.ok) {
      console.error('Graph API failed:', await graphResponse.text());
      return NextResponse.redirect(new URL('/login?error=graph_failed', request.url));
    }

    const profile = await graphResponse.json();

    // Find or create user in database
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
      // Determine role based on job title
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

    // Create a simple token (base64 encoded user ID)
    const token = btoa(user.id);

    return NextResponse.redirect(
      new URL(`/login?token=${token}`, request.url),
    );
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
