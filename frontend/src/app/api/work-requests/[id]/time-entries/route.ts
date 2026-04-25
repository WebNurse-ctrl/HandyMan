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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const exists = await prisma.workRequest.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    const entries = await prisma.timeEntry.findMany({
      where: { workRequestId: params.id },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    });

    const totalMinutes = entries.reduce(
      (sum, entry) => sum + (entry.durationMinutes ?? 0),
      0,
    );

    return NextResponse.json({ data: entries, totalMinutes });
  } catch (error) {
    console.error('Time entries GET error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const workRequest = await prisma.workRequest.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!workRequest) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const startedAtInput = body?.startedAt;
    const endedAtInput = body?.endedAt;
    const notes =
      typeof body?.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : null;

    const startedAt = startedAtInput ? new Date(startedAtInput) : new Date();
    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json(
        { message: 'Ongeldige begintijd' },
        { status: 400 },
      );
    }

    let endedAt: Date | null = null;
    let durationMinutes: number | null = null;

    if (endedAtInput) {
      endedAt = new Date(endedAtInput);
      if (Number.isNaN(endedAt.getTime())) {
        return NextResponse.json(
          { message: 'Ongeldige eindtijd' },
          { status: 400 },
        );
      }
      if (endedAt < startedAt) {
        return NextResponse.json(
          { message: 'Eindtijd kan niet voor begintijd liggen' },
          { status: 400 },
        );
      }
      durationMinutes = Math.round(
        (endedAt.getTime() - startedAt.getTime()) / 60000,
      );
    } else {
      const running = await prisma.timeEntry.findFirst({
        where: { workRequestId: params.id, userId, endedAt: null },
        select: { id: true },
      });
      if (running) {
        return NextResponse.json(
          { message: 'Er loopt al een tijdsregistratie voor deze werkaanvraag' },
          { status: 409 },
        );
      }
    }

    const entry = await prisma.timeEntry.create({
      data: {
        workRequestId: params.id,
        userId,
        startedAt,
        endedAt,
        durationMinutes,
        notes,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Time entries POST error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
