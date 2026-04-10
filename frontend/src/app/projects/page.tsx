'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiGet } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Project, PaginatedResponse } from '@/types';

export default function ProjectsPage() {
  const router = useRouter();
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projecten</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overzicht van alle projecten met budget- en voortgangsinfo
            </p>
          </div>
          <button
            onClick={() => router.push('/projects/new')}
            className="btn-primary gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuw project
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

        {/* Project cards grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
                <div className="mt-4 h-2 w-full rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((project) => {
              const budgetPercent =
                project.budgetApproved && project.budgetApproved > 0
                  ? Math.round(
                      (project.budgetSpent / project.budgetApproved) * 100,
                    )
                  : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="card cursor-pointer transition-shadow hover:shadow-soft"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-gray-400">
                        {project.projectNumber}
                      </p>
                      <h3 className="mt-1 font-semibold text-gray-900">
                        {project.name}
                      </h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {project.campus && (
                    <p className="mt-2 text-xs text-gray-500">
                      {project.campus.name}
                    </p>
                  )}

                  {/* Budget bar */}
                  {project.budgetApproved && project.budgetApproved > 0 ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Budget</span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(project.budgetSpent)} /{' '}
                          {formatCurrency(project.budgetApproved)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            budgetPercent > 90
                              ? 'bg-danger-500'
                              : budgetPercent > 70
                                ? 'bg-warning-500'
                                : 'bg-success-500'
                          }`}
                          style={{
                            width: `${Math.min(budgetPercent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-gray-400">
                      Geen budget ingesteld
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {project._count && (
                        <>
                          <span>{project._count.tasks} taken</span>
                          <span>{project._count.purchases} aankopen</span>
                        </>
                      )}
                    </div>
                    {project.manager && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                        {project.manager.displayName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {data?.data.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-sm text-gray-500">Geen projecten gevonden</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
