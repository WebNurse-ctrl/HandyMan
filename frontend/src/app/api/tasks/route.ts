import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const assignedToId = searchParams.get('assignedToId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { taskNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { displayName: true, avatarUrl: true } },
          createdBy: { select: { displayName: true } },
          project: { select: { name: true, projectNumber: true } },
          category: { select: { name: true } },
          _count: { select: { logs: true, comments: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

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
    const body = await request.json();

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

    let user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ message: 'No users found' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        taskNumber,
        title: body.title,
        description: body.description,
        createdById: user.id,
        assignedToId: body.assignedToId || undefined,
        projectId: body.projectId || undefined,
        workRequestId: body.workRequestId || undefined,
        categoryId: body.categoryId || undefined,
        priority: body.priority || 'NORMAAL',
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        estimatedHours: body.estimatedHours,
      },
      include: {
        assignedTo: { select: { displayName: true } },
        createdBy: { select: { displayName: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
