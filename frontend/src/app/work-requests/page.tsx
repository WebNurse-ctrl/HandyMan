'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { HandHelping, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import FilterChips from '@/components/ui/FilterChips';
import { apiGet, apiPatch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { WorkRequest, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const PICKUP_ROLES = ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'ADMIN', 'FACILITAIR_MANAGER'];

export default function WorkRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<WorkRequest>>({
    queryKey: ['work-requests', page, statusFilter],
    queryFn: () =>
      apiGet('/api/work-requests', {
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const pickupMutation = useMutation({
    mutationFn: (workRequestId: string) =>
      apiPatch<WorkRequest>(`/api/work-requests/${workRequestId}`, {
        assignedToId: user?.id,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['work-request', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Aanvraag opgepikt');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Oppikken mislukt'),
  });

  const canPickup = !!user?.role && PICKUP_ROLES.includes(user.role);

  const columns = [
    {
      key: 'requestNumber',
      label: 'Nummer',
      render: (item: WorkRequest) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.requestNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Titel',
      render: (item: WorkRequest) => (
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.campus?.name}</p>
        </div>
      ),
    },
    {
      key: 'requestedBy',
      label: 'Aanvrager',
      render: (item: WorkRequest) => (
        <span className="text-muted-foreground">
          {item.requestedBy?.displayName}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Toegewezen',
      render: (item: WorkRequest) =>
        item.assignedTo ? (
          <span className="text-foreground">{item.assignedTo.displayName}</span>
        ) : (
          <span className="text-xs italic text-muted-foreground">Niet opgepikt</span>
        ),
    },
    {
      key: 'priority',
      label: 'Prioriteit',
      render: (item: WorkRequest) => <PriorityIndicator priority={item.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: WorkRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      label: 'Datum',
      render: (item: WorkRequest) => (
        <span className="text-muted-foreground">{formatDateTime(item.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: WorkRequest) => {
        const showPickup =
          canPickup && !item.assignedTo && item.status === 'INGEDIEND';
        if (!showPickup) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pickupMutation.mutate(item.id);
            }}
            disabled={pickupMutation.isPending}
            className="btn-secondary h-7 px-2 text-xs"
          >
            <HandHelping className="h-3.5 w-3.5" />
            Oppikken
          </button>
        );
      },
    },
  ];

  const statuses = [
    { value: '', label: 'Alle' },
    { value: 'INGEDIEND', label: 'Ingediend' },
    { value: 'IN_BEHANDELING', label: 'In behandeling' },
    { value: 'AFGEWERKT', label: 'Afgewerkt' },
    { value: 'GEWEIGERD', label: 'Geweigerd' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Werkaanvragen"
          description={
            user?.role === 'MEDEWERKER'
              ? 'Dien een aanvraag in of volg je bestaande aanvragen op'
              : 'Beheer en verwerk alle werkaanvragen'
          }
          actions={
            <button
              type="button"
              onClick={() => router.push('/work-requests/new')}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              Nieuwe aanvraag
            </button>
          }
        />

        <FilterChips
          options={statuses}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(item) => router.push(`/work-requests/${item.id}`)}
          emptyMessage="Geen werkaanvragen gevonden"
        />

        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </AppLayout>
  );
}
