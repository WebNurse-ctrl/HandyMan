import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const comments = await prisma.comment.findMany({
      where: { workRequestId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('Comments GET error:', error);
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
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json(
        { message: 'Commentaar mag niet leeg zijn' },
        { status: 400 },
      );
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

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        workRequestId: params.id,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
