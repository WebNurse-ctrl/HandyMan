'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
            router.push('/dashboard');
          }
        })
        .catch(() => {
          localStorage.removeItem('handyman_token');
        });
    }
  }, [searchParams, setAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-4">
        <div className="card text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">HandyMan</h1>
          <p className="mt-2 text-sm text-gray-500">
            Facility Management Platform
          </p>

          {errorCode && (
            <div className="mt-4 rounded-lg bg-danger-50 border border-danger-200 p-4 text-left">
              <p className="text-sm font-medium text-danger-700">
                {errorMessages[errorCode] || 'Onbekende fout'}
              </p>
              {errorDetail && (
                <p className="mt-2 text-xs text-danger-600 break-all">
                  {errorDetail}
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleLogin}
              className="btn-primary w-full gap-3 py-3"
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

          <p className="mt-6 text-xs text-gray-400">
            Gebruik je werkaccount om in te loggen
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          HandyMan v1.0 &middot; Facility Management
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
