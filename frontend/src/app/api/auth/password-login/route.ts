import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSessionToken, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { message: 'E-mail en wachtwoord zijn verplicht' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !user.passwordHash) {
      // Geen lekken: zelfde melding voor niet-bestaande / inactieve / SSO-only.
      return NextResponse.json(
        { message: 'Onjuiste e-mail of wachtwoord' },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { message: 'Onjuiste e-mail of wachtwoord' },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signSessionToken(user.id);
    return NextResponse.json({
      token,
      profileCompleted: user.profileCompleted,
    });
  } catch (error) {
    console.error('Password login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
