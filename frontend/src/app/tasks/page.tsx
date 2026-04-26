'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import FilterChips from '@/components/ui/FilterChips';
import Avatar from '@/components/ui/Avatar';
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
        <span className="font-mono text-xs text-muted-foreground">
          {item.taskNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Taak',
      render: (item: Task) => (
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          {item.project && (
            <p className="text-xs text-muted-foreground">
              {item.project.projectNumber} · {item.project.name}
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
              <Avatar
                name={item.assignedTo.displayName}
                src={item.assignedTo.avatarUrl ?? null}
                size="sm"
              />
              <span className="text-sm text-foreground">
                {item.assignedTo.displayName}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Niet toegewezen</span>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Prioriteit',
      render: (item: Task) => <PriorityIndicator priority={item.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Task) => <StatusBadge status={item.status} />,
    },
    {
      key: 'dueDate',
      label: 'Deadline',
      render: (item: Task) => {
        if (!item.dueDate) return <span className="text-sm text-muted-foreground">—</span>;
        const overdue = new Date(item.dueDate) < new Date() && item.status !== 'AFGEWERKT';
        return (
          <span
            className={
              overdue
                ? 'inline-flex items-center gap-1 text-sm font-medium text-destructive'
                : 'text-sm text-muted-foreground'
            }
          >
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {formatDate(item.dueDate)}
          </span>
        );
      },
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
        <PageHeader
          title="Taken"
          description="Beheer en volg alle taken op"
          actions={
            <button
              type="button"
              onClick={() => router.push('/tasks/new')}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              Nieuwe taak
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
