import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const campusId = request.nextUrl.searchParams.get('campusId');
    if (!campusId) {
      return NextResponse.json(
        { message: 'campusId query parameter is verplicht' },
        { status: 400 },
      );
    }

    const buildings = await prisma.building.findMany({
      where: { campusId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    return NextResponse.json(buildings);
  } catch (error) {
    console.error('Buildings GET error:', error);
    return NextResponse.json([]);
  }
}
