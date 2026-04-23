'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import DataTable from '@/components/ui/DataTable';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { User, PaginatedResponse } from '@/types';

const roleLabels: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
  ADMIN: 'Administrator',
};

export default function UsersTab() {
  const queryClient = useQueryClient();
  const [page] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', page],
    queryFn: () => apiGet('/api/users', { page, limit: 50 }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiPatch(`/api/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rol succesvol bijgewerkt');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon rol niet bijwerken');
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Gebruiker verwijderd');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon gebruiker niet verwijderen');
    },
  });

  const handleDelete = (user: User) => {
    if (
      confirm(
        `Weet je zeker dat je ${user.displayName} wilt verwijderen? Deze gebruiker wordt gedeactiveerd.`,
      )
    ) {
      deleteUser.mutate(user.id);
    }
  };

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
          onChange={(e) => updateRole.mutate({ id: item.id, role: e.target.value })}
          disabled={updateRole.isPending}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
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
    {
      key: 'actions',
      label: '',
      render: (item: User) => (
        <button
          onClick={() => handleDelete(item)}
          disabled={deleteUser.isPending}
          className="rounded-lg px-2 py-1 text-sm font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50"
          title="Gebruiker verwijderen"
        >
          Verwijder
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.data || []}
      isLoading={isLoading}
      emptyMessage="Geen gebruikers gevonden"
    />
  );
}
