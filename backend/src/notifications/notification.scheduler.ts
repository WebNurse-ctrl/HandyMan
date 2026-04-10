import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDeadlines() {
    this.logger.log('Checking task deadlines...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Tasks due within 3 days
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        status: { in: ['OPEN', 'IN_UITVOERING'] },
        dueDate: {
          gte: new Date(),
          lte: threeDaysFromNow,
        },
        assignedToId: { not: null },
      },
      include: {
        assignedTo: { select: { id: true, displayName: true } },
      },
    });

    for (const task of upcomingTasks) {
      if (!task.assignedToId) continue;

      const daysUntilDue = Math.ceil(
        (task.dueDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      await this.notificationsService.create({
        userId: task.assignedToId,
        type: NotificationType.TASK_DEADLINE_APPROACHING,
        title: 'Deadline nadert',
        message: `Taak "${task.title}" is over ${daysUntilDue} dag${daysUntilDue !== 1 ? 'en' : ''} verlopen`,
        entityType: 'Task',
        entityId: task.id,
      });
    }

    this.logger.log(
      `Sent ${upcomingTasks.length} deadline reminders`,
    );
  }
}
