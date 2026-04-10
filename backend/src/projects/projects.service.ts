import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectStatus, NotificationType } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const projectNumber = await this.generateProjectNumber();

    return this.prisma.project.create({
      data: {
        projectNumber,
        name: dto.name,
        description: dto.description,
        campusId: dto.campusId,
        managerId: dto.managerId,
        createdById: userId,
        workRequestId: dto.workRequestId,
        budgetEstimate: dto.budgetEstimate,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        campus: { select: { name: true } },
        manager: { select: { displayName: true } },
        createdBy: { select: { displayName: true } },
      },
    });
  }

  async findAll(
    query: PaginationDto & { status?: ProjectStatus; campusId?: string },
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      campusId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (campusId) where.campusId = campusId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          campus: { select: { name: true } },
          manager: { select: { displayName: true, avatarUrl: true } },
          _count: { select: { tasks: true, purchases: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        campus: true,
        manager: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
        createdBy: { select: { displayName: true } },
        workRequest: {
          select: { id: true, requestNumber: true, title: true },
        },
        tasks: {
          include: {
            assignedTo: { select: { displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        purchases: {
          select: {
            id: true,
            purchaseNumber: true,
            title: true,
            estimatedCost: true,
            actualCost: true,
            status: true,
          },
        },
        comments: {
          include: { user: { select: { displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Calculate budget metrics
    const totalSpent = project.purchases.reduce((sum, p) => {
      const cost = p.actualCost || p.estimatedCost;
      return sum + Number(cost);
    }, 0);

    const taskStats = {
      total: project.tasks.length,
      open: project.tasks.filter((t) => t.status === 'OPEN').length,
      inProgress: project.tasks.filter((t) => t.status === 'IN_UITVOERING')
        .length,
      completed: project.tasks.filter((t) => t.status === 'AFGEWERKT').length,
    };

    return {
      ...project,
      budgetMetrics: {
        estimated: Number(project.budgetEstimate || 0),
        approved: Number(project.budgetApproved || 0),
        spent: totalSpent,
        remaining: Number(project.budgetApproved || 0) - totalSpent,
        percentUsed:
          project.budgetApproved && Number(project.budgetApproved) > 0
            ? (totalSpent / Number(project.budgetApproved)) * 100
            : 0,
      },
      taskStats,
    };
  }

  async update(
    id: string,
    data: Partial<CreateProjectDto> & {
      status?: ProjectStatus;
      budgetApproved?: number;
    },
    userId: string,
  ) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.status === ProjectStatus.AFGEROND) {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        campus: { select: { name: true } },
        manager: { select: { displayName: true } },
      },
    });

    // Check budget alerts
    if (existing.budgetApproved) {
      const spent = Number(existing.budgetSpent);
      const approved = Number(existing.budgetApproved);
      if (spent > approved * 0.9) {
        const managers = await this.prisma.user.findMany({
          where: {
            role: { in: ['FACILITAIR_MANAGER', 'DIENSTHOOFD'] },
            isActive: true,
          },
        });

        for (const manager of managers) {
          await this.notificationsService.create({
            userId: manager.id,
            type: NotificationType.PROJECT_BUDGET_ALERT,
            title: 'Budget alert',
            message: `Project "${existing.name}" heeft ${Math.round((spent / approved) * 100)}% van het budget gebruikt`,
            entityType: 'Project',
            entityId: id,
          });
        }
      }
    }

    return updated;
  }

  private async generateProjectNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.project.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `P-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
