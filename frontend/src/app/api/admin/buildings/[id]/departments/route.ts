import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const departments = await prisma.department.findMany({
      where: { buildingId: params.id },
      orderBy: { name: 'asc' },
      include: {
        rooms: { orderBy: [{ number: 'asc' }, { name: 'asc' }] },
        _count: { select: { rooms: true } },
      },
    });
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Building departments GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, code, description } = body;

    if (!name) {
      return NextResponse.json({ message: 'Naam is verplicht' }, { status: 400 });
    }

    const building = await prisma.building.findUnique({
      where: { id: params.id },
      select: { campusId: true },
    });
    if (!building) {
      return NextResponse.json({ message: 'Gebouw niet gevonden' }, { status: 404 });
    }

    const department = await prisma.department.create({
      data: {
        campusId: building.campusId,
        buildingId: params.id,
        name,
        code: code || null,
        description: description || null,
      },
    });
    return NextResponse.json(department, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een afdeling met deze naam bestaat al in deze campus' },
        { status: 409 },
      );
    }
    console.error('Building departments POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
