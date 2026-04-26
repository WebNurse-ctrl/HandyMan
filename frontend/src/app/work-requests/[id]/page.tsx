'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  User as UserIcon,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Avatar, { getInitials } from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Comment, WorkRequest } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED LAYOUT — see frontend/CLAUDE.md / docs/UI_INVARIANTS.md
//   • Voortgang-kaart hoort in de RECHTER zijbalk (lg:col-span-1), bovenaan.
//   • Details-kaart staat onder Voortgang en gebruikt iconen per veld.
//   • Hoofdkolom (lg:col-span-2) bevat: Omschrijving + Feedback.
// Verplaats deze blokken NIET zonder expliciete vraag van de gebruiker.
// ─────────────────────────────────────────────────────────────────────────────

const PROGRESS_STEPS = [0, 20, 40, 60, 80, 100] as const;

function snapToStep(value: number): number {
  return PROGRESS_STEPS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

function progressColor(value: number): string {
  if (value >= 100) return 'bg-success';
  if (value >= 60) return 'bg-primary';
  if (value >= 20) return 'bg-warning';
  return 'bg-muted-foreground/40';
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

  const [progressDraft, setProgressDraft] = useState<number>(0);
  const [commentDraft, setCommentDraft] = useState('');

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

  const progressDirty = useMemo(
    () => workRequest && workRequest.progress !== progressDraft,
    [workRequest, progressDraft],
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-sm text-muted-foreground">Werkaanvraag laden...</p>
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
          <h1 className="text-lg font-semibold text-foreground">
            {status === 404
              ? 'Werkaanvraag niet gevonden'
              : 'Werkaanvraag kon niet geladen worden'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controleer of de link correct is of keer terug naar het overzicht.
          </p>
          <button
            type="button"
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
        <div>
          <button
            type="button"
            onClick={() => router.push('/work-requests')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Werkaanvragen
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {workRequest.requestNumber}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {workRequest.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusBadge status={workRequest.status} />
                <PriorityIndicator priority={workRequest.priority} />
                <span className="text-xs text-muted-foreground">
                  Aangemaakt op {formatDateTime(workRequest.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Hoofdkolom: omschrijving + feedback */}
          <div className="space-y-6 lg:col-span-2">
            <div className="card">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Omschrijving
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {workRequest.description}
              </p>
              {workRequest.rejectionReason && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Reden weigering
                  </p>
                  <p className="mt-1 text-sm text-destructive">
                    {workRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Feedback ({comments.length})
              </h2>

              <div className="space-y-5">
                {commentsLoading ? (
                  <p className="text-sm text-muted-foreground">Feedback laden...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nog geen feedback. Laat als eerste iets weten.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar
                        name={comment.user?.displayName}
                        src={comment.user?.avatarUrl ?? null}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {comment.user?.displayName ?? 'Onbekend'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                        <div className="mt-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                          <p className="whitespace-pre-line text-sm text-foreground">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                className="mt-6 border-t border-border pt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = commentDraft.trim();
                  if (!trimmed) return;
                  commentMutation.mutate(trimmed);
                }}
              >
                <div className="flex gap-3">
                  <Avatar name={user?.displayName} size="md" />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="comment" className="sr-only">
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
                        disabled={commentMutation.isPending || !commentDraft.trim()}
                      >
                        {commentMutation.isPending
                          ? 'Bezig met plaatsen...'
                          : 'Plaatsen'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Rechterzijbalk: voortgang + details */}
          <aside className="space-y-6">
            {/* ─── Voortgangsindicator (BLIJFT in deze rechterzijbalk) ─── */}
            <div className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Werkvooruitgang
                </h2>
                <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {progressDraft}
                  <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                    %
                  </span>
                </span>
              </div>

              <div className="mt-4">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      progressColor(progressDraft),
                    )}
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
                  className="mt-4 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex justify-between gap-1">
                  {PROGRESS_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={!canEdit || progressMutation.isPending}
                      onClick={() => setProgressDraft(step)}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors',
                        progressDraft === step
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        'disabled:cursor-not-allowed disabled:opacity-60',
                      )}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>

              {canEdit ? (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  {progressDirty && (
                    <button
                      type="button"
                      onClick={() => setProgressDraft(workRequest.progress ?? 0)}
                      disabled={progressMutation.isPending}
                      className="btn-ghost h-9 px-3"
                    >
                      Annuleren
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!progressDirty || progressMutation.isPending}
                    onClick={() => progressMutation.mutate(progressDraft)}
                    className="btn-primary h-9 px-3"
                  >
                    {progressMutation.isPending ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  Alleen de technische dienst kan de voortgang bijwerken.
                </p>
              )}
            </div>

            {/* ─── Details (met iconen per veld — BLIJVEN behouden) ─── */}
            <div className="card">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Details
              </h2>
              <dl className="space-y-4 text-sm">
                <DetailRow icon={<UserIcon />} label="Aanvrager">
                  <div className="flex items-center gap-2.5">
                    <div className="avatar-fallback h-8 w-8 text-xs">
                      {getInitials(workRequest.requestedBy?.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {workRequest.requestedBy?.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {workRequest.requestedBy?.email}
                      </p>
                    </div>
                  </div>
                </DetailRow>

                <DetailRow icon={<Building2 />} label="Campus">
                  {workRequest.campus?.name ?? '—'}
                </DetailRow>

                {workRequest.location && (
                  <DetailRow icon={<MapPin />} label="Locatie">
                    {workRequest.location.name}
                  </DetailRow>
                )}

                {workRequest.category && (
                  <DetailRow icon={<Tag />} label="Categorie">
                    {workRequest.category.name}
                  </DetailRow>
                )}

                <DetailRow icon={<Clock />} label="Laatst bijgewerkt">
                  {formatDateTime(workRequest.updatedAt)}
                </DetailRow>

                {workRequest.resolvedAt && (
                  <DetailRow icon={<CheckCircle2 />} label="Afgewerkt op">
                    {formatDateTime(workRequest.resolvedAt)}
                  </DetailRow>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
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
