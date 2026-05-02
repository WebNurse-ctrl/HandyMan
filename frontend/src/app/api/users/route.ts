import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INVITE_ROLES, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawData, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          department: true,
          jobTitle: true,
          role: true,
          avatarUrl: true,
          lastLoginAt: true,
          scopeCampuses: {
            select: { campus: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = rawData.map((u) => ({
      ...u,
      scopeCampuses: u.scopeCampuses.map((s) => s.campus),
    }));

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
