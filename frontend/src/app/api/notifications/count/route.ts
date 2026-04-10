import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json(0);
    }

    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json(count);
  } catch (error) {
    console.error('Notification count error:', error);
    return NextResponse.json(0);
  }
}
