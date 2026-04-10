import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, WorkRequestStatus, NotificationType } from '@prisma/client';
import { CreateWorkRequestDto } from './dto/create-work-request.dto';
import { UpdateWorkRequestDto } from './dto/update-work-request.dto';
import { QueryWorkRequestDto } from './dto/query-work-request.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class WorkRequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateWorkRequestDto) {
    const requestNumber = await this.generateRequestNumber();

    const workRequest = await this.prisma.workRequest.create({
      data: {
        requestNumber,
        title: dto.title,
        description: dto.description,
        requestedById: userId,
        campusId: dto.campusId,
        locationId: dto.locationId,
        categoryId: dto.categoryId,
        priority: dto.priority,
      },
      include: {
        requestedBy: { select: { displayName: true, email: true } },
        campus: { select: { name: true } },
        location: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    // Notify technical staff about new request
    const techStaff = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.TECHNISCHE_DIENST, UserRole.FACILITAIR_MANAGER] },
        isActive: true,
      },
    });

    for (const staff of techStaff) {
      await this.notificationsService.create({
        userId: staff.id,
        type: NotificationType.WORK_REQUEST_CREATED,
        title: 'Nieuwe werkaanvraag',
        message: `${workRequest.requestedBy.displayName} heeft aanvraag "${workRequest.title}" ingediend`,
        entityType: 'WorkRequest',
        entityId: workRequest.id,
      });
    }

    return workRequest;
  }

  async findAll(
    query: QueryWorkRequestDto,
    userId?: string,
    userRole?: UserRole,
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      campusId,
      categoryId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Regular employees only see their own requests
    if (userRole === UserRole.MEDEWERKER) {
      where.requestedById = userId;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (campusId) where.campusId = campusId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.workRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          requestedBy: { select: { displayName: true, email: true } },
          campus: { select: { name: true } },
          location: { select: { name: true } },
          category: { select: { name: true } },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      this.prisma.workRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const workRequest = await this.prisma.workRequest.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, displayName: true, email: true, department: true },
        },
        campus: true,
        location: true,
        category: true,
        comments: {
          include: { user: { select: { displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attachments: true,
        tasks: {
          select: { id: true, taskNumber: true, title: true, status: true },
        },
        bundle: { include: { requests: { select: { id: true, title: true } } } },
      },
    });

    if (!workRequest) {
      throw new NotFoundException('Work request not found');
    }

    return workRequest;
  }

  async update(id: string, dto: UpdateWorkRequestDto, userId: string) {
    const existing = await this.prisma.workRequest.findUnique({
      where: { id },
      include: { requestedBy: true },
    });

    if (!existing) {
      throw new NotFoundException('Work request not found');
    }

    const data: any = { ...dto };

    // Track status changes
    if (dto.status && dto.status !== existing.status) {
      if (dto.status === WorkRequestStatus.AFGEWERKT) {
        data.resolvedAt = new Date();
      }

      // Notify the requester of status change
      await this.notificationsService.create({
        userId: existing.requestedById,
        type: NotificationType.WORK_REQUEST_STATUS_CHANGED,
        title: 'Status update werkaanvraag',
        message: `Aanvraag "${existing.title}" is nu: ${dto.status}`,
        entityType: 'WorkRequest',
        entityId: id,
      });
    }

    return this.prisma.workRequest.update({
      where: { id },
      data,
      include: {
        requestedBy: { select: { displayName: true, email: true } },
        campus: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
  }

  async convertToTask(id: string, userId: string) {
    const workRequest = await this.prisma.workRequest.findUnique({
      where: { id },
    });

    if (!workRequest) {
      throw new NotFoundException('Work request not found');
    }

    const taskNumber = await this.generateTaskNumber();

    const task = await this.prisma.task.create({
      data: {
        taskNumber,
        title: workRequest.title,
        description: workRequest.description,
        createdById: userId,
        workRequestId: id,
        categoryId: workRequest.categoryId,
        priority: workRequest.priority,
      },
    });

    await this.prisma.workRequest.update({
      where: { id },
      data: { status: WorkRequestStatus.IN_BEHANDELING },
    });

    return task;
  }

  async reject(id: string, reason: string, userId: string) {
    const existing = await this.prisma.workRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Work request not found');
    }

    const updated = await this.prisma.workRequest.update({
      where: { id },
      data: {
        status: WorkRequestStatus.GEWEIGERD,
        rejectionReason: reason,
      },
    });

    await this.notificationsService.create({
      userId: existing.requestedById,
      type: NotificationType.WORK_REQUEST_STATUS_CHANGED,
      title: 'Werkaanvraag geweigerd',
      message: `Aanvraag "${existing.title}" is geweigerd: ${reason}`,
      entityType: 'WorkRequest',
      entityId: id,
    });

    return updated;
  }

  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.workRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `WR-${year}-${String(count + 1).padStart(4, '0')}`;
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
