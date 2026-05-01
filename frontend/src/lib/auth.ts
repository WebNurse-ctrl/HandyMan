import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { User, UserRole } from '@prisma/client';

const SESSION_TTL = '30d';
const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET ontbreekt of is te kort (minstens 32 tekens). Stel deze env-var in.',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user && user.isActive ? user : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── RBAC + scope helpers ─────────────────────────────────────────────────────

export type RoleSet = readonly UserRole[];

export const ALL_ROLES: RoleSet = [
  'MEDEWERKER',
  'TECHNISCHE_DIENST',
  'DIENSTHOOFD',
  'FACILITAIR_MANAGER',
  'ADMIN',
];

export const ADMIN_ROLES: RoleSet = ['ADMIN', 'FACILITAIR_MANAGER'];
export const INVITE_ROLES: RoleSet = ['ADMIN', 'FACILITAIR_MANAGER', 'DIENSTHOOFD'];
export const PICKUP_ROLES: RoleSet = [
  'TECHNISCHE_DIENST',
  'DIENSTHOOFD',
  'ADMIN',
  'FACILITAIR_MANAGER',
];

export interface AuthContext {
  user: User;
  isAdmin: boolean;
  isMedewerker: boolean;
  scopeCampusId: string | null;
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = 'Geen toegang') {
  return NextResponse.json({ message }, { status: 403 });
}

export async function requireAuth(request: NextRequest): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }
> {
  const user = await getUserFromRequest(request);
  if (!user) return { ok: false, response: unauthorized() };
  return {
    ok: true,
    ctx: {
      user,
      isAdmin: ADMIN_ROLES.includes(user.role),
      isMedewerker: user.role === 'MEDEWERKER',
      scopeCampusId: user.scopeCampusId ?? null,
    },
  };
}

export async function requireRole(
  request: NextRequest,
  roles: RoleSet,
): Promise<{ ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (!roles.includes(auth.ctx.user.role)) {
    return { ok: false, response: forbidden() };
  }
  return auth;
}
