import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const months = 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const requests = await prisma.workRequest.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    const monthlyData: Record<string, { created: number; resolved: number }> = {};

    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { created: 0, resolved: 0 };
    }

    for (const req of requests) {
      const key = `${req.createdAt.getFullYear()}-${String(req.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].created++;
        if (req.status === 'AFGEWERKT') {
          monthlyData[key].resolved++;
        }
      }
    }

    return NextResponse.json(
      Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .reverse(),
    );
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Dashboard trends error:', error);
    return NextResponse.json([]);
  }
}
