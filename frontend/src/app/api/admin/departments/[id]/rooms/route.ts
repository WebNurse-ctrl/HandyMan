import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const rooms = await prisma.room.findMany({
      where: { departmentId: params.id },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Rooms GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, number, description } = body;

    if (!name && !number) {
      return NextResponse.json(
        { message: 'Naam of nummer is verplicht' },
        { status: 400 },
      );
    }

    const room = await prisma.room.create({
      data: {
        departmentId: params.id,
        name: name || null,
        number: number || null,
        description: description || null,
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Rooms POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
