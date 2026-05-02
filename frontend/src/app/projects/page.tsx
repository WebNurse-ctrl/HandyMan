'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, ListChecks, ClipboardList, AlarmClock } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import FilterChips from '@/components/ui/FilterChips';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Project, PaginatedResponse } from '@/types';
import { cn } from '@/lib/utils';
import { getDeadlineState } from '@/lib/deadlines';
import { useAuth } from '@/hooks/useAuth';

const MANAGE_ROLES = ['DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'];

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreate = !!user && MANAGE_ROLES.includes(user.role);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Project>>({
    queryKey: ['projects', page, statusFilter],
    queryFn: () =>
      apiGet('/api/projects', {
        page,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const statuses = [
    { value: '', label: 'Alle' },
    { value: 'PLANNING', label: 'Planning' },
    { value: 'ACTIEF', label: 'Actief' },
    { value: 'ON_HOLD', label: 'On hold' },
    { value: 'AFGEROND', label: 'Afgerond' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Projecten"
          description="Overzicht van alle projecten met budget- en voortgangsinfo"
          actions={
            canCreate ? (
              <button
                type="button"
                onClick={() => router.push('/projects/new')}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                Nieuw project
              </button>
            ) : null
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

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="Geen projecten gevonden"
            description="Probeer een andere status, of maak een nieuw project aan."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.data.map((project) => {
              const deadlineState = getDeadlineState(
                project.deadline ?? null,
                project.status === 'AFGEROND' || project.status === 'GEANNULEERD'
                  ? 'AFGEWERKT'
                  : 'IN_BEHANDELING',
              );
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="card group flex flex-col items-stretch text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {project.projectNumber}
                      </p>
                      <h3 className="mt-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                        {project.name}
                      </h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {project.campus && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {project.campus.name}
                    </p>
                  )}

                  {project.description && (
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}

                  {project.deadline && (
                    <div
                      className={cn(
                        'mt-4 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[11px] font-medium',
                        deadlineState === 'overdue'
                          ? 'bg-destructive/10 text-destructive'
                          : deadlineState === 'approaching'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <AlarmClock className="h-3 w-3" />
                      {formatDate(project.deadline)}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {project._count && (
                        <>
                          <span className="inline-flex items-center gap-1" title="Werkaanvragen">
                            <ClipboardList className="h-3.5 w-3.5" />
                            {project._count.workRequests ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Taken">
                            <ListChecks className="h-3.5 w-3.5" />
                            {project._count.tasks}
                          </span>
                        </>
                      )}
                    </div>
                    {project.manager && (
                      <Avatar
                        name={project.manager.displayName}
                        src={project.manager.avatarUrl ?? null}
                        size="sm"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
