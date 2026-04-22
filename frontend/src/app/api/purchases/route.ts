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
    const projectId = searchParams.get('projectId') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // MEDEWERKER sees only their own purchases; other roles see all.
    if (authed.role === 'MEDEWERKER') {
      where.requestedById = authed.id;
    }

    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { displayName: true } },
          project: { select: { name: true, projectNumber: true } },
          task: { select: { title: true, taskNumber: true } },
          _count: { select: { approvals: true } },
        },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Purchases GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireAuth(request);
    const body = await request.json();

    if (!body.title || typeof body.estimatedCost !== 'number') {
      return NextResponse.json(
        { message: 'title and estimatedCost are required' },
        { status: 400 },
      );
    }

    const year = new Date().getFullYear();
    const count = await prisma.purchaseRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const purchaseNumber = `AK-${year}-${String(count + 1).padStart(4, '0')}`;

    const SMALL_LIMIT = 500;
    const type = body.estimatedCost <= SMALL_LIMIT ? 'KLEIN' : 'GROOT';
    const status = type === 'KLEIN' ? 'GOEDGEKEURD' : 'WACHT_OP_GOEDKEURING';

    const purchase = await prisma.purchaseRequest.create({
      data: {
        purchaseNumber,
        title: body.title,
        description: body.description,
        requestedById: authed.id,
        workRequestId: body.workRequestId || undefined,
        taskId: body.taskId || undefined,
        projectId: body.projectId || undefined,
        estimatedCost: body.estimatedCost,
        supplier: body.supplier,
        type,
        status,
      },
      include: {
        requestedBy: { select: { displayName: true } },
      },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Purchases POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
