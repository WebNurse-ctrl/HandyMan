import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const resolved = await prisma.workRequest.findMany({
      where: {
        status: 'AFGEWERKT',
        resolvedAt: { not: null },
      },
      select: { createdAt: true, resolvedAt: true },
    });

    if (resolved.length === 0) {
      return NextResponse.json({ averageHours: 0, count: 0 });
    }

    const totalHours = resolved.reduce((sum, r) => {
      const diff = r.resolvedAt!.getTime() - r.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return NextResponse.json({
      averageHours: Math.round(totalHours / resolved.length),
      count: resolved.length,
    });
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Dashboard resolution time error:', error);
    return NextResponse.json({ averageHours: 0, count: 0 });
  }
}
