import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, description, color, parentId, sortOrder, isActive } = body;

    if (parentId && parentId === params.id) {
      return NextResponse.json(
        { message: 'Een categorie kan niet zijn eigen ouder zijn' },
        { status: 400 },
      );
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(category);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een categorie met deze naam bestaat al' },
        { status: 409 },
      );
    }
    console.error('Category PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const childCount = await prisma.category.count({
      where: { parentId: params.id },
    });
    if (childCount > 0) {
      return NextResponse.json(
        { message: 'Verwijder eerst de subcategorieën' },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2003') {
      return NextResponse.json(
        {
          message:
            'Categorie kan niet verwijderd worden omdat er werkaanvragen of taken aan gekoppeld zijn',
        },
        { status: 409 },
      );
    }
    console.error('Category DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
