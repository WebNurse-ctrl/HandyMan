import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PROJECT_MANAGE_ROLES, requireAuth, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const listInclude = {
  campus: { select: { id: true, name: true } },
  manager: { select: { id: true, displayName: true, avatarUrl: true } },
  createdBy: { select: { id: true, displayName: true } },
  _count: { select: { tasks: true, workRequests: true, purchases: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusIds, isMedewerker } = auth.ctx;

    if (isMedewerker) {
      // MEDEWERKER ziet geen projecten — sidebar verbergt het al, maar de API blokt ook.
      return NextResponse.json({
        data: [],
        meta: { total: 0, page: 1, limit: 0, totalPages: 0 },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const campusFilter = searchParams.get('campusId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};
    if (status) where.status = status as Prisma.ProjectWhereInput['status'];
    if (campusFilter) where.campusId = campusFilter;
    if (scopeCampusIds.length > 0) {
      // Scope-filter: alleen projecten zonder campus of binnen de toegestane campussen
      where.OR = [
        { campusId: null },
        { campusId: { in: scopeCampusIds } },
      ];
    }
    if (search) {
      const searchOr: Prisma.ProjectWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ];
      // Combineer met bestaande OR (scope) zonder elkaar te overschrijven
      where.AND = [{ OR: searchOr }];
      if (where.OR) {
        where.AND.push({ OR: where.OR });
        delete where.OR;
      }
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: listInclude,
      }),
      prisma.project.count({ where }),
    ]);

    void user; // bewust ongebruikt, maar auth-context valideert toegang
    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, PROJECT_MANAGE_ROLES);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusIds } = auth.ctx;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ message: 'Naam is verplicht' }, { status: 400 });
    }

    const description = typeof body?.description === 'string' ? body.description : null;
    const campusId = body?.campusId ? String(body.campusId) : null;
    const managerId = body?.managerId ? String(body.managerId) : null;

    if (
      campusId &&
      scopeCampusIds.length > 0 &&
      !scopeCampusIds.includes(campusId)
    ) {
      return NextResponse.json(
        { message: 'Geen toegang tot deze campus.' },
        { status: 403 },
      );
    }

    const parseDate = (v: unknown): Date | null => {
      if (!v) return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    if (managerId) {
      const lead = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true, isActive: true },
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

    const year = new Date().getFullYear();
    const count = await prisma.project.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const projectNumber = `P-${year}-${String(count + 1).padStart(4, '0')}`;

    const project = await prisma.project.create({
      data: {
        projectNumber,
        name,
        description,
        campusId,
        managerId,
        createdById: user.id,
        deadline: parseDate(body?.deadline),
        startDate: parseDate(body?.startDate),
        endDate: parseDate(body?.endDate),
      },
      include: listInclude,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
