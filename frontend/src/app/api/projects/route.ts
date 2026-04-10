import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const campusId = searchParams.get('campusId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (campusId) where.campusId = campusId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campus: { select: { name: true } },
          manager: { select: { displayName: true, avatarUrl: true } },
          _count: { select: { tasks: true, purchases: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

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
    const body = await request.json();

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

    let user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ message: 'No users found' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        projectNumber,
        name: body.name,
        description: body.description,
        campusId: body.campusId || undefined,
        managerId: body.managerId || undefined,
        createdById: user.id,
        budgetEstimate: body.budgetEstimate,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
      include: {
        campus: { select: { name: true } },
        manager: { select: { displayName: true } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
