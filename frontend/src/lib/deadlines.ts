import { WorkRequestStatus } from '@/types';

/** Aanvraag wordt als "deadline nadert" gemarkeerd vanaf 3 dagen vóór de deadline. */
export const APPROACHING_THRESHOLD_DAYS = 3;
const APPROACHING_THRESHOLD_MS = APPROACHING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES = new Set<WorkRequestStatus>([
  'AFGEWERKT',
  'GEWEIGERD',
]);

export type DeadlineState =
  | 'none' // geen deadline gezet, of aanvraag is afgewerkt/geweigerd
  | 'fine' // deadline > 3 dagen weg
  | 'approaching' // deadline binnen 3 dagen
  | 'overdue'; // deadline gepasseerd

export function getDeadlineState(
  deadline: Date | string | null | undefined,
  status: WorkRequestStatus | null | undefined,
  now: Date = new Date(),
): DeadlineState {
  if (!deadline) return 'none';
  if (status && TERMINAL_STATUSES.has(status)) return 'none';
  const dl = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (Number.isNaN(dl.getTime())) return 'none';
  const diff = dl.getTime() - now.getTime();
  if (diff < 0) return 'overdue';
  if (diff <= APPROACHING_THRESHOLD_MS) return 'approaching';
  return 'fine';
}

export function daysUntilDeadline(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!deadline) return null;
  const dl = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (Number.isNaN(dl.getTime())) return null;
  return Math.ceil((dl.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
