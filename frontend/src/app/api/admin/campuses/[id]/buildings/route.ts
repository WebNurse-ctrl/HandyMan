import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const buildings = await prisma.building.findMany({
      where: { campusId: params.id },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(buildings);
  } catch (error) {
    console.error('Buildings GET error:', error);
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

    const building = await prisma.building.create({
      data: {
        campusId: params.id,
        name,
        code: code || null,
        description: description || null,
      },
    });
    return NextResponse.json(building, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een gebouw met deze naam bestaat al in deze campus' },
        { status: 409 },
      );
    }
    console.error('Buildings POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
