import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const departmentId = request.nextUrl.searchParams.get('departmentId');
    if (!departmentId) {
      return NextResponse.json(
        { message: 'departmentId query parameter is verplicht' },
        { status: 400 },
      );
    }

    const rooms = await prisma.room.findMany({
      where: { departmentId, isActive: true },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, number: true },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Rooms GET error:', error);
    return NextResponse.json([]);
  }
}
