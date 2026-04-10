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
import { formatDate } from '@/lib/utils';
import { Task, PaginatedResponse } from '@/types';

export default function TasksPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', page, statusFilter],
    queryFn: () =>
      apiGet('/api/tasks', {
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const columns = [
    {
      key: 'taskNumber',
      label: 'Nummer',
      render: (item: Task) => (
        <span className="font-mono text-xs text-gray-500">
          {item.taskNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Taak',
      render: (item: Task) => (
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          {item.project && (
            <p className="text-xs text-gray-500">
              {item.project.projectNumber} - {item.project.name}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Toegewezen aan',
      render: (item: Task) => (
        <div className="flex items-center gap-2">
          {item.assignedTo ? (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                {item.assignedTo.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <span className="text-sm text-gray-600">
                {item.assignedTo.displayName}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Niet toegewezen</span>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Prioriteit',
      render: (item: Task) => (
        <PriorityIndicator priority={item.priority} />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Task) => <StatusBadge status={item.status} />,
    },
    {
      key: 'dueDate',
      label: 'Deadline',
      render: (item: Task) => (
        <span
          className={`text-sm ${
            item.dueDate && new Date(item.dueDate) < new Date()
              ? 'font-medium text-danger-600'
              : 'text-gray-500'
          }`}
        >
          {item.dueDate ? formatDate(item.dueDate) : '-'}
        </span>
      ),
    },
  ];

  const statuses = [
    { value: '', label: 'Alle' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_UITVOERING', label: 'In uitvoering' },
    { value: 'AFGEWERKT', label: 'Afgewerkt' },
    { value: 'ON_HOLD', label: 'On hold' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Taken</h1>
            <p className="mt-1 text-sm text-gray-500">
              Beheer en volg alle taken op
            </p>
          </div>
          <button
            onClick={() => router.push('/tasks/new')}
            className="btn-primary gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuwe taak
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
          onRowClick={(item) => router.push(`/tasks/${item.id}`)}
          emptyMessage="Geen taken gevonden"
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
