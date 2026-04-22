import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const [
      totalRequests,
      openRequests,
      inProgressRequests,
      completedRequests,
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      activeProjects,
      pendingPurchases,
    ] = await Promise.all([
      prisma.workRequest.count(),
      prisma.workRequest.count({ where: { status: 'INGEDIEND' } }),
      prisma.workRequest.count({ where: { status: 'IN_BEHANDELING' } }),
      prisma.workRequest.count({ where: { status: 'AFGEWERKT' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'OPEN' } }),
      prisma.task.count({ where: { status: 'IN_UITVOERING' } }),
      prisma.task.count({ where: { status: 'AFGEWERKT' } }),
      prisma.project.count({ where: { status: { in: ['PLANNING', 'ACTIEF'] } } }),
      prisma.purchaseRequest.count({ where: { status: 'WACHT_OP_GOEDKEURING' } }),
    ]);

    return NextResponse.json({
      workRequests: {
        total: totalRequests,
        open: openRequests,
        inProgress: inProgressRequests,
        completed: completedRequests,
      },
      tasks: {
        total: totalTasks,
        open: openTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
      },
      projects: { active: activeProjects },
      purchases: { pendingApproval: pendingPurchases },
    });
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Dashboard overview error:', error);
    return NextResponse.json({
      workRequests: { total: 0, open: 0, inProgress: 0, completed: 0 },
      tasks: { total: 0, open: 0, inProgress: 0, completed: 0 },
      projects: { active: 0 },
      purchases: { pendingApproval: 0 },
    });
  }
}
