'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Wrench } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

interface LookupResponse {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'already_accepted' | 'no_token' | 'error';
  email?: string;
  inviterName?: string;
  expiresAt?: string;
}

const reasonMessages: Record<string, string> = {
  not_found: 'Deze uitnodigingslink is niet (meer) geldig.',
  expired: 'Deze uitnodiging is verlopen. Vraag om een nieuwe.',
  already_accepted: 'Deze uitnodiging is al geaccepteerd. Log in met je e-mailadres en wachtwoord.',
  no_token: 'Uitnodigingstoken ontbreekt.',
  error: 'Er ging iets mis. Probeer later opnieuw.',
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token as string;
  const { setAuth } = useAuth();

  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: LookupResponse) => setLookup(data))
      .catch(() => setLookup({ valid: false, reason: 'error' }));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Wachtwoord moet minstens 10 tekens lang zijn.');
      return;
    }
    if (password !== confirm) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Activeren mislukt.');
        setSubmitting(false);
        return;
      }
      // Haal /me op met het nieuwe token zodat we user-state kunnen vullen.
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const me = await meRes.json();
      setAuth(data.token, me);
      router.push(data.profileCompleted ? '/work-requests' : '/profile/complete');
    } catch {
      setError('Activeren mislukt. Probeer opnieuw.');
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

      <div className="relative w-full max-w-md">
        <div className="card-elevated">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 100%)',
            }}
          >
            <Wrench className="h-8 w-8 text-white" strokeWidth={2.25} />
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Welkom bij <span className="text-gradient-brand">HandyMan</span>
          </h1>

          {!lookup ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Spinner size={28} />
              <p className="text-sm text-muted-foreground">Uitnodiging controleren...</p>
            </div>
          ) : !lookup.valid ? (
            <div className="mt-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {reasonMessages[lookup.reason ?? 'error']}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Terug naar inloggen
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {lookup.inviterName} heeft je uitgenodigd.
              </p>
              <p className="mt-1 text-center text-sm font-medium text-foreground">
                {lookup.email}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="password" className="label">
                    Kies een wachtwoord
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input mt-1"
                    placeholder="Minstens 10 tekens"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="label">
                    Bevestig wachtwoord
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input mt-1"
                    placeholder="Herhaal wachtwoord"
                  />
                </div>

                {error && (
                  <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary h-11 w-full"
                >
                  {submitting ? (
                    'Account activeren...'
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Account activeren
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          HandyMan &middot; Facility Management
        </p>
      </div>
    </div>
  );
}
