import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { httpErrorResponse, requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const campuses = await prisma.campus.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(campuses);
  } catch (error) {
    const resp = httpErrorResponse(error);
    if (resp) return resp;
    console.error('Campuses error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
