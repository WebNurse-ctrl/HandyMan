import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PICKUP_ROLES, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, PICKUP_ROLES);
    if (!auth.ok) return auth.response;
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'FACILITAIR_MANAGER'] },
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        department: true,
        role: true,
      },
      orderBy: { displayName: 'asc' },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Technical staff error:', error);
    return NextResponse.json([]);
  }
}
