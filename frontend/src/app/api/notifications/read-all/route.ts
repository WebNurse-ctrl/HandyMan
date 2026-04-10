import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
