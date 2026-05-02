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

    const raw = await prisma.userInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
        scopeCampuses: {
          select: { campus: { select: { id: true, name: true } } },
        },
      },
    });

    const invitations = raw.map((i) => ({
      ...i,
      scopeCampuses: i.scopeCampuses.map((s) => s.campus),
    }));

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
    const rawScopeIds = Array.isArray(body?.scopeCampusIds) ? body.scopeCampusIds : [];
    const scopeCampusIds = (rawScopeIds as unknown[]).filter(
      (v): v is string => typeof v === 'string' && v !== '',
    );

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

    if (scopeCampusIds.length > 0) {
      const found = await prisma.campus.findMany({
        where: { id: { in: scopeCampusIds } },
        select: { id: true },
      });
      if (found.length !== scopeCampusIds.length) {
        return NextResponse.json(
          { message: 'Eén of meer campussen niet gevonden' },
          { status: 400 },
        );
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
        expiresAt,
        scopeCampuses: scopeCampusIds.length
          ? { create: scopeCampusIds.map((cid) => ({ campusId: cid })) }
          : undefined,
      },
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
        scopeCampuses: {
          select: { campus: { select: { id: true, name: true } } },
        },
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
      const detail =
        mailErr instanceof Error ? mailErr.message : 'onbekende fout';
      return NextResponse.json(
        {
          message: `E-mail verzenden mislukt: ${detail}. Controleer of het MAIL_FROM-domein geverifieerd is in Resend (of gebruik tijdelijk onboarding@resend.dev).`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ...invitation,
        scopeCampuses: invitation.scopeCampuses.map((s) => s.campus),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
