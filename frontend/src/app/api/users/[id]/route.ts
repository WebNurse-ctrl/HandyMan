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
    let scopeCampusIds: string[] | null = null;

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role as Role)) {
        return NextResponse.json({ message: 'Ongeldige rol' }, { status: 400 });
      }
      data.role = body.role as Role;
    }

    if (body.scopeCampusIds !== undefined) {
      if (!Array.isArray(body.scopeCampusIds)) {
        return NextResponse.json(
          { message: 'scopeCampusIds moet een array zijn' },
          { status: 400 },
        );
      }
      const ids = (body.scopeCampusIds as unknown[]).filter(
        (v): v is string => typeof v === 'string' && v !== '',
      );
      if (ids.length > 0) {
        const found = await prisma.campus.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        if (found.length !== ids.length) {
          return NextResponse.json(
            { message: 'Eén of meer campussen niet gevonden' },
            { status: 400 },
          );
        }
      }
      scopeCampusIds = ids;
    }

    if (Object.keys(data).length === 0 && scopeCampusIds === null) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: params.id }, data });
      }
      if (scopeCampusIds !== null) {
        await tx.userCampusScope.deleteMany({ where: { userId: params.id } });
        if (scopeCampusIds.length > 0) {
          await tx.userCampusScope.createMany({
            data: scopeCampusIds.map((cid) => ({ userId: params.id, campusId: cid })),
            skipDuplicates: true,
          });
        }
      }
      const updated = await tx.user.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          department: true,
          jobTitle: true,
          role: true,
          avatarUrl: true,
          lastLoginAt: true,
          scopeCampuses: {
            select: { campus: { select: { id: true, name: true } } },
          },
        },
      });
      return updated;
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Gebruiker niet gevonden' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...user,
      scopeCampuses: user.scopeCampuses.map((s) => s.campus),
    });
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
