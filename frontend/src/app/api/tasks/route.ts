import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, TASK_MANAGE_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const listInclude = {
  assignedTo: { select: { id: true, displayName: true, avatarUrl: true } },
  createdBy: { select: { id: true, displayName: true } },
  project: { select: { id: true, name: true, projectNumber: true } },
  workRequest: { select: { id: true, title: true, requestNumber: true } },
  category: { select: { id: true, name: true, color: true } },
  _count: { select: { logs: true, comments: true, attachments: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { isMedewerker, scopeCampusIds, user } = auth.ctx;

    if (isMedewerker) {
      return NextResponse.json({
        data: [],
        meta: { total: 0, page: 1, limit: 0, totalPages: 0 },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const assignedToId = searchParams.get('assignedToId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const workRequestId = searchParams.get('workRequestId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {};
    if (status) where.status = status as Prisma.TaskWhereInput['status'];
    if (assignedToId) where.assignedToId = assignedToId;
    if (projectId) where.projectId = projectId;
    if (workRequestId) where.workRequestId = workRequestId;

    if (scopeCampusIds.length > 0) {
      // Scope-filter via gerelateerde werkaanvraag of project.
      // Taken zonder werkaanvraag of project blijven zichtbaar.
      where.OR = [
        { workRequestId: null, projectId: null },
        { workRequest: { campusId: { in: scopeCampusIds } } },
        { project: { campusId: { in: scopeCampusIds } } },
        { project: { campusId: null } },
      ];
    }

    if (search) {
      const searchOr: Prisma.TaskWhereInput[] = [
        { title: { contains: search, mode: 'insensitive' } },
        { taskNumber: { contains: search, mode: 'insensitive' } },
      ];
      where.AND = [{ OR: searchOr }];
      if (where.OR) {
        where.AND.push({ OR: where.OR });
        delete where.OR;
      }
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: listInclude,
      }),
      prisma.task.count({ where }),
    ]);

    void user;
    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, TASK_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusIds } = auth.ctx;

    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ message: 'Taaknaam is verplicht' }, { status: 400 });
    }

    const description = typeof body?.description === 'string' ? body.description : null;
    const assignedToId = body?.assignedToId ? String(body.assignedToId) : null;
    const projectId = body?.projectId ? String(body.projectId) : null;
    const workRequestId = body?.workRequestId ? String(body.workRequestId) : null;
    const categoryId = body?.categoryId ? String(body.categoryId) : null;
    const priority = body?.priority ?? 'NORMAAL';
    const parseDate = (v: unknown): Date | null => {
      if (!v) return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    if (assignedToId) {
      const target = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true, isActive: true },
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

    // Scope-validatie: als gekoppeld aan werkaanvraag/project, moet user toegang hebben.
    if (workRequestId) {
      const wr = await prisma.workRequest.findUnique({
        where: { id: workRequestId },
        select: { id: true, campusId: true, projectId: true },
      });
      if (!wr) {
        return NextResponse.json(
          { message: 'Werkaanvraag niet gevonden.' },
          { status: 404 },
        );
      }
      if (
        scopeCampusIds.length > 0 &&
        !scopeCampusIds.includes(wr.campusId)
      ) {
        return NextResponse.json(
          { message: 'Geen toegang tot deze werkaanvraag.' },
          { status: 403 },
        );
      }
    }
    if (projectId) {
      const p = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, campusId: true },
      });
      if (!p) {
        return NextResponse.json(
          { message: 'Project niet gevonden.' },
          { status: 404 },
        );
      }
      if (
        p.campusId &&
        scopeCampusIds.length > 0 &&
        !scopeCampusIds.includes(p.campusId)
      ) {
        return NextResponse.json(
          { message: 'Geen toegang tot dit project.' },
          { status: 403 },
        );
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.task.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const taskNumber = `T-${year}-${String(count + 1).padStart(4, '0')}`;

    const task = await prisma.task.create({
      data: {
        taskNumber,
        title,
        description,
        createdById: user.id,
        assignedToId,
        projectId,
        workRequestId,
        categoryId,
        priority,
        startDate: parseDate(body?.startDate),
        dueDate: parseDate(body?.dueDate),
        estimatedHours: body?.estimatedHours ?? null,
      },
      include: listInclude,
    });

    if (assignedToId && assignedToId !== user.id) {
      await prisma.notification
        .create({
          data: {
            userId: assignedToId,
            type: 'TASK_ASSIGNED',
            title: 'Nieuwe taak toegewezen',
            message: `${task.title} (${task.taskNumber})`,
            entityType: 'task',
            entityId: task.id,
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
