import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireAuth(request);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const campusId = searchParams.get('campusId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (campusId) where.campusId = campusId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // MEDEWERKER sees only their own requests; other roles see all.
    if (authed.role === 'MEDEWERKER') {
      where.requestedById = authed.id;
    }

    const [data, total] = await Promise.all([
      prisma.workRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { displayName: true, email: true } },
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
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Work requests GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireAuth(request);
    const body = await request.json();
    const { title, description, campusId, locationId, categoryId, priority } = body;

    if (!title || !description || !campusId) {
      return NextResponse.json(
        { message: 'title, description and campusId are required' },
        { status: 400 },
      );
    }

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
        requestedById: authed.id,
        campusId,
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
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Work requests POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
