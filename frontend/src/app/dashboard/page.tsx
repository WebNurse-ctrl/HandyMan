'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  ShoppingCart,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface DashboardOverview {
  workRequests: { total: number; open: number; inProgress: number; completed: number };
  tasks: { total: number; open: number; inProgress: number; completed: number };
  projects: { active: number };
  purchases: { pendingApproval: number };
}

interface TrendItem {
  month: string;
  created: number;
  resolved: number;
}

interface WorkloadItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  activeTasks: number;
}

interface BudgetItem {
  id: string;
  name: string;
  projectNumber: string;
  budgetEstimate: number;
  budgetApproved: number;
  budgetSpent: number;
  percentUsed: number;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => apiGet('/api/dashboard/overview') as Promise<DashboardOverview>,
  });

  const { data: workload } = useQuery<WorkloadItem[]>({
    queryKey: ['dashboard', 'workload'],
    queryFn: () => apiGet('/api/dashboard/workload') as Promise<WorkloadItem[]>,
    enabled: user?.role !== 'MEDEWERKER',
  });

  const { data: trends } = useQuery<TrendItem[]>({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => apiGet('/api/dashboard/trends') as Promise<TrendItem[]>,
  });

  const { data: budgetSummary } = useQuery<BudgetItem[]>({
    queryKey: ['dashboard', 'budget-summary'],
    queryFn: () => apiGet('/api/dashboard/budget-summary') as Promise<BudgetItem[]>,
    enabled: user?.role !== 'MEDEWERKER',
  });

  const taskStatusData = overview
    ? [
        { name: 'Open', value: overview.tasks.open, color: 'rgb(var(--accent))' },
        { name: 'In uitvoering', value: overview.tasks.inProgress, color: 'rgb(var(--warning))' },
        { name: 'Afgewerkt', value: overview.tasks.completed, color: 'rgb(var(--success))' },
      ]
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Hallo, ${user?.displayName?.split(' ')[0] ?? 'collega'} 👋`}
          description="Hier is een overzicht van wat er vandaag speelt"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Openstaande aanvragen"
            value={overview?.workRequests.open ?? 0}
            subtitle={`${overview?.workRequests.total ?? 0} totaal`}
            color="primary"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <StatCard
            title="Actieve taken"
            value={(overview?.tasks.open ?? 0) + (overview?.tasks.inProgress ?? 0)}
            subtitle={`${overview?.tasks.completed ?? 0} afgewerkt`}
            color="warning"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            title="Actieve projecten"
            value={overview?.projects.active ?? 0}
            color="success"
            icon={<FolderKanban className="h-5 w-5" />}
          />
          <StatCard
            title="Wacht op goedkeuring"
            value={overview?.purchases.pendingApproval ?? 0}
            color="danger"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Trends area chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Maandelijkse trends
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aanvragen aangemaakt vs afgewerkt
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <LegendDot type="created" />
                <LegendDot type="resolved" />
              </div>
            </div>

            <div className="mt-6 h-72 w-full">
              {!trends ? (
                <Skeleton className="h-full w-full" />
              ) : trends.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Geen data beschikbaar
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="trendResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgb(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="rgb(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgb(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Nieuw"
                      stroke="rgb(var(--primary))"
                      strokeWidth={2}
                      fill="url(#trendCreated)"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      name="Afgewerkt"
                      stroke="rgb(var(--accent))"
                      strokeWidth={2}
                      fill="url(#trendResolved)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Task status breakdown */}
          <div className="card">
            <h2 className="text-base font-semibold text-foreground">
              Taken status
            </h2>
            <p className="text-sm text-muted-foreground">Verdeling van openstaand werk</p>

            <div className="mt-6 h-56 w-full">
              {!overview ? (
                <Skeleton className="h-full w-full" />
              ) : taskStatusData.every((d) => d.value === 0) ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Geen taken
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskStatusData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="rgb(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgb(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
              {[
                {
                  label: 'Open',
                  count: overview?.tasks.open ?? 0,
                  Icon: Clock,
                  tone: 'text-accent',
                },
                {
                  label: 'Bezig',
                  count: overview?.tasks.inProgress ?? 0,
                  Icon: Activity,
                  tone: 'text-warning',
                },
                {
                  label: 'Klaar',
                  count: overview?.tasks.completed ?? 0,
                  Icon: CheckCircle2,
                  tone: 'text-success',
                },
              ].map(({ label, count, Icon, tone }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <Icon className={`h-4 w-4 ${tone}`} />
                  <span className="text-lg font-bold text-foreground">{count}</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workload + budget */}
        <div className="grid gap-6 lg:grid-cols-3">
          {workload && workload.length > 0 && (
            <div className="card lg:col-span-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Werklast team</h2>
                  <p className="text-sm text-muted-foreground">Actieve taken per medewerker</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {workload.map((w) => {
                  const max = Math.max(...workload.map((x) => x.activeTasks), 1);
                  const pct = (w.activeTasks / max) * 100;
                  return (
                    <div key={w.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Avatar name={w.displayName} src={w.avatarUrl} size="sm" />
                          <span className="truncate text-sm font-medium text-foreground">
                            {w.displayName}
                          </span>
                        </div>
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                          {w.activeTasks}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {budgetSummary && budgetSummary.length > 0 && (
            <div className="card lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Projectbudgetten</h2>
                  <p className="text-sm text-muted-foreground">
                    Goedgekeurd vs reeds besteed
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pl-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Project
                      </th>
                      <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Budget
                      </th>
                      <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Besteed
                      </th>
                      <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Voortgang
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {budgetSummary.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pl-1">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {p.projectNumber}
                          </p>
                        </td>
                        <td className="py-3 text-right text-sm text-foreground tabular-nums">
                          {formatCurrency(p.budgetApproved)}
                        </td>
                        <td className="py-3 text-right text-sm text-foreground tabular-nums">
                          {formatCurrency(p.budgetSpent)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  p.percentUsed > 90
                                    ? 'bg-destructive'
                                    : p.percentUsed > 70
                                      ? 'bg-warning'
                                      : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(p.percentUsed, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
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
      </div>
    </AppLayout>
  );
}

function LegendDot({ type }: { type: 'created' | 'resolved' }) {
  const cfg =
    type === 'created'
      ? { label: 'Nieuw', color: 'rgb(var(--primary))' }
      : { label: 'Afgewerkt', color: 'rgb(var(--accent))' };
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-foreground">{label}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span>
              {p.name}: <strong className="text-foreground">{p.value}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
