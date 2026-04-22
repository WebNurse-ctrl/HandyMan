import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const authed = await requireAuth(request);

    await prisma.notification.updateMany({
      where: { userId: authed.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Mark all read error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
