import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNISCHE_DIENST', 'FACILITAIR_MANAGER'] },
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        _count: {
          select: {
            assignedTasks: {
              where: { status: { in: ['OPEN', 'IN_UITVOERING'] } },
            },
          },
        },
      },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        activeTasks: u._count.assignedTasks,
      })),
    );
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Dashboard workload error:', error);
    return NextResponse.json([]);
  }
}
