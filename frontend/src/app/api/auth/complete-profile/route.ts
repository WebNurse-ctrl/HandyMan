import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user } = auth.ctx;

    const body = await request.json();
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const jobTitle = typeof body?.jobTitle === 'string' ? body.jobTitle.trim() : '';
    const department = typeof body?.department === 'string' ? body.department.trim() : '';

    if (!firstName || !lastName) {
      return NextResponse.json(
        { message: 'Voornaam en familienaam zijn verplicht' },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phone: phone || null,
        jobTitle: jobTitle || null,
        department: department || null,
        profileCompleted: true,
      },
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
        profileCompleted: true,
        scopeCampusId: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Complete profile error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
