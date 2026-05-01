import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INVITE_ROLES, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_ROLES = [
  'MEDEWERKER',
  'TECHNISCHE_DIENST',
  'DIENSTHOOFD',
  'FACILITAIR_MANAGER',
  'ADMIN',
] as const;

type Role = (typeof VALID_ROLES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { role } = body as { role: string };

    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json(
        { message: 'Ongeldige rol' },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        displayName: true,
        department: true,
        jobTitle: true,
        role: true,
        avatarUrl: true,
        lastLoginAt: true,
      },
    });
    return NextResponse.json(user);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2025') {
      return NextResponse.json(
        { message: 'Gebruiker niet gevonden' },
        { status: 404 },
      );
    }
    console.error('User role PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
