import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { WorkRequestsService } from './work-requests.service';
import { CreateWorkRequestDto } from './dto/create-work-request.dto';
import { UpdateWorkRequestDto } from './dto/update-work-request.dto';
import { QueryWorkRequestDto } from './dto/query-work-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('work-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-requests')
export class WorkRequestsController {
  constructor(private workRequestsService: WorkRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new work request' })
  create(@CurrentUser() user: any, @Body() dto: CreateWorkRequestDto) {
    return this.workRequestsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List work requests' })
  findAll(@CurrentUser() user: any, @Query() query: QueryWorkRequestDto) {
    return this.workRequestsService.findAll(query, user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work request by ID' })
  findById(@Param('id') id: string) {
    return this.workRequestsService.findById(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Update work request (triage)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.workRequestsService.update(id, dto, user.id);
  }

  @Post(':id/convert-to-task')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Convert work request to task' })
  convertToTask(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workRequestsService.convertToTask(id, user.id);
  }

  @Post(':id/reject')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Reject work request' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.workRequestsService.reject(id, reason, user.id);
  }
}
