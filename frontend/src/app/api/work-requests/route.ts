import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusId, isMedewerker } = auth.ctx;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const campusIdFilter = searchParams.get('campusId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkRequestWhereInput = {};
    if (status) where.status = status as Prisma.WorkRequestWhereInput['status'];
    if (priority) where.priority = priority as Prisma.WorkRequestWhereInput['priority'];

    // MEDEWERKER ziet alleen eigen aanvragen.
    if (isMedewerker) {
      where.requestedById = user.id;
    } else if (scopeCampusId) {
      // Niet-MEDEWERKER met campus-scope ziet alleen die campus.
      where.campusId = scopeCampusId;
    }

    if (campusIdFilter) {
      // Expliciete filter mag niet boven scope uitgaan.
      if (scopeCampusId && campusIdFilter !== scopeCampusId) {
        // Negeer filter buiten scope.
      } else {
        where.campusId = campusIdFilter;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.workRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, displayName: true, email: true } },
          assignedTo: { select: { id: true, displayName: true, email: true } },
          campus: { select: { name: true } },
          location: { select: { name: true } },
          category: { select: { name: true } },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      prisma.workRequest.count({ where }),
    ]);

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Work requests GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user } = auth.ctx;

    const body = await request.json();
    const {
      title,
      description,
      campusId,
      buildingId,
      departmentId,
      roomId,
      locationId,
      categoryId,
      priority,
    } = body;

    const year = new Date().getFullYear();
    const count = await prisma.workRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const requestNumber = `WR-${year}-${String(count + 1).padStart(4, '0')}`;

    const workRequest = await prisma.workRequest.create({
      data: {
        requestNumber,
        title,
        description,
        requestedById: user.id,
        campusId,
        buildingId: buildingId || undefined,
        departmentId: departmentId || undefined,
        roomId: roomId || undefined,
        locationId: locationId || undefined,
        categoryId: categoryId || undefined,
        priority: priority || 'NORMAAL',
      },
      include: {
        requestedBy: { select: { displayName: true, email: true } },
        campus: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    return NextResponse.json(workRequest, { status: 201 });
  } catch (error) {
    console.error('Work requests POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
