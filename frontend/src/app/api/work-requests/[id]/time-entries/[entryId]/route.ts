import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return atob(token);
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.timeEntry.findFirst({
      where: { id: params.entryId, workRequestId: params.id },
    });
    if (!entry) {
      return NextResponse.json(
        { message: 'Tijdsregistratie niet gevonden' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const startedAt =
      body?.startedAt !== undefined
        ? new Date(body.startedAt)
        : entry.startedAt;
    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json(
        { message: 'Ongeldige begintijd' },
        { status: 400 },
      );
    }

    let endedAt: Date | null;
    if (body?.endedAt === null) {
      endedAt = null;
    } else if (body?.endedAt !== undefined) {
      endedAt = new Date(body.endedAt);
      if (Number.isNaN(endedAt.getTime())) {
        return NextResponse.json(
          { message: 'Ongeldige eindtijd' },
          { status: 400 },
        );
      }
    } else if (body?.stop === true) {
      endedAt = new Date();
    } else {
      endedAt = entry.endedAt;
    }

    if (endedAt && endedAt < startedAt) {
      return NextResponse.json(
        { message: 'Eindtijd kan niet voor begintijd liggen' },
        { status: 400 },
      );
    }

    const durationMinutes = endedAt
      ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
      : null;

    const notes =
      body?.notes === null
        ? null
        : typeof body?.notes === 'string'
          ? body.notes.trim() || null
          : entry.notes;

    const updated = await prisma.timeEntry.update({
      where: { id: params.entryId },
      data: { startedAt, endedAt, durationMinutes, notes },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Time entry PATCH error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.timeEntry.findFirst({
      where: { id: params.entryId, workRequestId: params.id },
      select: { id: true },
    });
    if (!entry) {
      return NextResponse.json(
        { message: 'Tijdsregistratie niet gevonden' },
        { status: 404 },
      );
    }

    await prisma.timeEntry.delete({ where: { id: params.entryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Time entry DELETE error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
