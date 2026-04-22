import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  let userId: string;
  try {
    userId = atob(token);
  } catch {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireAdmin(
  request: NextRequest,
): Promise<{ user: User } | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  return { user };
}

export function isAdminIdentity(
  displayName: string | null | undefined,
  email: string | null | undefined,
): boolean {
  const name = (displayName || '').trim().toLowerCase();
  const mail = (email || '').trim().toLowerCase();
  if (name === 'johan beckers') return true;
  if (mail.startsWith('johan.beckers@')) return true;
  return false;
}
