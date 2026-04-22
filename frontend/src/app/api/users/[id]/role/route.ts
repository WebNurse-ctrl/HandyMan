import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-server';
import type { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_ROLES: UserRole[] = [
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
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: { role?: UserRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const role = body.role;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // Prevent an admin from demoting themselves - avoids lock-out when they are
  // the last admin.
  if (target.id === auth.user.id && role !== 'ADMIN') {
    const otherAdmins = await prisma.user.count({
      where: { role: 'ADMIN', id: { not: auth.user.id } },
    });
    if (otherAdmins === 0) {
      return NextResponse.json(
        { message: 'Cannot demote the last administrator' },
        { status: 400 },
      );
    }
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
}
