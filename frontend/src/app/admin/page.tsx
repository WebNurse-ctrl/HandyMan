'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { User, PaginatedResponse } from '@/types';

const roleLabels: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
  ADMIN: 'Administrator',
};

const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Wacht op goedkeuring',
    className: 'bg-warning-100 text-warning-700',
  },
  APPROVED: {
    label: 'Goedgekeurd',
    className: 'bg-success-100 text-success-700',
  },
  REJECTED: {
    label: 'Geweigerd',
    className: 'bg-danger-100 text-danger-700',
  },
};

type Tab = 'pending' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('pending');

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const pendingQuery = useQuery<{ data: User[] }>({
    queryKey: ['users', 'pending'],
    queryFn: () => apiGet('/api/users/pending'),
    enabled: !!user && user.role === 'ADMIN',
  });

  const usersQuery = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page],
    queryFn: () => apiGet('/api/users', { page, limit: 20 }),
    enabled: !!user && user.role === 'ADMIN',
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiPatch(`/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol bijgewerkt');
    },
    onError: () => toast.error('Kon rol niet bijwerken'),
  });

  const approveUser = useMutation({
    mutationFn: (id: string) => apiPost(`/api/users/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Gebruiker goedgekeurd en geïnformeerd via e-mail');
    },
    onError: () => toast.error('Goedkeuring mislukt'),
  });

  if (isLoading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </AppLayout>
    );
  }

  if (user.role !== 'ADMIN') return null;

  const pendingUsers = pendingQuery.data?.data ?? [];
  const pendingCount = pendingUsers.length;

  const usersColumns = [
    {
      key: 'displayName',
      label: 'Naam',
      render: (item: User) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            {item.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{item.displayName}</p>
            <p className="text-xs text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Afdeling',
      render: (item: User) => (
        <span className="text-gray-600">{item.department || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: User) => {
        const meta = statusLabels[item.status] || statusLabels.APPROVED;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'role',
      label: 'Rol',
      render: (item: User) => (
        <select
          value={item.role}
          disabled={item.status !== 'APPROVED' || updateRole.isPending}
          onChange={(e) =>
            updateRole.mutate({ id: item.id, role: e.target.value })
          }
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50"
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Laatst actief',
      render: (item: User) => (
        <span className="text-sm text-gray-500">
          {item.lastLoginAt
            ? new Date(item.lastLoginAt).toLocaleDateString('nl-BE')
            : 'Nooit'}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gebruikersbeheer en rolletoewijzingen
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setTab('pending')}
              className={
                tab === 'pending'
                  ? 'flex items-center gap-2 border-b-2 border-primary-600 pb-3 text-sm font-semibold text-primary-600'
                  : 'flex items-center gap-2 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700'
              }
            >
              Nieuwe aanmeldingen
              {pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning-500 px-1.5 text-[11px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('users')}
              className={
                tab === 'users'
                  ? 'border-b-2 border-primary-600 pb-3 text-sm font-semibold text-primary-600'
                  : 'pb-3 text-sm font-medium text-gray-500 hover:text-gray-700'
              }
            >
              Alle gebruikers
            </button>
          </nav>
        </div>

        {tab === 'pending' && (
          <div className="space-y-3">
            {pendingQuery.isLoading ? (
              <div className="card flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="card text-center text-sm text-gray-500">
                Er zijn geen aanmeldingen die wachten op goedkeuring.
              </div>
            ) : (
              pendingUsers.map((pending) => (
                <div
                  key={pending.id}
                  className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 text-sm font-semibold text-warning-700">
                      {pending.displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {pending.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{pending.email}</p>
                      {(pending.department || pending.jobTitle) && (
                        <p className="text-xs text-gray-400">
                          {[pending.jobTitle, pending.department]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-gray-400 sm:inline">
                      {pending.createdAt
                        ? `Aangemeld op ${new Date(pending.createdAt).toLocaleDateString('nl-BE')}`
                        : null}
                    </span>
                    <button
                      onClick={() => approveUser.mutate(pending.id)}
                      disabled={approveUser.isPending}
                      className="btn-primary"
                    >
                      {approveUser.isPending &&
                      approveUser.variables === pending.id
                        ? 'Goedkeuren...'
                        : 'Goedkeuren'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'users' && (
          <DataTable
            columns={usersColumns}
            data={usersQuery.data?.data || []}
            isLoading={usersQuery.isLoading}
            emptyMessage="Geen gebruikers gevonden"
          />
        )}
      </div>
    </AppLayout>
  );
}
