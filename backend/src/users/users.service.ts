import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserRole } from '@prisma/client';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'displayName', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          displayName: true,
          department: true,
          jobTitle: true,
          role: true,
          avatarUrl: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        department: true,
        jobTitle: true,
        phone: true,
        role: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findTechnicalStaff() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.TECHNISCHE_DIENST, UserRole.FACILITAIR_MANAGER] },
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        department: true,
        role: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async updateRole(id: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}
