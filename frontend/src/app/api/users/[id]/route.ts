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
    const data: Record<string, unknown> = {};

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role as Role)) {
        return NextResponse.json({ message: 'Ongeldige rol' }, { status: 400 });
      }
      data.role = body.role as Role;
    }

    if (body.scopeCampusId !== undefined) {
      const value = body.scopeCampusId;
      if (value === null || value === '') {
        data.scopeCampusId = null;
      } else if (typeof value === 'string') {
        const campus = await prisma.campus.findUnique({ where: { id: value } });
        if (!campus) {
          return NextResponse.json(
            { message: 'Campus niet gevonden' },
            { status: 400 },
          );
        }
        data.scopeCampusId = value;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        department: true,
        jobTitle: true,
        role: true,
        avatarUrl: true,
        lastLoginAt: true,
        scopeCampusId: true,
        scopeCampus: { select: { id: true, name: true } },
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
    console.error('User PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;

    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2025') {
      return NextResponse.json(
        { message: 'Gebruiker niet gevonden' },
        { status: 404 },
      );
    }
    console.error('User DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
