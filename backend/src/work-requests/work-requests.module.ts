import { Module } from '@nestjs/common';
import { WorkRequestsController } from './work-requests.controller';
import { WorkRequestsService } from './work-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WorkRequestsController],
  providers: [WorkRequestsService],
  exports: [WorkRequestsService],
})
export class WorkRequestsModule {}
