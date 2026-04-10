import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: ['PLANNING', 'ACTIEF'] } },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        budgetEstimate: true,
        budgetApproved: true,
        budgetSpent: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      projects.map((p) => ({
        ...p,
        budgetEstimate: Number(p.budgetEstimate || 0),
        budgetApproved: Number(p.budgetApproved || 0),
        budgetSpent: Number(p.budgetSpent || 0),
        percentUsed:
          p.budgetApproved && Number(p.budgetApproved) > 0
            ? Math.round((Number(p.budgetSpent) / Number(p.budgetApproved)) * 100)
            : 0,
      })),
    );
  } catch (error) {
    console.error('Dashboard budget error:', error);
    return NextResponse.json([]);
  }
}
