import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campuses = await prisma.campus.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { buildings: true, departments: true },
        },
      },
    });
    return NextResponse.json(campuses);
  } catch (error) {
    console.error('Admin campuses GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, address, city } = body;

    if (!name || !code) {
      return NextResponse.json(
        { message: 'Naam en code zijn verplicht' },
        { status: 400 },
      );
    }

    const campus = await prisma.campus.create({
      data: { name, code, address: address || null, city: city || null },
    });
    return NextResponse.json(campus, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een campus met deze naam of code bestaat al' },
        { status: 409 },
      );
    }
    console.error('Admin campuses POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
