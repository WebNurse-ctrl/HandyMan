import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campuses = await prisma.campus.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(campuses);
  } catch (error) {
    console.error('Campuses error:', error);
    return NextResponse.json([]);
  }
}
