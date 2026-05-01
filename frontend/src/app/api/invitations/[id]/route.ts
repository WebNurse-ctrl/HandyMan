import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INVITE_ROLES, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, INVITE_ROLES);
    if (!auth.ok) return auth.response;

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: params.id },
    });
    if (!invitation) {
      return NextResponse.json(
        { message: 'Uitnodiging niet gevonden' },
        { status: 404 },
      );
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { message: 'Uitnodiging is al geaccepteerd en kan niet meer worden ingetrokken.' },
        { status: 409 },
      );
    }

    await prisma.userInvitation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Invitation DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
