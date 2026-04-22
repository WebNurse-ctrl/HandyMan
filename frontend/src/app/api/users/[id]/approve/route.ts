import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-server';
import { sendApprovalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  if (target.status === 'APPROVED') {
    return NextResponse.json({
      id: target.id,
      status: target.status,
      alreadyApproved: true,
    });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: auth.user.id,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: updated.id,
      type: 'USER_APPROVED',
      title: 'Je aanmelding is goedgekeurd',
      message:
        'Welkom bij HandyMan! Je kan de applicatie nu openen en aan de slag.',
      entityType: 'user',
      entityId: updated.id,
    },
  });

  // Mark existing "approval needed" notifications for this user as read on all
  // admins so they disappear from dashboards after approval.
  await prisma.notification.updateMany({
    where: {
      type: 'USER_APPROVAL_NEEDED',
      entityType: 'user',
      entityId: updated.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  const emailResult = await sendApprovalEmail(updated.email, updated.displayName);

  return NextResponse.json({ ...updated, email: emailResult });
}
