'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { User, PaginatedResponse } from '@/types';

const roleLabels: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
  ADMIN: 'Administrator',
};

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [page] = useState(1);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const { data, isLoading: usersLoading } = useQuery<PaginatedResponse<User>>({
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

  const columns = [
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
      key: 'role',
      label: 'Rol',
      render: (item: User) => (
        <select
          value={item.role}
          disabled={updateRole.isPending}
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

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={usersLoading}
          emptyMessage="Geen gebruikers gevonden"
        />
      </div>
    </AppLayout>
  );
}
