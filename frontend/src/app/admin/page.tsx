'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import { apiGet, apiPatch } from '@/lib/api';
import { User, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const roleLabels: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
  ADMIN: 'Administrator',
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const canManage = useAuth((s) => s.hasRole('FACILITAIR_MANAGER', 'ADMIN'));

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page],
    queryFn: () => apiGet('/api/users', { page, limit: 20 }),
    enabled: canManage,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiPatch(`/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol succesvol bijgewerkt');
    },
    onError: () => {
      toast.error('Kon rol niet bijwerken');
    },
  });

  if (!canManage) {
    return (
      <AppLayout>
        <div className="card text-center">
          <h1 className="text-lg font-semibold text-gray-900">Geen toegang</h1>
          <p className="mt-2 text-sm text-gray-500">
            Je hebt geen rechten om gebruikersbeheer te bekijken.
          </p>
        </div>
      </AppLayout>
    );
  }

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
          onChange={(e) =>
            updateRole.mutate({ id: item.id, role: e.target.value })
          }
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            <button className="border-b-2 border-primary-600 pb-3 text-sm font-semibold text-primary-600">
              Gebruikers
            </button>
            <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              Campussen
            </button>
            <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              Categorieen
            </button>
            <button className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">
              Instellingen
            </button>
          </nav>
        </div>

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="Geen gebruikers gevonden"
        />
      </div>
    </AppLayout>
  );
}
