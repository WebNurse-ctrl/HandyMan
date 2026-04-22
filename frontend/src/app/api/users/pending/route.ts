import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const data = await prisma.user.findMany({
    where: { status: 'PENDING', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      department: true,
      jobTitle: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data });
}
