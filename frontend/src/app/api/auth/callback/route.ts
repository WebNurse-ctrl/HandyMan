import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// This handles the Azure AD OAuth callback
// In production, you would validate the token with Azure AD
// For now, this creates/finds a demo user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // In production: exchange code for token via Azure AD
    // For demo: create/find a demo user
    let user = await prisma.user.findFirst({
      where: { email: 'demo@handyman.local' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          azureAdId: 'demo-azure-id',
          email: 'demo@handyman.local',
          displayName: 'Demo Gebruiker',
          firstName: 'Demo',
          lastName: 'Gebruiker',
          department: 'Technische Dienst',
          role: 'FACILITAIR_MANAGER',
        },
      });
    }

    // Simple token: base64 encoded user ID
    const token = btoa(user.id);

    return NextResponse.redirect(
      new URL(`/login?token=${token}`, request.url),
    );
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
