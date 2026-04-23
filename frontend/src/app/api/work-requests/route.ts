import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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
    console.error('Work requests GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Generate request number
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

    // Get first user as fallback (in production, get from JWT)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          azureAdId: 'system',
          email: 'system@handyman.local',
          displayName: 'Systeem',
          role: 'ADMIN',
        },
      });
    }

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
