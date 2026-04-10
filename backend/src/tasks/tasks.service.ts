import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  TaskStatus,
  UserRole,
  NotificationType,
  WorkRequestStatus,
} from '@prisma/client';
import { CreateTaskDto, CreateTaskLogDto } from './dto/create-task.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateTaskDto) {
    const taskNumber = await this.generateTaskNumber();

    const task = await this.prisma.task.create({
      data: {
        taskNumber,
        title: dto.title,
        description: dto.description,
        createdById: userId,
        assignedToId: dto.assignedToId,
        projectId: dto.projectId,
        workRequestId: dto.workRequestId,
        categoryId: dto.categoryId,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedHours: dto.estimatedHours,
      },
      include: {
        assignedTo: { select: { displayName: true } },
        createdBy: { select: { displayName: true } },
        project: { select: { name: true } },
      },
    });

    // Notify assigned user
    if (dto.assignedToId) {
      await this.notificationsService.create({
        userId: dto.assignedToId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Nieuwe taak toegewezen',
        message: `Je bent toegewezen aan taak "${task.title}"`,
        entityType: 'Task',
        entityId: task.id,
      });
    }

    // Update linked work request status
    if (dto.workRequestId) {
      await this.prisma.workRequest.update({
        where: { id: dto.workRequestId },
        data: { status: WorkRequestStatus.IN_BEHANDELING },
      });
    }

    return task;
  }

  async findAll(
    query: PaginationDto & {
      status?: TaskStatus;
      assignedToId?: string;
      projectId?: string;
    },
    userId?: string,
    userRole?: UserRole,
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      assignedToId,
      projectId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Regular employees see only tasks assigned to them
    if (userRole === UserRole.MEDEWERKER) {
      where.assignedToId = userId;
    }

    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { taskNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignedTo: { select: { displayName: true, avatarUrl: true } },
          createdBy: { select: { displayName: true } },
          project: { select: { name: true, projectNumber: true } },
          category: { select: { name: true } },
          _count: { select: { logs: true, comments: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
        createdBy: { select: { displayName: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
        workRequest: {
          select: { id: true, requestNumber: true, title: true },
        },
        category: true,
        logs: {
          include: { user: { select: { displayName: true } } },
          orderBy: { logDate: 'desc' },
        },
        comments: {
          include: { user: { select: { displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    id: string,
    data: Partial<CreateTaskDto> & { status?: TaskStatus },
    userId: string,
  ) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const updateData: any = { ...data };

    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    // Handle status change
    if (data.status && data.status !== existing.status) {
      if (data.status === TaskStatus.AFGEWERKT) {
        updateData.completedAt = new Date();

        // Also complete linked work request
        if (existing.workRequestId) {
          await this.prisma.workRequest.update({
            where: { id: existing.workRequestId },
            data: { status: WorkRequestStatus.AFGEWERKT, resolvedAt: new Date() },
          });
        }
      }

      // Notify relevant users
      if (existing.assignedToId && existing.assignedToId !== userId) {
        await this.notificationsService.create({
          userId: existing.assignedToId,
          type: NotificationType.TASK_STATUS_CHANGED,
          title: 'Taakstatus gewijzigd',
          message: `Taak "${existing.title}" is nu: ${data.status}`,
          entityType: 'Task',
          entityId: id,
        });
      }
    }

    // Handle reassignment
    if (
      data.assignedToId &&
      data.assignedToId !== existing.assignedToId
    ) {
      await this.notificationsService.create({
        userId: data.assignedToId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Taak aan jou toegewezen',
        message: `Je bent toegewezen aan taak "${existing.title}"`,
        entityType: 'Task',
        entityId: id,
      });
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { displayName: true } },
        project: { select: { name: true } },
      },
    });
  }

  async addLog(taskId: string, userId: string, dto: CreateTaskLogDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskLog.create({
      data: {
        taskId,
        userId,
        description: dto.description,
        hoursWorked: dto.hoursWorked,
      },
      include: {
        user: { select: { displayName: true } },
      },
    });
  }

  private async generateTaskNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.task.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `T-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
