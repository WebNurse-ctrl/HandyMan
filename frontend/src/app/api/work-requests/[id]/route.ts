import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const workRequest = await prisma.workRequest.findUnique({
      where: { id: params.id },
      include: {
        requestedBy: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
        campus: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        room: { select: { id: true, name: true, number: true } },
        location: { select: { id: true, name: true, building: true, floor: true, room: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        attachments: true,
        _count: { select: { comments: true, attachments: true, tasks: true } },
      },
    });

    if (!workRequest) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    return NextResponse.json(workRequest);
  } catch (error) {
    console.error('Work request GET error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { progress, status, priority, rejectionReason } = body;

    const data: Record<string, unknown> = {};

    if (progress !== undefined) {
      const numericProgress = Number(progress);
      if (
        !Number.isInteger(numericProgress) ||
        numericProgress < 0 ||
        numericProgress > 100
      ) {
        return NextResponse.json(
          { message: 'Voortgang moet een geheel getal tussen 0 en 100 zijn' },
          { status: 400 },
        );
      }
      data.progress = numericProgress;

      if (numericProgress === 100) {
        data.status = 'AFGEWERKT';
        data.resolvedAt = new Date();
      } else if (numericProgress > 0) {
        const current = await prisma.workRequest.findUnique({
          where: { id: params.id },
          select: { status: true },
        });
        if (current?.status === 'INGEDIEND') {
          data.status = 'IN_BEHANDELING';
        }
      }
    }

    if (status !== undefined) {
      data.status = status;
      if (status === 'AFGEWERKT') {
        data.resolvedAt = new Date();
        if (data.progress === undefined) data.progress = 100;
      }
    }

    if (priority !== undefined) data.priority = priority;
    if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    const updated = await prisma.workRequest.update({
      where: { id: params.id },
      data,
      include: {
        requestedBy: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
        campus: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        room: { select: { id: true, name: true, number: true } },
        location: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true, tasks: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Work request PATCH error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
