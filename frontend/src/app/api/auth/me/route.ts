import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Decode the simple token (userId encoded as base64)
    let userId: string;
    try {
      userId = atob(token);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
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
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
