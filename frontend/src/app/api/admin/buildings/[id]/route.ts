import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, code, description, isActive } = body;

    const building = await prisma.building.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(building);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een gebouw met deze naam bestaat al in deze campus' },
        { status: 409 },
      );
    }
    console.error('Building PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.building.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Building DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
