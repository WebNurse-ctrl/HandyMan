'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlarmClock,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FolderKanban,
  ListChecks,
  Pencil,
  Trash2,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Avatar, { getInitials } from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import PhotoUploader from '@/components/ui/PhotoUploader';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import { Project, Task, WorkRequest, ProjectLeadCandidate } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { getDeadlineState, daysUntilDeadline } from '@/lib/deadlines';

const MANAGE_ROLES = ['DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'];

interface ProjectDetail extends Project {
  workRequests: (WorkRequest & { tasks: Task[] })[];
  tasks: Task[];
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: () => apiGet(`/api/projects/${id}`),
    enabled: !!id,
    retry: false,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleWR = (wrId: string) =>
    setExpanded((s) => ({ ...s, [wrId]: !s[wrId] }));

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['project', id] });

  const patchMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<ProjectDetail>(`/api/projects/${id}`, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', id], updated);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditOpen(false);
      toast.success('Project opgeslagen');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Opslaan mislukt'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project verwijderd');
      router.push('/projects');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Verwijderen mislukt'),
  });

  const treeStats = useMemo(() => {
    if (!project) return { totalTasks: 0, totalWR: 0 };
    const wrTasks = project.workRequests.reduce(
      (sum, wr) => sum + (wr.tasks?.length ?? 0),
      0,
    );
    return {
      totalWR: project.workRequests.length,
      totalTasks: wrTasks + project.tasks.length,
    };
  }, [project]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Spinner size={32} />
        </div>
      </AppLayout>
    );
  }
  if (isError || !project) {
    return (
      <AppLayout>
        <div className="card text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Project niet gevonden
          </h1>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="btn-primary mt-4"
          >
            Terug naar overzicht
          </button>
        </div>
      </AppLayout>
    );
  }

  const deadlineState = getDeadlineState(
    project.deadline ?? null,
    project.status === 'AFGEROND' || project.status === 'GEANNULEERD'
      ? 'AFGEWERKT'
      : 'IN_BEHANDELING',
  );
  const days = daysUntilDeadline(project.deadline ?? null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Projecten
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-muted-foreground">
                {project.projectNumber}
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                <FolderKanban className="h-6 w-6 text-primary" />
                {project.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusBadge status={project.status} />
                <span className="text-xs text-muted-foreground">
                  Aangemaakt op {formatDateTime(project.createdAt)}
                </span>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="btn-secondary h-9 px-3"
                >
                  <Pencil className="h-4 w-4" />
                  Bewerken
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Project "${project.name}" verwijderen? Werkaanvragen en taken worden ontkoppeld.`,
                      )
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="btn-ghost h-9 px-3 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {(deadlineState === 'overdue' || deadlineState === 'approaching') && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4',
              deadlineState === 'overdue'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-warning/40 bg-warning/10 text-warning',
            )}
          >
            {deadlineState === 'overdue' ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            ) : (
              <AlarmClock className="mt-0.5 h-5 w-5 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {deadlineState === 'overdue'
                  ? 'Deadline overschreden'
                  : 'Deadline nadert'}
              </p>
              <p className="mt-0.5 text-sm">
                {deadlineState === 'overdue'
                  ? `De deadline was ${formatDate(project.deadline!)} (${Math.abs(days ?? 0)} dag${Math.abs(days ?? 0) === 1 ? '' : 'en'} geleden).`
                  : `Nog ${days} dag${days === 1 ? '' : 'en'} tot ${formatDate(project.deadline!)}.`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {project.description && (
              <div className="card">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Omschrijving
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {project.description}
                </p>
              </div>
            )}

            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Inhoud · {treeStats.totalWR} werkaanvragen ·{' '}
                  {treeStats.totalTasks} taken
                </h2>
              </div>

              {project.workRequests.length === 0 && project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nog geen werkaanvragen of taken aan dit project gekoppeld.
                  Koppel een werkaanvraag via haar detailpagina.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.workRequests.map((wr) => {
                    const isOpen = expanded[wr.id] ?? true;
                    return (
                      <div
                        key={wr.id}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleWR(wr.id)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={isOpen ? 'Inklappen' : 'Uitklappen'}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <ClipboardList className="h-4 w-4 text-primary" />
                          <button
                            type="button"
                            onClick={() => router.push(`/work-requests/${wr.id}`)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {wr.requestNumber}
                              </span>
                              <span className="truncate text-sm font-medium text-foreground hover:text-primary">
                                {wr.title}
                              </span>
                            </div>
                          </button>
                          <StatusBadge status={wr.status} />
                          {wr.assignedTo && (
                            <Avatar
                              name={wr.assignedTo.displayName}
                              src={wr.assignedTo.avatarUrl ?? null}
                              size="sm"
                            />
                          )}
                        </div>
                        {isOpen && (
                          <div className="space-y-1.5 px-3 py-2.5">
                            {wr.tasks && wr.tasks.length > 0 ? (
                              wr.tasks.map((t) => (
                                <TaskRow
                                  key={t.id}
                                  task={t}
                                  onClick={() => router.push(`/tasks/${t.id}`)}
                                />
                              ))
                            ) : (
                              <p className="pl-6 text-xs text-muted-foreground">
                                Geen taken voor deze werkaanvraag.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {project.tasks.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-dashed border-border">
                      <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Taken zonder werkaanvraag
                        </span>
                      </div>
                      <div className="space-y-1.5 px-3 py-2.5">
                        {project.tasks.map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            onClick={() => router.push(`/tasks/${t.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Foto's
              </h2>
              <PhotoUploader
                attachments={project.attachments ?? []}
                target="project"
                targetId={project.id}
                canEdit={canManage}
                onChange={refresh}
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Details
              </h2>
              <dl className="space-y-4 text-sm">
                <DetailRow icon={<UserCheck />} label="Projectverantwoordelijke">
                  {project.manager ? (
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-fallback h-8 w-8 text-xs">
                        {getInitials(project.manager.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {project.manager.displayName}
                        </p>
                        {project.manager.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {project.manager.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Niet toegewezen</span>
                  )}
                </DetailRow>

                {project.createdBy && (
                  <DetailRow icon={<UserIcon />} label="Aangemaakt door">
                    {project.createdBy.displayName}
                  </DetailRow>
                )}

                {project.campus && (
                  <DetailRow icon={<Building2 />} label="Campus">
                    {project.campus.name}
                  </DetailRow>
                )}

                <DetailRow icon={<AlarmClock />} label="Deadline">
                  {project.deadline ? (
                    <span
                      className={cn(
                        deadlineState === 'overdue' && 'font-semibold text-destructive',
                        deadlineState === 'approaching' && 'font-semibold text-warning',
                      )}
                    >
                      {formatDate(project.deadline)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Niet ingesteld</span>
                  )}
                </DetailRow>

                {project.startDate && (
                  <DetailRow icon={<Calendar />} label="Startdatum">
                    {formatDate(project.startDate)}
                  </DetailRow>
                )}
                {project.endDate && (
                  <DetailRow icon={<CalendarCheck2 />} label="Einddatum">
                    {formatDate(project.endDate)}
                  </DetailRow>
                )}
                <DetailRow icon={<Clock />} label="Laatst bijgewerkt">
                  {formatDateTime(project.createdAt)}
                </DetailRow>
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {editOpen && (
        <EditProjectDialog
          project={project}
          onClose={() => setEditOpen(false)}
          onSave={(p) => patchMutation.mutate(p)}
          isSubmitting={patchMutation.isPending}
        />
      )}
    </AppLayout>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue =
    !!task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'AFGEWERKT';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
    >
      <ListChecks className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="font-mono text-[11px] text-muted-foreground">
        {task.taskNumber}
      </span>
      <span className="truncate text-sm text-foreground">{task.title}</span>
      <div className="ml-auto flex items-center gap-2">
        {task.dueDate && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px]',
              overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
            )}
          >
            <AlarmClock className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        <StatusBadge status={task.status} />
        {task.assignedTo && (
          <Avatar
            name={task.assignedTo.displayName}
            src={task.assignedTo.avatarUrl ?? null}
            size="sm"
          />
        )}
      </div>
    </button>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function toDateInput(v: string | null | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function EditProjectDialog({
  project,
  onClose,
  onSave,
  isSubmitting,
}: {
  project: ProjectDetail;
  onClose: () => void;
  onSave: (p: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [deadline, setDeadline] = useState(toDateInput(project.deadline));
  const [managerId, setManagerId] = useState(project.manager?.id ?? '');
  const [status, setStatus] = useState(project.status);

  const { data: leads = [] } = useQuery<ProjectLeadCandidate[]>({
    queryKey: ['project-leads'],
    queryFn: () => apiGet('/api/users/project-leads'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Naam mag niet leeg zijn');
      return;
    }
    onSave({
      name: trimmed,
      description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      managerId: managerId || null,
      status,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">
          Project bewerken
        </h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="ep-name">
              Titel
            </label>
            <input
              id="ep-name"
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="ep-desc">
              Omschrijving
            </label>
            <textarea
              id="ep-desc"
              className="input mt-1"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ep-deadline">
                Deadline
              </label>
              <input
                id="ep-deadline"
                type="date"
                className="input mt-1"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="ep-status">
                Status
              </label>
              <select
                id="ep-status"
                className="input mt-1"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ProjectDetail['status'])
                }
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIEF">Actief</option>
                <option value="ON_HOLD">On hold</option>
                <option value="AFGEROND">Afgerond</option>
                <option value="GEANNULEERD">Geannuleerd</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ep-manager">
              Projectverantwoordelijke
            </label>
            <select
              id="ep-manager"
              className="input mt-1"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">Niet toegewezen</option>
              {leads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} · {u.role.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-9 px-3"
            disabled={isSubmitting}
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary h-9 px-4"
          >
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  );
}
