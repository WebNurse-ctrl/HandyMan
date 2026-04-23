import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const baseCampus = await prisma.campus.findUnique({
      where: { id: params.id },
    });
    if (!baseCampus) {
      return NextResponse.json({ message: 'Campus niet gevonden' }, { status: 404 });
    }

    const buildings = await prisma.building.findMany({
      where: { campusId: params.id },
      orderBy: { name: 'asc' },
    });

    const allDepartments = await prisma.department.findMany({
      where: { campusId: params.id },
      orderBy: { name: 'asc' },
      include: {
        rooms: { orderBy: [{ number: 'asc' }, { name: 'asc' }] },
      },
    });

    const buildingsWithDepartments = buildings.map((b) => ({
      ...b,
      departments: allDepartments.filter((d) => d.buildingId === b.id),
    }));

    const directDepartments = allDepartments.filter((d) => !d.buildingId);

    return NextResponse.json({
      ...baseCampus,
      buildings: buildingsWithDepartments,
      departments: directDepartments,
    });
  } catch (error) {
    console.error('Admin campus detail GET error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, code, address, city, isActive } = body;

    const campus = await prisma.campus.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json(campus);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { message: 'Een campus met deze naam of code bestaat al' },
        { status: 409 },
      );
    }
    console.error('Admin campus PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.campus.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2003') {
      return NextResponse.json(
        {
          message:
            'Campus kan niet verwijderd worden omdat er nog werkaanvragen of projecten aan gekoppeld zijn',
        },
        { status: 409 },
      );
    }
    console.error('Admin campus DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
