import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
