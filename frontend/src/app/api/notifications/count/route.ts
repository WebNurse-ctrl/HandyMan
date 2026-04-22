import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireAuth(request);

    const count = await prisma.notification.count({
      where: { userId: authed.id, isRead: false },
    });

    return NextResponse.json(count);
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Notification count error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
