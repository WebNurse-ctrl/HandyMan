import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PROJECT_MANAGE_ROLES, requireAuth, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const detailInclude = {
  campus: { select: { id: true, name: true } },
  manager: {
    select: { id: true, displayName: true, email: true, avatarUrl: true, role: true },
  },
  createdBy: { select: { id: true, displayName: true, email: true } },
  attachments: {
    orderBy: { createdAt: 'desc' as const },
  },
  workRequests: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      requestedBy: { select: { id: true, displayName: true, avatarUrl: true } },
      assignedTo: { select: { id: true, displayName: true, avatarUrl: true } },
      campus: { select: { id: true, name: true } },
      tasks: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          assignedTo: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  },
  tasks: {
    where: { workRequestId: null },
    orderBy: { createdAt: 'desc' as const },
    include: {
      assignedTo: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
} as const;

async function loadAndAuthorize(
  id: string,
  scopeCampusIds: string[],
  isMedewerker: boolean,
) {
  if (isMedewerker) return { error: 404 as const };
  const project = await prisma.project.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!project) return { error: 404 as const };
  if (
    project.campusId &&
    scopeCampusIds.length > 0 &&
    !scopeCampusIds.includes(project.campusId)
  ) {
    return { error: 404 as const };
  }
  return { project };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { scopeCampusIds, isMedewerker } = auth.ctx;

    const result = await loadAndAuthorize(params.id, scopeCampusIds, isMedewerker);
    if ('error' in result) {
      return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
    }
    return NextResponse.json(result.project);
  } catch (error) {
    console.error('Project GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, PROJECT_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const { scopeCampusIds } = auth.ctx;

    const existing = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, campusId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
    }
    if (
      existing.campusId &&
      scopeCampusIds.length > 0 &&
      !scopeCampusIds.includes(existing.campusId)
    ) {
      return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ message: 'Naam mag niet leeg zijn' }, { status: 400 });
      }
      data.name = trimmed;
    }
    if ('description' in body) {
      data.description = body.description ? String(body.description) : null;
    }
    if ('campusId' in body) {
      const c = body.campusId ? String(body.campusId) : null;
      if (c && scopeCampusIds.length > 0 && !scopeCampusIds.includes(c)) {
        return NextResponse.json(
          { message: 'Geen toegang tot deze campus.' },
          { status: 403 },
        );
      }
      data.campusId = c;
    }
    if ('managerId' in body) {
      const m = body.managerId ? String(body.managerId) : null;
      if (m) {
        const lead = await prisma.user.findUnique({
          where: { id: m },
          select: { role: true, isActive: true },
        });
        if (!lead || !lead.isActive) {
          return NextResponse.json(
            { message: 'Projectverantwoordelijke niet gevonden.' },
            { status: 404 },
          );
        }
        if (lead.role === 'MEDEWERKER') {
          return NextResponse.json(
            { message: 'Een gewone medewerker kan geen projectverantwoordelijke zijn.' },
            { status: 400 },
          );
        }
      }
      data.managerId = m;
    }
    if ('status' in body) data.status = body.status;

    const parseDate = (v: unknown): Date | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const dl = parseDate(body?.deadline);
    if (dl !== undefined) data.deadline = dl;
    const sd = parseDate(body?.startDate);
    if (sd !== undefined) data.startDate = sd;
    const ed = parseDate(body?.endDate);
    if (ed !== undefined) data.endDate = ed;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    if (data.status === 'AFGEROND' && !data.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await prisma.project.update({
      where: { id: params.id },
      data,
      include: detailInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Project PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, PROJECT_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const { scopeCampusIds } = auth.ctx;

    const existing = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, campusId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
    }
    if (
      existing.campusId &&
      scopeCampusIds.length > 0 &&
      !scopeCampusIds.includes(existing.campusId)
    ) {
      return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Project DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
