import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import type { UserRole } from '@/types';

const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const ISSUER = 'handyman';
const AUDIENCE = 'handyman-web';

export interface AuthedUser {
  id: string;
  role: UserRole;
  email: string;
}

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'AUTH_SECRET environment variable is missing or too short (min 32 chars).',
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

export async function signAuthToken(user: AuthedUser): Promise<string> {
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== 'string') return null;
    const role = payload.role as UserRole | undefined;
    const email = payload.email as string | undefined;
    if (!role || !email) return null;
    return { id: payload.sub, role, email };
  } catch (err) {
    if (
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWSInvalid ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWTClaimValidationFailed
    ) {
      return null;
    }
    throw err;
  }
}

function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

export async function getAuthedUser(request: NextRequest): Promise<AuthedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  return verifyAuthToken(token);
}

export class HttpError extends Error {
  constructor(public status: number, public body: string) {
    super(body);
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthedUser> {
  const user = await getAuthedUser(request);
  if (!user) throw new HttpError(401, 'Unauthorized');
  return user;
}

export async function requireRole(
  request: NextRequest,
  ...roles: UserRole[]
): Promise<AuthedUser> {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) {
    throw new HttpError(403, 'Forbidden');
  }
  return user;
}

export function httpErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof HttpError) {
    return NextResponse.json({ message: err.body }, { status: err.status });
  }
  return null;
}
