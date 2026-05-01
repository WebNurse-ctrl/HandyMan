import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MIN_PASSWORD_LENGTH = 10;

// Public endpoint: accepteer uitnodiging met wachtwoord, maak/activate user.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json(
        { message: 'Uitnodigingstoken ontbreekt' },
        { status: 400 },
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { message: `Wachtwoord moet minstens ${MIN_PASSWORD_LENGTH} tekens lang zijn.` },
        { status: 400 },
      );
    }

    const invitation = await prisma.userInvitation.findUnique({ where: { token } });
    if (!invitation) {
      return NextResponse.json(
        { message: 'Uitnodiging niet gevonden' },
        { status: 404 },
      );
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { message: 'Uitnodiging is al geaccepteerd' },
        { status: 409 },
      );
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Uitnodiging is verlopen' },
        { status: 410 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Existing user? Re-activate + set password. Else create.
    const existing = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          isActive: true,
          role: invitation.suggestedRole,
          scopeCampusId: invitation.scopeCampusId,
          profileCompleted: existing.profileCompleted && !!existing.firstName,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          displayName: invitation.email.split('@')[0],
          role: invitation.suggestedRole,
          scopeCampusId: invitation.scopeCampusId,
          profileCompleted: false,
          isActive: true,
        },
      });
    }

    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    // Notificatie naar alle ADMIN/FM/DH dat een nieuwe medewerker zich heeft aangemeld.
    const recipients = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'FACILITAIR_MANAGER', 'DIENSTHOOFD'] },
        isActive: true,
        id: { not: user.id },
      },
      select: { id: true },
    });
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          type: 'USER_REGISTERED',
          title: 'Nieuwe medewerker aangemeld',
          message: `${user.email} heeft de uitnodiging geaccepteerd. Ken een rol toe via Beheer › Gebruikers.`,
          entityType: 'user',
          entityId: user.id,
        })),
      });
    }

    const sessionToken = await signSessionToken(user.id);
    return NextResponse.json({
      token: sessionToken,
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    console.error('Invitation accept error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
