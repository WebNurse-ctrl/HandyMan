'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Wrench } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { apiPost } from '@/lib/api';
import { User } from '@/types';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, setAuth, token } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.profileCompleted) {
      router.replace('/work-requests');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setJobTitle(user.jobTitle ?? '');
      setDepartment(user.department ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Voornaam en familienaam zijn verplicht.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await apiPost<User>('/api/auth/complete-profile', {
        firstName,
        lastName,
        phone,
        jobTitle,
        department,
      });
      if (token) setAuth(token, updated);
      toast.success('Profiel opgeslagen');
      router.push('/work-requests');
    } catch {
      toast.error('Profiel opslaan mislukt');
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgb(var(--primary)) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg">
        <div className="card-elevated">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 100%)',
            }}
          >
            <Wrench className="h-7 w-7 text-white" strokeWidth={2.25} />
          </div>

          <h1 className="text-center text-xl font-bold tracking-tight text-foreground">
            Vervolledig je profiel
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Welkom! Vul je gegevens aan voor je verder gaat.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="label">
                  Voornaam *
                </label>
                <input
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input mt-1"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Familienaam *
                </label>
                <input
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input mt-1"
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Telefoon
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input mt-1"
                placeholder="bv. +32 3 234 56 78"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="jobTitle" className="label">
                  Functie
                </label>
                <input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="input mt-1"
                />
              </div>
              <div>
                <label htmlFor="department" className="label">
                  Afdeling
                </label>
                <input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input mt-1"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary h-11 w-full"
            >
              {submitting ? 'Opslaan...' : 'Profiel opslaan en doorgaan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
