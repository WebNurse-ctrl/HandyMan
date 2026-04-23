import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const campusId = params.get('campusId') || undefined;
    const buildingId = params.get('buildingId') || undefined;
    const scope = params.get('scope'); // 'direct' = buildingId null

    if (!campusId && !buildingId) {
      return NextResponse.json(
        { message: 'campusId of buildingId is verplicht' },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = { isActive: true };
    if (buildingId) {
      where.buildingId = buildingId;
    } else if (campusId) {
      where.campusId = campusId;
      if (scope === 'direct') {
        where.buildingId = null;
      }
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, buildingId: true },
    });
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Departments GET error:', error);
    return NextResponse.json([]);
  }
}
