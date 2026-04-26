'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import FilterChips from '@/components/ui/FilterChips';
import { apiGet } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { WorkRequest, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function WorkRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
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
