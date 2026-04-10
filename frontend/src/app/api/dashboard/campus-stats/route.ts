import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    console.error('Dashboard campus stats error:', error);
    return NextResponse.json([]);
  }
}
