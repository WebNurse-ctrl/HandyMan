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
import { UserRole, PurchaseStatus } from '@prisma/client';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, ApprovePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Create a purchase request' })
  create(@CurrentUser() user: any, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase requests' })
  findAll(
    @Query() query: PaginationDto & { status?: PurchaseStatus; projectId?: string },
  ) {
    return this.purchasesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase request by ID' })
  findById(@Param('id') id: string) {
    return this.purchasesService.findById(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.DIENSTHOOFD, UserRole.FACILITAIR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a purchase request' })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApprovePurchaseDto,
  ) {
    return this.purchasesService.approve(id, user.id, dto);
  }

  @Patch(':id/ordered')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Mark purchase as ordered' })
  markOrdered(
    @Param('id') id: string,
    @Body('orderReference') orderReference: string,
  ) {
    return this.purchasesService.markOrdered(id, orderReference);
  }

  @Patch(':id/delivered')
  @Roles(
    UserRole.TECHNISCHE_DIENST,
    UserRole.DIENSTHOOFD,
    UserRole.FACILITAIR_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({ summary: 'Mark purchase as delivered' })
  markDelivered(
    @Param('id') id: string,
    @Body('actualCost') actualCost?: number,
  ) {
    return this.purchasesService.markDelivered(id, actualCost);
  }
}
