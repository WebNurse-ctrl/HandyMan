'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import FilterChips from '@/components/ui/FilterChips';
import { apiGet } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PurchaseRequest, PaginatedResponse } from '@/types';

export default function PurchasesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<PurchaseRequest>>({
    queryKey: ['purchases', page, statusFilter],
    queryFn: () =>
      apiGet('/api/purchases', {
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const columns = [
    {
      key: 'purchaseNumber',
      label: 'Nummer',
      render: (item: PurchaseRequest) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.purchaseNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Omschrijving',
      render: (item: PurchaseRequest) => (
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          {item.project && (
            <p className="text-xs text-muted-foreground">{item.project.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'requestedBy',
      label: 'Aanvrager',
      render: (item: PurchaseRequest) => (
        <span className="text-muted-foreground">{item.requestedBy?.displayName}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (item: PurchaseRequest) => (
        <span
          className={item.type === 'GROOT' ? 'badge-warning' : 'badge-neutral'}
        >
          {item.type === 'GROOT' ? 'Groot' : 'Klein'}
        </span>
      ),
    },
    {
      key: 'estimatedCost',
      label: 'Bedrag',
      render: (item: PurchaseRequest) => (
        <span className="font-medium text-foreground tabular-nums">
          {formatCurrency(item.estimatedCost)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: PurchaseRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      label: 'Datum',
      render: (item: PurchaseRequest) => (
        <span className="text-muted-foreground">
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
  ];

  const statuses = [
    { value: '', label: 'Alle' },
    { value: 'WACHT_OP_GOEDKEURING', label: 'Wacht op goedkeuring' },
    { value: 'GOEDGEKEURD', label: 'Goedgekeurd' },
    { value: 'BESTELD', label: 'Besteld' },
    { value: 'GELEVERD', label: 'Geleverd' },
    { value: 'AFGEWEZEN', label: 'Afgewezen' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Aankopen"
          description="Beheer aankoopaanvragen en goedkeuringen"
          actions={
            <button
              type="button"
              onClick={() => router.push('/purchases/new')}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              Nieuwe aankoop
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
          onRowClick={(item) => router.push(`/purchases/${item.id}`)}
          emptyMessage="Geen aankopen gevonden"
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
