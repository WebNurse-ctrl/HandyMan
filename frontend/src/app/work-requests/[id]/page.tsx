'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { PRIORITY_OPTIONS, cn, formatDateTime } from '@/lib/utils';
import { Comment, Priority, TimeEntry, WorkRequest } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const PROGRESS_STEPS = [0, 20, 40, 60, 80, 100] as const;

function snapToStep(value: number): number {
  return PROGRESS_STEPS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

function progressColor(value: number): string {
  if (value >= 100) return 'bg-success-500';
  if (value >= 60) return 'bg-primary-500';
  if (value >= 20) return 'bg-warning-500';
  return 'bg-gray-300';
}

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}u`;
  return `${hours}u ${mins}m`;
}

function liveDurationMinutes(startedAt: string): number {
  return Math.max(
    0,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
  );
}

export default function WorkRequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = user?.role !== 'MEDEWERKER';

  const {
    data: workRequest,
    isLoading,
    isError,
    error,
  } = useQuery<WorkRequest>({
    queryKey: ['work-request', id],
    queryFn: () => apiGet(`/api/work-requests/${id}`),
    enabled: !!id,
    retry: false,
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery<{
    data: Comment[];
  }>({
    queryKey: ['work-request-comments', id],
    queryFn: () => apiGet(`/api/work-requests/${id}/comments`),
    enabled: !!id && !!workRequest,
  });

  const { data: timeEntriesData, isLoading: timeEntriesLoading } = useQuery<{
    data: TimeEntry[];
    totalMinutes: number;
  }>({
    queryKey: ['work-request-time-entries', id],
    queryFn: () => apiGet(`/api/work-requests/${id}/time-entries`),
    enabled: !!id && !!workRequest,
  });

  const [progressDraft, setProgressDraft] = useState<number>(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (workRequest) setProgressDraft(workRequest.progress ?? 0);
  }, [workRequest]);

  const progressMutation = useMutation({
    mutationFn: (progress: number) =>
      apiPatch<WorkRequest>(`/api/work-requests/${id}`, { progress }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['work-request', id], updated);
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Voortgang bijgewerkt');
    },
    onError: () => toast.error('Bijwerken mislukt'),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      apiPost<Comment>(`/api/work-requests/${id}/comments`, { content }),
    onSuccess: () => {
      setCommentDraft('');
      queryClient.invalidateQueries({ queryKey: ['work-request-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['work-request', id] });
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      toast.success('Feedback toegevoegd');
    },
    onError: () => toast.error('Feedback toevoegen mislukt'),
  });

  const startTimerMutation = useMutation({
    mutationFn: () =>
      apiPost<TimeEntry>(`/api/work-requests/${id}/time-entries`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['work-request-time-entries', id],
      });
      toast.success('Tijdsregistratie gestart');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Starten mislukt'),
  });

  const stopTimerMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiPatch<TimeEntry>(
        `/api/work-requests/${id}/time-entries/${entryId}`,
        { stop: true },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['work-request-time-entries', id],
      });
      toast.success('Tijdsregistratie gestopt');
    },
    onError: () => toast.error('Stoppen mislukt'),
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: Priority) =>
      apiPatch<WorkRequest>(`/api/work-requests/${id}`, { priority }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['work-request', id], updated);
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Prioriteit bijgewerkt');
    },
    onError: () => toast.error('Bijwerken mislukt'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiDelete<{ success: boolean }>(
        `/api/work-requests/${id}/time-entries/${entryId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['work-request-time-entries', id],
      });
      toast.success('Tijdsregistratie verwijderd');
    },
    onError: () => toast.error('Verwijderen mislukt'),
  });

  const progressDirty = useMemo(
    () => workRequest && workRequest.progress !== progressDraft,
    [workRequest, progressDraft],
  );

  const timeEntries = timeEntriesData?.data ?? [];
  const runningEntry = timeEntries.find((entry) => !entry.endedAt);

  useEffect(() => {
    if (!runningEntry) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  const totalMinutes = useMemo(() => {
    const completed = timeEntries.reduce(
      (sum, entry) => sum + (entry.durationMinutes ?? 0),
      0,
    );
    if (!runningEntry) return completed;
    const live = Math.max(
      0,
      Math.round(
        (now - new Date(runningEntry.startedAt).getTime()) / 60000,
      ),
    );
    return completed + live;
  }, [timeEntries, runningEntry, now]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-sm text-gray-500">Werkaanvraag laden...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !workRequest) {
    const status = (error as { response?: { status?: number } } | undefined)
      ?.response?.status;
    return (
      <AppLayout>
        <div className="card text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            {status === 404
              ? 'Werkaanvraag niet gevonden'
              : 'Werkaanvraag kon niet geladen worden'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Controleer of de link correct is of keer terug naar het overzicht.
          </p>
          <button
            onClick={() => router.push('/work-requests')}
            className="btn-primary mt-4"
          >
            Terug naar overzicht
          </button>
        </div>
      </AppLayout>
    );
  }

  const comments = commentsData?.data ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/work-requests')}
            className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Werkaanvragen
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-gray-500">
                {workRequest.requestNumber}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                {workRequest.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusBadge status={workRequest.status} />
                <PriorityIndicator priority={workRequest.priority} />
                <span className="text-xs text-gray-500">
                  Aangemaakt op {formatDateTime(workRequest.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Omschrijving
              </h2>
              <p className="whitespace-pre-line text-sm text-gray-800">
                {workRequest.description}
              </p>
              {workRequest.rejectionReason && (
                <div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-3">
                  <p className="text-xs font-semibold uppercase text-danger-700">
                    Reden weigering
                  </p>
                  <p className="mt-1 text-sm text-danger-800">
                    {workRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Werkvooruitgang
                </h2>
                <span className="text-2xl font-bold text-gray-900">
                  {progressDraft}%
                </span>
              </div>

              <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(
                      progressDraft,
                    )}`}
                    style={{ width: `${progressDraft}%` }}
                  />
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={20}
                  value={progressDraft}
                  disabled={!canEdit || progressMutation.isPending}
                  onChange={(e) =>
                    setProgressDraft(snapToStep(Number(e.target.value)))
                  }
                  className="mt-4 w-full cursor-pointer accent-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  {PROGRESS_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={!canEdit || progressMutation.isPending}
                      onClick={() => setProgressDraft(step)}
                      className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                        progressDraft === step
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-gray-100'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>

              {canEdit ? (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  {progressDirty && (
                    <button
                      type="button"
                      onClick={() =>
                        setProgressDraft(workRequest.progress ?? 0)
                      }
                      disabled={progressMutation.isPending}
                      className="btn-ghost"
                    >
                      Annuleren
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!progressDirty || progressMutation.isPending}
                    onClick={() => progressMutation.mutate(progressDraft)}
                    className="btn-primary"
                  >
                    {progressMutation.isPending
                      ? 'Bezig met opslaan...'
                      : 'Voortgang opslaan'}
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs text-gray-500">
                  Alleen de technische dienst kan de voortgang bijwerken.
                </p>
              )}
            </div>

            {/* Time registration */}
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Tijdsregistratie
                  </h2>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatDuration(totalMinutes)}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      totaal
                    </span>
                  </p>
                </div>

                {canEdit && (
                  <div>
                    {runningEntry ? (
                      <button
                        type="button"
                        onClick={() =>
                          stopTimerMutation.mutate(runningEntry.id)
                        }
                        disabled={stopTimerMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="h-2.5 w-2.5 rounded-sm bg-white" />
                        {stopTimerMutation.isPending
                          ? 'Bezig met stoppen...'
                          : 'Stoppen'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTimerMutation.mutate()}
                        disabled={startTimerMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                        {startTimerMutation.isPending
                          ? 'Bezig met starten...'
                          : 'Starten'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {runningEntry && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-success-200 bg-success-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
                    <span className="text-sm text-success-800">
                      Loopt sinds {formatDateTime(runningEntry.startedAt)}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-success-900">
                    {formatDuration(liveDurationMinutes(runningEntry.startedAt))}
                  </span>
                </div>
              )}

              <div className="mt-5">
                {timeEntriesLoading ? (
                  <p className="text-sm text-gray-500">
                    Tijdsregistraties laden...
                  </p>
                ) : timeEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nog geen tijdsregistratie. Klik op &laquo;Starten&raquo; om
                    te beginnen.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">
                            Medewerker
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Begin
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Einde
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Duur
                          </th>
                          {canEdit && <th className="px-3 py-2" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {timeEntries.map((entry) => {
                          const running = !entry.endedAt;
                          const minutes = running
                            ? liveDurationMinutes(entry.startedAt)
                            : entry.durationMinutes ?? 0;
                          return (
                            <tr key={entry.id}>
                              <td className="px-3 py-2 text-gray-900">
                                {entry.user?.displayName ?? 'Onbekend'}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {formatDateTime(entry.startedAt)}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {entry.endedAt ? (
                                  formatDateTime(entry.endedAt)
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-success-700">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
                                    Loopt
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-900">
                                {formatDuration(minutes)}
                              </td>
                              {canEdit && (
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          'Deze tijdsregistratie verwijderen?',
                                        )
                                      ) {
                                        deleteEntryMutation.mutate(entry.id);
                                      }
                                    }}
                                    disabled={deleteEntryMutation.isPending}
                                    className="text-xs text-gray-400 hover:text-danger-600 disabled:opacity-50"
                                    aria-label="Verwijderen"
                                  >
                                    Verwijderen
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {!canEdit && (
                <p className="mt-4 text-xs text-gray-500">
                  Alleen de technische dienst kan tijd registreren.
                </p>
              )}
            </div>

            {/* Feedback / Comments */}
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Feedback ({comments.length})
              </h2>

              <div className="space-y-4">
                {commentsLoading ? (
                  <p className="text-sm text-gray-500">Feedback laden...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nog geen feedback. Laat als eerste iets weten.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                        {initials(comment.user?.displayName)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user?.displayName ?? 'Onbekend'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                className="mt-6 border-t border-gray-100 pt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = commentDraft.trim();
                  if (!trimmed) return;
                  commentMutation.mutate(trimmed);
                }}
              >
                <label htmlFor="comment" className="label">
                  Voeg feedback toe
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Schrijf een opmerking of update..."
                  className="input"
                  disabled={commentMutation.isPending}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      commentMutation.isPending || !commentDraft.trim()
                    }
                  >
                    {commentMutation.isPending
                      ? 'Bezig met plaatsen...'
                      : 'Plaatsen'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {/* Priority */}
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Prioriteit
              </h2>
              {canEdit ? (
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const selected = workRequest.priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        disabled={priorityMutation.isPending}
                        onClick={() => priorityMutation.mutate(p.value)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
                          selected
                            ? cn(p.border, p.bg, p.text, 'ring-2 ring-offset-1', p.ring)
                            : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            selected ? p.dot : 'bg-gray-300',
                          )}
                        />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <PriorityIndicator priority={workRequest.priority} />
                  <p className="mt-3 text-xs text-gray-500">
                    Alleen de technische dienst kan de prioriteit aanpassen.
                  </p>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Details
              </h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Aanvrager
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {workRequest.requestedBy?.displayName}
                  </dd>
                  <dd className="text-xs text-gray-500">
                    {workRequest.requestedBy?.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Campus
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {workRequest.campus?.name ?? '—'}
                  </dd>
                </div>
                {workRequest.location && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-500">
                      Locatie
                    </dt>
                    <dd className="mt-0.5 text-gray-900">
                      {workRequest.location.name}
                    </dd>
                  </div>
                )}
                {workRequest.category && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-500">
                      Categorie
                    </dt>
                    <dd className="mt-0.5 text-gray-900">
                      {workRequest.category.name}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Laatst bijgewerkt
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {formatDateTime(workRequest.updatedAt)}
                  </dd>
                </div>
                {workRequest.resolvedAt && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-500">
                      Afgewerkt op
                    </dt>
                    <dd className="mt-0.5 text-gray-900">
                      {formatDateTime(workRequest.resolvedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
