'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertCircle, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

const errorMessages: Record<string, string> = {
  azure_denied: 'Toegang geweigerd door Microsoft',
  no_code: 'Geen autorisatiecode ontvangen',
  config_missing: 'Azure AD configuratie ontbreekt op de server',
  token_failed: 'Token uitwisseling met Microsoft mislukt',
  token_exception: 'Fout bij verbinden met Microsoft',
  graph_failed: 'Kon gebruikersprofiel niet ophalen',
  graph_exception: 'Fout bij ophalen gebruikersprofiel',
  db_failed: 'Database fout bij aanmaken gebruiker',
  auth_failed: 'Authenticatie mislukt',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const errorCode = searchParams.get('error');
  const errorDetail = searchParams.get('detail');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('handyman_token', token);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => {
          if (user && user.id) {
            setAuth(token, user);
            router.push(user.profileCompleted === false ? '/profile/complete' : '/work-requests');
          }
        })
        .catch(() => {
          localStorage.removeItem('handyman_token');
        });
    }
  }, [searchParams, setAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/work-requests');
    }
  }, [isAuthenticated, router]);

  const handleAzureLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data?.message || 'Inloggen mislukt');
        setSubmitting(false);
        return;
      }
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const me = await meRes.json();
      setAuth(data.token, me);
      router.push(data.profileCompleted ? '/work-requests' : '/profile/complete');
    } catch {
      setPwdError('Inloggen mislukt');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgb(var(--primary)) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgb(var(--accent)) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="card-elevated text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 100%)',
            }}
          >
            <Wrench className="h-8 w-8 text-white" strokeWidth={2.25} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            <span className="text-gradient-brand">HandyMan</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Facility Management Platform
          </p>

          {errorCode && (
            <div className="mt-5 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-destructive">
                  {errorMessages[errorCode] || 'Onbekende fout'}
                </p>
                {errorDetail && (
                  <p className="mt-1 text-xs text-destructive/80 break-all">
                    {errorDetail}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleAzureLogin}
              className="btn-primary h-12 w-full gap-3 text-base"
            >
              <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                <path d="M11 0H0V11H11V0Z" fill="#F25022" />
                <path d="M23 0H12V11H23V0Z" fill="#7FBA00" />
                <path d="M11 12H0V23H11V12Z" fill="#00A4EF" />
                <path d="M23 12H12V23H23V12Z" fill="#FFB900" />
              </svg>
              Inloggen met Microsoft 365
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              of
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-3 text-left">
            <div>
              <label htmlFor="email" className="label">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
              />
            </div>
            {pwdError && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {pwdError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn-secondary h-11 w-full"
            >
              {submitting ? 'Bezig met inloggen...' : 'Inloggen met wachtwoord'}
            </button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Nog geen account? Vraag een uitnodiging aan je beheerder.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          HandyMan v1.6 &middot; Facility Management
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner size={32} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
