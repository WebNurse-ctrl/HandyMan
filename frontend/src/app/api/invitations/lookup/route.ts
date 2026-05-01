import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Public endpoint: lookup uitnodiging op token (gebruikt door /accept-invite)
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { valid: false, reason: 'no_token' },
        { status: 400 },
      );
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      select: {
        email: true,
        expiresAt: true,
        acceptedAt: true,
        invitedBy: { select: { displayName: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }
    if (invitation.acceptedAt) {
      return NextResponse.json({ valid: false, reason: 'already_accepted' });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      inviterName: invitation.invitedBy.displayName,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error('Invitation lookup error:', error);
    return NextResponse.json(
      { valid: false, reason: 'error' },
      { status: 500 },
    );
  }
}
