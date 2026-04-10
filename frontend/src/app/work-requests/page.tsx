'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Pagination from '@/components/ui/Pagination';
import { apiGet } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { WorkRequest, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function WorkRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

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
        <span className="font-mono text-xs text-gray-500">
          {item.requestNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Titel',
      render: (item: WorkRequest) => (
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-500">{item.campus?.name}</p>
        </div>
      ),
    },
    {
      key: 'requestedBy',
      label: 'Aanvrager',
      render: (item: WorkRequest) => (
        <span className="text-gray-600">
          {item.requestedBy?.displayName}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Prioriteit',
      render: (item: WorkRequest) => (
        <PriorityIndicator priority={item.priority} />
      ),
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
        <span className="text-gray-500">{formatDateTime(item.createdAt)}</span>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Werkaanvragen</h1>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'MEDEWERKER'
                ? 'Dien een aanvraag in of volg je bestaande aanvragen op'
                : 'Beheer en verwerk alle werkaanvragen'}
            </p>
          </div>
          <button
            onClick={() => router.push('/work-requests/new')}
            className="btn-primary gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuwe aanvraag
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(item) => router.push(`/work-requests/${item.id}`)}
          emptyMessage="Geen werkaanvragen gevonden"
        />

        {/* Pagination */}
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
