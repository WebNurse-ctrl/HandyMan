import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { INVITE_ROLES, requireRole } from '@/lib/auth';
import { buildAcceptInviteUrl, sendInvitationEmail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

const VALID_SUGGESTED_ROLES = [
  'MEDEWERKER',
  'TECHNISCHE_DIENST',
  'DIENSTHOOFD',
  'FACILITAIR_MANAGER',
] as const;

const INVITATION_TTL_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;

    const invitations = await prisma.userInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
        scopeCampus: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;
    const { user } = auth.ctx;

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const suggestedRoleRaw =
      typeof body?.suggestedRole === 'string' ? body.suggestedRole : 'MEDEWERKER';
    const scopeCampusId =
      typeof body?.scopeCampusId === 'string' && body.scopeCampusId !== ''
        ? body.scopeCampusId
        : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Ongeldig e-mailadres' }, { status: 400 });
    }
    if (!VALID_SUGGESTED_ROLES.includes(suggestedRoleRaw as (typeof VALID_SUGGESTED_ROLES)[number])) {
      return NextResponse.json({ message: 'Ongeldige rol' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.isActive) {
      return NextResponse.json(
        { message: 'Er bestaat al een actieve gebruiker met dit e-mailadres' },
        { status: 409 },
      );
    }

    if (scopeCampusId) {
      const campus = await prisma.campus.findUnique({ where: { id: scopeCampusId } });
      if (!campus) {
        return NextResponse.json({ message: 'Campus niet gevonden' }, { status: 400 });
      }
    }

    // Verwijder oude (niet-geaccepteerde) uitnodigingen voor hetzelfde e-mailadres.
    await prisma.userInvitation.deleteMany({
      where: { email, acceptedAt: null },
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await prisma.userInvitation.create({
      data: {
        email,
        token,
        invitedById: user.id,
        suggestedRole: suggestedRoleRaw as (typeof VALID_SUGGESTED_ROLES)[number],
        scopeCampusId,
        expiresAt,
      },
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
        scopeCampus: { select: { id: true, name: true } },
      },
    });

    try {
      await sendInvitationEmail({
        to: email,
        inviterName: user.displayName,
        acceptUrl: buildAcceptInviteUrl(token),
        expiresAt,
      });
    } catch (mailErr) {
      console.error('Invitation mail error:', mailErr);
      // Rol back zodat de admin het opnieuw kan proberen.
      await prisma.userInvitation.delete({ where: { id: invitation.id } });
      return NextResponse.json(
        {
          message:
            'E-mail verzenden mislukt. Controleer RESEND_API_KEY / MAIL_FROM en probeer opnieuw.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
