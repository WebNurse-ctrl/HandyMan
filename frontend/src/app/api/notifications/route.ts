import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireAuth(request);

    const notifications = await prisma.notification.findMany({
      where: { userId: authed.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Notifications error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
