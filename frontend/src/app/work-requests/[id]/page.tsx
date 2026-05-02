'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlarmClock,
  AlertTriangle,
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  HandHelping,
  LayoutGrid,
  MapPin,
  Pencil,
  Tag,
  User as UserIcon,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityIndicator from '@/components/ui/PriorityIndicator';
import Avatar, { getInitials } from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Comment, TechnicalStaffMember, WorkRequest } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { daysUntilDeadline, getDeadlineState } from '@/lib/deadlines';

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED LAYOUT — see frontend/CLAUDE.md / docs/UI_INVARIANTS.md
//   • Voortgang-kaart hoort in de RECHTER zijbalk (lg:col-span-1), bovenaan.
//   • Details-kaart staat onder Voortgang en gebruikt iconen per veld.
//   • Hoofdkolom (lg:col-span-2) bevat: Omschrijving + Feedback.
//   • In de Voortgang-kaart staat één indicator: een slider voor de eigenaar
//     (= de TOEGEWEZEN behandelaar, workRequest.assignedTo.id === user.id),
//     een statische balk voor read-only kijkers.
//   • De aanvrager (workRequest.requestedBy) is GEEN eigenaar meer — sinds
//     de pickup-flow is eigenaarschap losgekoppeld van aanvragerschap.
// Verplaats deze blokken NIET zonder expliciete vraag van de gebruiker.
// ─────────────────────────────────────────────────────────────────────────────

const PROGRESS_STEPS = [0, 20, 40, 60, 80, 100] as const;

const PICKUP_ROLES = ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'ADMIN', 'FACILITAIR_MANAGER'];
const ADMIN_ROLES = ['ADMIN', 'FACILITAIR_MANAGER'];
const ASSIGN_ROLES = ['ADMIN', 'FACILITAIR_MANAGER', 'DIENSTHOOFD'];

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

  const userRole = user?.role ?? '';
  const isAdmin = ADMIN_ROLES.includes(userRole);
  const canPickup = PICKUP_ROLES.includes(userRole);
  const isAssignee =
    !!user?.id && !!workRequest?.assignedTo && workRequest.assignedTo.id === user.id;

  const { data: commentsData, isLoading: commentsLoading } = useQuery<{
    data: Comment[];
  }>({
    queryKey: ['work-request-comments', id],
    queryFn: () => apiGet(`/api/work-requests/${id}/comments`),
    enabled: !!id && !!workRequest,
  });

  const [progressDraft, setProgressDraft] = useState<number>(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);

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

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      apiPatch<WorkRequest>(`/api/work-requests/${id}`, { assignedToId }),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(['work-request', id], updated);
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setReassignOpen(false);
      if (variables === null) toast.success('Aanvraag losgelaten');
      else if (variables === user?.id) toast.success('Aanvraag opgepikt');
      else toast.success('Aanvraag toegewezen');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Toewijzen mislukt'),
  });

  const planningMutation = useMutation({
    mutationFn: (planning: {
      deadline: string | null;
      startDate: string | null;
      endDate: string | null;
    }) => apiPatch<WorkRequest>(`/api/work-requests/${id}`, planning),
    onSuccess: (updated) => {
      queryClient.setQueryData(['work-request', id], updated);
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      setPlanningOpen(false);
      toast.success('Planning opgeslagen');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Planning opslaan mislukt'),
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
  const canPickupNow =
    canPickup && !workRequest.assignedTo && workRequest.status === 'INGEDIEND';
  const canRelease = isAssignee || (isAdmin && !!workRequest.assignedTo);
  const canForceAssign = ASSIGN_ROLES.includes(userRole);
  const canEditPlanning = isAssignee || isAdmin || userRole === 'DIENSTHOOFD';

  const deadlineState = getDeadlineState(workRequest.deadline, workRequest.status);
  const daysToDeadline = daysUntilDeadline(workRequest.deadline);

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

        {(deadlineState === 'overdue' || deadlineState === 'approaching') && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4',
              deadlineState === 'overdue'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-warning/40 bg-warning/10 text-warning-foreground',
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
                  ? `De deadline was ${formatDateTime(workRequest.deadline!)} (${Math.abs(daysToDeadline ?? 0)} dag${Math.abs(daysToDeadline ?? 0) === 1 ? '' : 'en'} geleden). De aanvraag is nog niet afgewerkt.`
                  : `Nog ${daysToDeadline} dag${daysToDeadline === 1 ? '' : 'en'} tot ${formatDateTime(workRequest.deadline!)}.`}
              </p>
            </div>
          </div>
        )}

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

              {isAssignee ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={20}
                    value={progressDraft}
                    disabled={progressMutation.isPending}
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
                        disabled={progressMutation.isPending}
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
                </>
              ) : (
                <>
                  <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        progressColor(workRequest.progress ?? 0),
                      )}
                      style={{ width: `${workRequest.progress ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {workRequest.assignedTo
                      ? `Alleen ${workRequest.assignedTo.displayName} kan de voortgang bijwerken.`
                      : 'Niemand pikt deze aanvraag op. De voortgang kan pas aangepast worden zodra iemand ze opneemt.'}
                  </p>
                </>
              )}

              {/* ─── Pickup / Loslaten / Anders toewijzen ─── */}
              {(canPickupNow || canRelease || canForceAssign) && (
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  {canPickupNow && (
                    <button
                      type="button"
                      onClick={() => assignMutation.mutate(user!.id)}
                      disabled={assignMutation.isPending}
                      className="btn-primary h-9 px-3"
                    >
                      <HandHelping className="h-4 w-4" />
                      Oppikken
                    </button>
                  )}
                  {canRelease && (
                    <button
                      type="button"
                      onClick={() => assignMutation.mutate(null)}
                      disabled={assignMutation.isPending}
                      className="btn-ghost h-9 px-3"
                    >
                      <X className="h-4 w-4" />
                      Loslaten
                    </button>
                  )}
                  {canForceAssign && (
                    <button
                      type="button"
                      onClick={() => setReassignOpen(true)}
                      disabled={assignMutation.isPending}
                      className="btn-secondary h-9 px-3"
                    >
                      <Users className="h-4 w-4" />
                      Anders toewijzen
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ─── Details (met iconen per veld — BLIJVEN behouden) ─── */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </h2>
                {canEditPlanning && (
                  <button
                    type="button"
                    onClick={() => setPlanningOpen(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Planning bewerken"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Planning
                  </button>
                )}
              </div>
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

                <DetailRow icon={<UserCheck />} label="Toegewezen aan">
                  {workRequest.assignedTo ? (
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-fallback h-8 w-8 text-xs">
                        {getInitials(workRequest.assignedTo.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {workRequest.assignedTo.displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {workRequest.assignedTo.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Nog niet opgepikt
                    </span>
                  )}
                </DetailRow>

                <DetailRow icon={<Building2 />} label="Campus">
                  {workRequest.campus?.name ?? '—'}
                </DetailRow>

                {workRequest.building && (
                  <DetailRow icon={<Building />} label="Gebouw">
                    {workRequest.building.name}
                  </DetailRow>
                )}

                {workRequest.department && (
                  <DetailRow icon={<LayoutGrid />} label="Afdeling">
                    {workRequest.department.name}
                  </DetailRow>
                )}

                {workRequest.room && (
                  <DetailRow icon={<DoorOpen />} label="Kamer">
                    {[workRequest.room.number, workRequest.room.name]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </DetailRow>
                )}

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

                <DetailRow icon={<AlarmClock />} label="Deadline">
                  {workRequest.deadline ? (
                    <span
                      className={cn(
                        deadlineState === 'overdue' && 'font-semibold text-destructive',
                        deadlineState === 'approaching' && 'font-semibold text-warning',
                      )}
                    >
                      {formatDateTime(workRequest.deadline)}
                      {deadlineState === 'overdue' && ' · OVERSCHREDEN'}
                      {deadlineState === 'approaching' &&
                        ` · nog ${daysToDeadline} dag${daysToDeadline === 1 ? '' : 'en'}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Niet ingesteld</span>
                  )}
                </DetailRow>

                {workRequest.startDate && (
                  <DetailRow icon={<Calendar />} label="Startdatum">
                    {formatDateTime(workRequest.startDate)}
                  </DetailRow>
                )}

                {workRequest.endDate && (
                  <DetailRow icon={<CalendarCheck2 />} label="Einddatum">
                    {formatDateTime(workRequest.endDate)}
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

      {reassignOpen && (
        <ReassignDialog
          currentAssigneeId={workRequest.assignedTo?.id ?? null}
          onClose={() => setReassignOpen(false)}
          onSelect={(uid) => assignMutation.mutate(uid)}
          isSubmitting={assignMutation.isPending}
        />
      )}

      {planningOpen && (
        <PlanningDialog
          deadline={workRequest.deadline ?? null}
          startDate={workRequest.startDate ?? null}
          endDate={workRequest.endDate ?? null}
          onClose={() => setPlanningOpen(false)}
          onSave={(p) => planningMutation.mutate(p)}
          isSubmitting={planningMutation.isPending}
        />
      )}
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

function ReassignDialog({
  currentAssigneeId,
  onClose,
  onSelect,
  isSubmitting,
}: {
  currentAssigneeId: string | null;
  onClose: () => void;
  onSelect: (userId: string) => void;
  isSubmitting: boolean;
}) {
  const { data: staff = [], isLoading } = useQuery<TechnicalStaffMember[]>({
    queryKey: ['technical-staff'],
    queryFn: () => apiGet('/api/users/technical-staff'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Aanvraag toewijzen
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Kies een behandelaar uit de technische dienst.
        </p>

        <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen technische medewerkers beschikbaar.
            </p>
          ) : (
            staff.map((member) => {
              const isCurrent = member.id === currentAssigneeId;
              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={isSubmitting || isCurrent}
                  onClick={() => onSelect(member.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors',
                    isCurrent
                      ? 'cursor-not-allowed bg-muted/40 opacity-60'
                      : 'hover:bg-muted',
                  )}
                >
                  <div className="avatar-fallback h-9 w-9 text-xs">
                    {getInitials(member.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.displayName}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (huidig)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email} · {member.role.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function toDateInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD voor <input type="date">
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function PlanningDialog({
  deadline,
  startDate,
  endDate,
  onClose,
  onSave,
  isSubmitting,
}: {
  deadline: string | null;
  startDate: string | null;
  endDate: string | null;
  onClose: () => void;
  onSave: (p: {
    deadline: string | null;
    startDate: string | null;
    endDate: string | null;
  }) => void;
  isSubmitting: boolean;
}) {
  const [dl, setDl] = useState(toDateInput(deadline));
  const [sd, setSd] = useState(toDateInput(startDate));
  const [ed, setEd] = useState(toDateInput(endDate));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      deadline: dl ? new Date(dl).toISOString() : null,
      startDate: sd ? new Date(sd).toISOString() : null,
      endDate: ed ? new Date(ed).toISOString() : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarClock className="h-4 w-4" />
            Planning bewerken
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Stel deadline, geplande start- en einddatum in. Laat een veld leeg
          om het te wissen.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="planning-deadline" className="label">
              Deadline
            </label>
            <input
              id="planning-deadline"
              type="date"
              value={dl}
              onChange={(e) => setDl(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="planning-start" className="label">
              Startdatum
            </label>
            <input
              id="planning-start"
              type="date"
              value={sd}
              onChange={(e) => setSd(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="planning-end" className="label">
              Einddatum
            </label>
            <input
              id="planning-end"
              type="date"
              value={ed}
              onChange={(e) => setEd(e.target.value)}
              className="input mt-1"
            />
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
            className="btn-primary h-9 px-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  );
}
