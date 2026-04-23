import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Admin categories GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, parentId, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ message: 'Naam is verplicht' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        color: color || null,
        parentId: parentId || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een categorie met deze naam bestaat al' },
        { status: 409 },
      );
    }
    console.error('Admin categories POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
