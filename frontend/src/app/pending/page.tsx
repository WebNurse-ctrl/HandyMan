'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function PendingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (user && user.status === 'APPROVED') {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-lg px-4">
        <div className="card text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-100 shadow-sm">
            <svg
              className="h-8 w-8 text-warning-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Aanmelding wacht op goedkeuring
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Hallo <span className="font-semibold">{user.displayName}</span>,
            <br />
            bedankt voor je aanmelding bij HandyMan. Een administrator moet je
            aanmelding nog goedkeuren voor je toegang krijgt tot de
            applicatie.
          </p>

          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-left text-xs text-gray-600">
            <p className="font-medium text-gray-700">Wat nu?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Je ontvangt een e-mail op <strong>{user.email}</strong> zodra
                je aanmelding is goedgekeurd.
              </li>
              <li>
                Na goedkeuring kan je deze pagina vernieuwen om toegang te
                krijgen.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary gap-2"
            >
              {refreshing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Controleren...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Opnieuw controleren
                </>
              )}
            </button>
            <button onClick={logout} className="btn-ghost gap-2">
              Uitloggen
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          HandyMan v1.2 &middot; Facility Management
        </p>
      </div>
    </div>
  );
}
