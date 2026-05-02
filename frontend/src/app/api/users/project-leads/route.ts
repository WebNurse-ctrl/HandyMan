import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, TASK_MANAGE_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * v1.7 — Lijst van kandidaten voor:
 *   • projectverantwoordelijke
 *   • taak-toewijzing
 * Iedereen behalve MEDEWERKER (= TASK_MANAGE_ROLES). Open voor alle niet-MEDEWERKER
 * gebruikers zodat de selector op /projects/new en in taak-modals werkt.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.ctx.isMedewerker) {
    return NextResponse.json([], { status: 200 });
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [...TASK_MANAGE_ROLES] },
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      department: true,
      avatarUrl: true,
    },
    orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
  });

  return NextResponse.json(users);
}
