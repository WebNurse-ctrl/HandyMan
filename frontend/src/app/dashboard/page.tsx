'use client';

import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import { apiGet } from '@/lib/api';
import { DashboardOverview } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: overview, isLoading } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => apiGet('/api/dashboard/overview'),
  });

  const { data: workload } = useQuery({
    queryKey: ['dashboard', 'workload'],
    queryFn: () => apiGet('/api/dashboard/workload'),
    enabled: user?.role !== 'MEDEWERKER',
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => apiGet('/api/dashboard/trends'),
  });

  const { data: budgetSummary } = useQuery({
    queryKey: ['dashboard', 'budget-summary'],
    queryFn: () => apiGet('/api/dashboard/budget-summary'),
    enabled: user?.role !== 'MEDEWERKER',
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welkom terug, {user?.displayName?.split(' ')[0]}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Openstaande aanvragen"
            value={overview?.workRequests.open ?? '-'}
            subtitle={`${overview?.workRequests.total ?? 0} totaal`}
            color="primary"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          />
          <StatCard
            title="Actieve taken"
            value={
              (overview?.tasks.open ?? 0) +
              (overview?.tasks.inProgress ?? 0)
            }
            subtitle={`${overview?.tasks.completed ?? 0} afgewerkt`}
            color="warning"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Actieve projecten"
            value={overview?.projects.active ?? '-'}
            color="success"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
              </svg>
            }
          />
          <StatCard
            title="Wacht op goedkeuring"
            value={overview?.purchases.pendingApproval ?? '-'}
            color="danger"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent activity */}
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Maandelijkse trends
            </h2>
            <p className="text-sm text-gray-500">
              Aanvragen aangemaakt vs afgewerkt
            </p>
            <div className="mt-4">
              {trends && Array.isArray(trends) ? (
                <div className="space-y-3">
                  {(trends as any[]).map((t: any) => (
                    <div key={t.month} className="flex items-center gap-4">
                      <span className="w-20 text-xs text-gray-500">
                        {t.month}
                      </span>
                      <div className="flex-1">
                        <div className="flex gap-1">
                          <div
                            className="h-6 rounded-l bg-primary-200"
                            style={{
                              width: `${Math.max((t.created / (Math.max(...(trends as any[]).map((x: any) => x.created)) || 1)) * 100, 4)}%`,
                            }}
                          />
                          <div
                            className="h-6 rounded-r bg-success-200"
                            style={{
                              width: `${Math.max((t.resolved / (Math.max(...(trends as any[]).map((x: any) => x.created)) || 1)) * 100, 4)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-primary-600">{t.created} nieuw</span>
                        <span className="text-success-600">{t.resolved} klaar</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  Geen data beschikbaar
                </div>
              )}
            </div>
          </div>

          {/* Workload */}
          {workload && Array.isArray(workload) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900">
                Werklast team
              </h2>
              <p className="text-sm text-gray-500">Actieve taken per medewerker</p>
              <div className="mt-4 space-y-3">
                {(workload as any[]).map((w: any) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {w.displayName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {w.displayName}
                      </span>
                    </div>
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                      {w.activeTasks} taken
                    </span>
                  </div>
                ))}
                {(workload as any[]).length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">
                    Geen teamleden gevonden
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Budget overview for managers */}
        {budgetSummary && Array.isArray(budgetSummary) && (budgetSummary as any[]).length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900">
              Projectbudgetten
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Project
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Budget
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Besteed
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Voortgang
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(budgetSummary as any[]).map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.projectNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        EUR {p.budgetApproved.toLocaleString('nl-BE')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        EUR {p.budgetSpent.toLocaleString('nl-BE')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                p.percentUsed > 90
                                  ? 'bg-danger-500'
                                  : p.percentUsed > 70
                                    ? 'bg-warning-500'
                                    : 'bg-success-500'
                              }`}
                              style={{
                                width: `${Math.min(p.percentUsed, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {p.percentUsed}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
