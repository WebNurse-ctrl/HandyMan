import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    console.error('Dashboard workload error:', error);
    return NextResponse.json([]);
  }
}
