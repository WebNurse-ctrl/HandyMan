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
import { UserRole, ProjectStatus } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles(
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Create a new project' })
  create(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  findAll(
    @Query() query: PaginationDto & { status?: ProjectStatus; campusId?: string },
  ) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findById(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id') id: string,
    @Body()
    dto: Partial<CreateProjectDto> & {
      status?: ProjectStatus;
      budgetApproved?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.update(id, dto, user.id);
  }
}
