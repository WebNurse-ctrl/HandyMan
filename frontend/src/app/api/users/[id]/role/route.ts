import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireRole } from '@/lib/auth-server';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: UserRole[] = [
  'MEDEWERKER',
  'TECHNISCHE_DIENST',
  'DIENSTHOOFD',
  'FACILITAIR_MANAGER',
  'ADMIN',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authed = await requireRole(request, 'FACILITAIR_MANAGER', 'ADMIN');
    const body = await request.json();
    const role = body?.role as UserRole | undefined;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    // Only ADMIN may grant or revoke the ADMIN role.
    if (role === 'ADMIN' && authed.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only an administrator can assign the ADMIN role' },
        { status: 403 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (target.role === 'ADMIN' && authed.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only an administrator can modify administrators' },
        { status: 403 },
      );
    }

    if (target.id === authed.id && target.role !== role) {
      return NextResponse.json(
        { message: 'You cannot change your own role' },
        { status: 403 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('User role PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
