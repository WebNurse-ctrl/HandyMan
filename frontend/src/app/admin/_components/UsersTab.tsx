'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import Avatar from '@/components/ui/Avatar';
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
          <Avatar name={item.displayName} src={item.avatarUrl ?? null} size="md" />
          <div>
            <p className="font-medium text-foreground">{item.displayName}</p>
            <p className="text-xs text-muted-foreground">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Afdeling',
      render: (item: User) => (
        <span className="text-muted-foreground">{item.department || '—'}</span>
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
          className="input h-9 max-w-[210px] py-0 text-sm"
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
        <span className="text-sm text-muted-foreground">
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
          type="button"
          onClick={() => handleDelete(item)}
          disabled={deleteUser.isPending}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          title="Gebruiker verwijderen"
        >
          <Trash2 className="h-3.5 w-3.5" />
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
