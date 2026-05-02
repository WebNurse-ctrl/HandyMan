import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function loadAccessibleRequest(
  id: string,
  ctx: { userId: string; isMedewerker: boolean; scopeCampusIds: string[] },
) {
  const wr = await prisma.workRequest.findUnique({
    where: { id },
    select: { id: true, requestedById: true, campusId: true },
  });
  if (!wr) return null;
  if (ctx.isMedewerker && wr.requestedById !== ctx.userId) return null;
  if (
    !ctx.isMedewerker &&
    ctx.scopeCampusIds.length > 0 &&
    !ctx.scopeCampusIds.includes(wr.campusId)
  ) {
    return null;
  }
  return wr;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, isMedewerker, scopeCampusIds } = auth.ctx;

    const wr = await loadAccessibleRequest(params.id, {
      userId: user.id,
      isMedewerker,
      scopeCampusIds,
    });
    if (!wr) {
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
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, isMedewerker, scopeCampusIds } = auth.ctx;

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json(
        { message: 'Commentaar mag niet leeg zijn' },
        { status: 400 },
      );
    }

    const wr = await loadAccessibleRequest(params.id, {
      userId: user.id,
      isMedewerker,
      scopeCampusIds,
    });
    if (!wr) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: user.id,
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
