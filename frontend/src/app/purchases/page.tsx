'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
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
        <span className="font-mono text-xs text-gray-500">
          {item.purchaseNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Omschrijving',
      render: (item: PurchaseRequest) => (
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          {item.project && (
            <p className="text-xs text-gray-500">{item.project.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'requestedBy',
      label: 'Aanvrager',
      render: (item: PurchaseRequest) => (
        <span className="text-gray-600">{item.requestedBy?.displayName}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (item: PurchaseRequest) => (
        <span
          className={`badge ${
            item.type === 'GROOT' ? 'badge-warning' : 'badge-neutral'
          }`}
        >
          {item.type === 'GROOT' ? 'Groot' : 'Klein'}
        </span>
      ),
    },
    {
      key: 'estimatedCost',
      label: 'Bedrag',
      render: (item: PurchaseRequest) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(item.estimatedCost)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: PurchaseRequest) => (
        <StatusBadge status={item.status} />
      ),
    },
    {
      key: 'createdAt',
      label: 'Datum',
      render: (item: PurchaseRequest) => (
        <span className="text-gray-500">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aankopen</h1>
            <p className="mt-1 text-sm text-gray-500">
              Beheer aankoopaanvragen en goedkeuringen
            </p>
          </div>
          <button
            onClick={() => router.push('/purchases/new')}
            className="btn-primary gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuwe aankoop
          </button>
        </div>

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
