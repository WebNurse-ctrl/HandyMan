import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
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
      this.prisma.workRequest.count(),
      this.prisma.workRequest.count({ where: { status: 'INGEDIEND' } }),
      this.prisma.workRequest.count({ where: { status: 'IN_BEHANDELING' } }),
      this.prisma.workRequest.count({ where: { status: 'AFGEWERKT' } }),
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: 'OPEN' } }),
      this.prisma.task.count({ where: { status: 'IN_UITVOERING' } }),
      this.prisma.task.count({ where: { status: 'AFGEWERKT' } }),
      this.prisma.project.count({
        where: { status: { in: ['PLANNING', 'ACTIEF'] } },
      }),
      this.prisma.purchaseRequest.count({
        where: { status: 'WACHT_OP_GOEDKEURING' },
      }),
    ]);

    return {
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
    };
  }

  async getWorkloadPerUser() {
    const users = await this.prisma.user.findMany({
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

    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      activeTasks: u._count.assignedTasks,
    }));
  }

  async getRequestsByCampus() {
    const campuses = await this.prisma.campus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: { workRequests: true },
        },
      },
    });

    // Get status breakdown per campus
    const result = [];
    for (const campus of campuses) {
      const statusCounts = await this.prisma.workRequest.groupBy({
        by: ['status'],
        where: { campusId: campus.id },
        _count: true,
      });

      result.push({
        campus: campus.name,
        total: campus._count.workRequests,
        breakdown: statusCounts.reduce(
          (acc, s) => ({ ...acc, [s.status]: s._count }),
          {},
        ),
      });
    }

    return result;
  }

  async getAverageResolutionTime() {
    const resolved = await this.prisma.workRequest.findMany({
      where: {
        status: 'AFGEWERKT',
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (resolved.length === 0) return { averageHours: 0, count: 0 };

    const totalHours = resolved.reduce((sum, r) => {
      const diff = r.resolvedAt!.getTime() - r.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return {
      averageHours: Math.round(totalHours / resolved.length),
      count: resolved.length,
    };
  }

  async getProjectBudgetSummary() {
    const projects = await this.prisma.project.findMany({
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

    return projects.map((p) => ({
      ...p,
      budgetEstimate: Number(p.budgetEstimate || 0),
      budgetApproved: Number(p.budgetApproved || 0),
      budgetSpent: Number(p.budgetSpent || 0),
      percentUsed:
        p.budgetApproved && Number(p.budgetApproved) > 0
          ? Math.round(
              (Number(p.budgetSpent) / Number(p.budgetApproved)) * 100,
            )
          : 0,
    }));
  }

  async getTrends(months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const requests = await this.prisma.workRequest.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    // Group by month
    const monthlyData: Record<string, { created: number; resolved: number }> = {};

    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { created: 0, resolved: 0 };
    }

    for (const req of requests) {
      const key = `${req.createdAt.getFullYear()}-${String(req.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].created++;
        if (req.status === 'AFGEWERKT') {
          monthlyData[key].resolved++;
        }
      }
    }

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .reverse();
  }
}
