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
import { UserRole, TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto, CreateTaskLogDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Create a new task' })
  create(@CurrentUser() user: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks' })
  findAll(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & {
      status?: TaskStatus;
      assignedToId?: string;
      projectId?: string;
    },
  ) {
    return this.tasksService.findAll(query, user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findById(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaskDto> & { status?: TaskStatus },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Post(':id/logs')
  @ApiOperation({ summary: 'Add work log to task' })
  addLog(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTaskLogDto,
  ) {
    return this.tasksService.addLog(id, user.id, dto);
  }
}
