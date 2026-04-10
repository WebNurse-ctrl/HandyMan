import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('workload')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Get workload per user' })
  getWorkload() {
    return this.dashboardService.getWorkloadPerUser();
  }

  @Get('campus-stats')
  @ApiOperation({ summary: 'Get requests by campus' })
  getCampusStats() {
    return this.dashboardService.getRequestsByCampus();
  }

  @Get('resolution-time')
  @ApiOperation({ summary: 'Get average resolution time' })
  getResolutionTime() {
    return this.dashboardService.getAverageResolutionTime();
  }

  @Get('budget-summary')
  @Roles(
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Get project budget summary' })
  getBudgetSummary() {
    return this.dashboardService.getProjectBudgetSummary();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get monthly trends' })
  getTrends(@Query('months') months?: number) {
    return this.dashboardService.getTrends(months || 6);
  }
}
