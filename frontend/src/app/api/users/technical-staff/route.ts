import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole(
      request,
      'TECHNISCHE_DIENST',
      'DIENSTHOOFD',
      'FACILITAIR_MANAGER',
      'ADMIN',
    );

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNISCHE_DIENST', 'FACILITAIR_MANAGER'] },
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
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Technical staff error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
