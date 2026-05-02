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

    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: { scopeCampuses: { select: { campusId: true } } },
    });
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

    const invitedScopeCampusIds = invitation.scopeCampuses.map((s) => s.campusId);

    const user = await prisma.$transaction(async (tx) => {
      let u;
      if (existing) {
        u = await tx.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            isActive: true,
            role: invitation.suggestedRole,
            profileCompleted: existing.profileCompleted && !!existing.firstName,
          },
        });
      } else {
        u = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            displayName: invitation.email.split('@')[0],
            role: invitation.suggestedRole,
            profileCompleted: false,
            isActive: true,
          },
        });
      }
      // Vervang user-scopes met de scopes uit de uitnodiging.
      await tx.userCampusScope.deleteMany({ where: { userId: u.id } });
      if (invitedScopeCampusIds.length > 0) {
        await tx.userCampusScope.createMany({
          data: invitedScopeCampusIds.map((cid) => ({ userId: u.id, campusId: cid })),
          skipDuplicates: true,
        });
      }
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return u;
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
