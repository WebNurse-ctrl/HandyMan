import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        jobTitle: true,
        avatarUrl: true,
        profileCompleted: true,
        isActive: true,
        scopeCampuses: {
          select: { campus: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { scopeCampuses, ...rest } = user;
    return NextResponse.json({
      ...rest,
      scopeCampuses: scopeCampuses.map((s) => s.campus),
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
