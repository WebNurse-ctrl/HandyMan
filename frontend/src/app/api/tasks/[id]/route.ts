import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, TASK_MANAGE_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const detailInclude = {
  assignedTo: {
    select: { id: true, displayName: true, email: true, avatarUrl: true, role: true },
  },
  createdBy: { select: { id: true, displayName: true, email: true } },
  project: { select: { id: true, name: true, projectNumber: true } },
  workRequest: { select: { id: true, title: true, requestNumber: true } },
  category: { select: { id: true, name: true, color: true } },
  attachments: { orderBy: { createdAt: 'desc' as const } },
} as const;

async function loadTaskWithScope(
  id: string,
  scopeCampusIds: string[],
  isMedewerker: boolean,
) {
  if (isMedewerker) return null;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...detailInclude,
      workRequest: { select: { id: true, title: true, requestNumber: true, campusId: true } },
      project: { select: { id: true, name: true, projectNumber: true, campusId: true } },
    },
  });
  if (!task) return null;

  if (scopeCampusIds.length > 0) {
    const wrCampus = task.workRequest?.campusId ?? null;
    const pCampus = task.project?.campusId ?? null;
    const inScope =
      (!wrCampus && !pCampus) ||
      (wrCampus && scopeCampusIds.includes(wrCampus)) ||
      (pCampus && scopeCampusIds.includes(pCampus));
    if (!inScope) return null;
  }
  return task;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const task = await loadTaskWithScope(
    params.id,
    auth.ctx.scopeCampusIds,
    auth.ctx.isMedewerker,
  );
  if (!task) {
    return NextResponse.json({ message: 'Taak niet gevonden' }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, TASK_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const existing = await loadTaskWithScope(
      params.id,
      auth.ctx.scopeCampusIds,
      auth.ctx.isMedewerker,
    );
    if (!existing) {
      return NextResponse.json({ message: 'Taak niet gevonden' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.title === 'string') {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json({ message: 'Taaknaam mag niet leeg zijn' }, { status: 400 });
      }
      data.title = t;
    }
    if ('description' in body) data.description = body.description ? String(body.description) : null;
    if ('priority' in body) data.priority = body.priority;
    if ('status' in body) {
      data.status = body.status;
      if (body.status === 'AFGEWERKT') data.completedAt = new Date();
    }
    if ('categoryId' in body) data.categoryId = body.categoryId || null;
    if ('estimatedHours' in body) data.estimatedHours = body.estimatedHours ?? null;

    if ('assignedToId' in body) {
      const a = body.assignedToId ? String(body.assignedToId) : null;
      if (a) {
        const target = await prisma.user.findUnique({
          where: { id: a },
          select: { role: true, isActive: true },
        });
        if (!target || !target.isActive) {
          return NextResponse.json(
            { message: 'Toegewezen gebruiker niet gevonden.' },
            { status: 404 },
          );
        }
        if (target.role === 'MEDEWERKER') {
          return NextResponse.json(
            { message: 'Een gewone medewerker kan geen taak toegewezen krijgen.' },
            { status: 400 },
          );
        }
      }
      data.assignedToId = a;
    }

    const parseDate = (v: unknown): Date | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const sd = parseDate(body?.startDate);
    if (sd !== undefined) data.startDate = sd;
    const dd = parseDate(body?.dueDate);
    if (dd !== undefined) data.dueDate = dd;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    const updated = await prisma.task.update({
      where: { id: params.id },
      data,
      include: detailInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Task PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, TASK_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const existing = await loadTaskWithScope(
      params.id,
      auth.ctx.scopeCampusIds,
      auth.ctx.isMedewerker,
    );
    if (!existing) {
      return NextResponse.json({ message: 'Taak niet gevonden' }, { status: 404 });
    }
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
