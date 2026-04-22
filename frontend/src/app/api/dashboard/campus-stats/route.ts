import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const campuses = await prisma.campus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { workRequests: true } },
      },
    });

    return NextResponse.json(
      campuses.map((c) => ({
        campus: c.name,
        total: c._count.workRequests,
      })),
    );
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Dashboard campus stats error:', error);
    return NextResponse.json([]);
  }
}
