import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PurchaseStatus,
  PurchaseType,
  UserRole,
  NotificationType,
} from '@prisma/client';
import { CreatePurchaseDto, ApprovePurchaseDto } from './dto/create-purchase.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class PurchasesService {
  // Configurable thresholds (could be stored in SystemConfig)
  private readonly SMALL_PURCHASE_LIMIT = 500;
  private readonly DEPT_HEAD_LIMIT = 5000;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePurchaseDto) {
    const purchaseNumber = await this.generatePurchaseNumber();

    // Determine type based on estimated cost
    const type =
      dto.estimatedCost <= this.SMALL_PURCHASE_LIMIT
        ? PurchaseType.KLEIN
        : PurchaseType.GROOT;

    // Small purchases are auto-approved; large ones need approval flow
    const status =
      type === PurchaseType.KLEIN
        ? PurchaseStatus.GOEDGEKEURD
        : PurchaseStatus.WACHT_OP_GOEDKEURING;

    const purchase = await this.prisma.purchaseRequest.create({
      data: {
        purchaseNumber,
        title: dto.title,
        description: dto.description,
        requestedById: userId,
        workRequestId: dto.workRequestId,
        taskId: dto.taskId,
        projectId: dto.projectId,
        estimatedCost: dto.estimatedCost,
        supplier: dto.supplier,
        type,
        status,
      },
      include: {
        requestedBy: { select: { displayName: true } },
      },
    });

    // Notify approvers for large purchases
    if (type === PurchaseType.GROOT) {
      const approvers = await this.prisma.user.findMany({
        where: {
          role: UserRole.DIENSTHOOFD,
          isActive: true,
        },
      });

      for (const approver of approvers) {
        await this.notificationsService.create({
          userId: approver.id,
          type: NotificationType.PURCHASE_APPROVAL_NEEDED,
          title: 'Aankoopaanvraag wacht op goedkeuring',
          message: `Nieuwe aankoopvraag: "${purchase.title}" - EUR ${dto.estimatedCost}`,
          entityType: 'PurchaseRequest',
          entityId: purchase.id,
        });
      }
    }

    // Update project budget if linked
    if (dto.projectId) {
      await this.updateProjectBudget(dto.projectId);
    }

    return purchase;
  }

  async findAll(
    query: PaginationDto & { status?: PurchaseStatus; projectId?: string },
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      projectId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          requestedBy: { select: { displayName: true } },
          project: { select: { name: true, projectNumber: true } },
          task: { select: { title: true, taskNumber: true } },
          _count: { select: { approvals: true } },
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const purchase = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, displayName: true, email: true },
        },
        workRequest: {
          select: { id: true, requestNumber: true, title: true },
        },
        task: { select: { id: true, taskNumber: true, title: true } },
        project: { select: { id: true, projectNumber: true, name: true } },
        approvals: {
          include: {
            approver: { select: { displayName: true, role: true } },
          },
          orderBy: { approvedAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase request not found');
    }

    return purchase;
  }

  async approve(id: string, approverId: string, dto: ApprovePurchaseDto) {
    const purchase = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: { approvals: true },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase request not found');
    }

    if (purchase.status !== PurchaseStatus.WACHT_OP_GOEDKEURING &&
        purchase.status !== PurchaseStatus.GOEDGEKEURD_DIENSTHOOFD) {
      throw new BadRequestException('Purchase request is not awaiting approval');
    }

    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    // Record approval
    await this.prisma.purchaseApproval.create({
      data: {
        purchaseId: id,
        approverId,
        approved: dto.approved,
        comment: dto.comment,
      },
    });

    let newStatus: PurchaseStatus;

    if (!dto.approved) {
      newStatus = PurchaseStatus.AFGEWEZEN;

      await this.notificationsService.create({
        userId: purchase.requestedById,
        type: NotificationType.PURCHASE_REJECTED,
        title: 'Aankoopaanvraag afgewezen',
        message: `Aanvraag "${purchase.title}" is afgewezen${dto.comment ? ': ' + dto.comment : ''}`,
        entityType: 'PurchaseRequest',
        entityId: id,
      });
    } else if (approver.role === UserRole.DIENSTHOOFD) {
      // Diensthoofd approved - check if facility manager approval needed
      if (Number(purchase.estimatedCost) > this.DEPT_HEAD_LIMIT) {
        newStatus = PurchaseStatus.GOEDGEKEURD_DIENSTHOOFD;

        // Notify facility managers
        const facilityManagers = await this.prisma.user.findMany({
          where: { role: UserRole.FACILITAIR_MANAGER, isActive: true },
        });

        for (const fm of facilityManagers) {
          await this.notificationsService.create({
            userId: fm.id,
            type: NotificationType.PURCHASE_APPROVAL_NEEDED,
            title: 'Aankoopaanvraag wacht op finale goedkeuring',
            message: `"${purchase.title}" - EUR ${purchase.estimatedCost} (goedgekeurd door diensthoofd)`,
            entityType: 'PurchaseRequest',
            entityId: id,
          });
        }
      } else {
        newStatus = PurchaseStatus.GOEDGEKEURD;
      }
    } else if (approver.role === UserRole.FACILITAIR_MANAGER) {
      newStatus = PurchaseStatus.GOEDGEKEURD;
    } else {
      newStatus = purchase.status;
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    if (newStatus === PurchaseStatus.GOEDGEKEURD) {
      await this.notificationsService.create({
        userId: purchase.requestedById,
        type: NotificationType.PURCHASE_APPROVED,
        title: 'Aankoopaanvraag goedgekeurd',
        message: `Aanvraag "${purchase.title}" is goedgekeurd`,
        entityType: 'PurchaseRequest',
        entityId: id,
      });
    }

    return updated;
  }

  async markOrdered(id: string, orderReference: string) {
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseStatus.BESTELD,
        orderReference,
        orderedAt: new Date(),
      },
    });
  }

  async markDelivered(id: string, actualCost?: number) {
    const purchase = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: PurchaseStatus.GELEVERD,
        actualCost,
        deliveredAt: new Date(),
      },
    });

    if (purchase.projectId) {
      await this.updateProjectBudget(purchase.projectId);
    }

    return purchase;
  }

  private async updateProjectBudget(projectId: string) {
    const purchases = await this.prisma.purchaseRequest.findMany({
      where: {
        projectId,
        status: {
          in: [
            PurchaseStatus.GOEDGEKEURD,
            PurchaseStatus.BESTELD,
            PurchaseStatus.GELEVERD,
          ],
        },
      },
    });

    const totalSpent = purchases.reduce((sum, p) => {
      return sum + Number(p.actualCost || p.estimatedCost);
    }, 0);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { budgetSpent: totalSpent },
    });
  }

  private async generatePurchaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `AK-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
