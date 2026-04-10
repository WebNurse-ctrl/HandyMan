import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @Get('technical-staff')
  @ApiOperation({ summary: 'List technical service staff' })
  findTechnicalStaff() {
    return this.usersService.findTechnicalStaff();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.FACILITAIR_MANAGER)
  @ApiOperation({ summary: 'Update user role' })
  updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.updateRole(id, role);
  }
}
