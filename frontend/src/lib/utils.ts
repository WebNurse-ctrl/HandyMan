import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Work Request statuses
    INGEDIEND: 'badge-info',
    IN_BEHANDELING: 'badge-warning',
    GOEDGEKEURD: 'badge-success',
    AFGEWERKT: 'badge-success',
    GEWEIGERD: 'badge-danger',
    // Task statuses
    OPEN: 'badge-info',
    IN_UITVOERING: 'badge-warning',
    ON_HOLD: 'badge-neutral',
    // Project statuses
    PLANNING: 'badge-info',
    ACTIEF: 'badge-warning',
    AFGEROND: 'badge-success',
    GEANNULEERD: 'badge-danger',
    // Purchase statuses
    AANGEVRAAGD: 'badge-info',
    WACHT_OP_GOEDKEURING: 'badge-warning',
    GOEDGEKEURD_DIENSTHOOFD: 'badge-warning',
    AFGEWEZEN: 'badge-danger',
    BESTELD: 'badge-info',
    GELEVERD: 'badge-success',
  };
  return colors[status] || 'badge-neutral';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INGEDIEND: 'Ingediend',
    IN_BEHANDELING: 'In behandeling',
    GOEDGEKEURD: 'Goedgekeurd',
    AFGEWERKT: 'Afgewerkt',
    GEWEIGERD: 'Geweigerd',
    OPEN: 'Open',
    IN_UITVOERING: 'In uitvoering',
    ON_HOLD: 'On hold',
    PLANNING: 'Planning',
    ACTIEF: 'Actief',
    AFGEROND: 'Afgerond',
    GEANNULEERD: 'Geannuleerd',
    AANGEVRAAGD: 'Aangevraagd',
    WACHT_OP_GOEDKEURING: 'Wacht op goedkeuring',
    GOEDGEKEURD_DIENSTHOOFD: 'Goedgekeurd (diensthoofd)',
    AFGEWEZEN: 'Afgewezen',
    BESTELD: 'Besteld',
    GELEVERD: 'Geleverd',
  };
  return labels[status] || status;
}

// ---------------------------------------------------------------------------
// Priority — single source of truth for label, colors and ordering.
// All views (list, detail, forms, badges) MUST read from here so that the
// visual language stays consistent everywhere.
// ---------------------------------------------------------------------------
export type PriorityValue = 'LAAG' | 'NORMAAL' | 'HOOG' | 'URGENT';

export interface PriorityConfig {
  value: PriorityValue;
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
  ring: string;
  badge: string;
}

export const PRIORITY_OPTIONS: PriorityConfig[] = [
  {
    value: 'LAAG',
    label: 'Laag',
    dot: 'bg-gray-400',
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    ring: 'ring-gray-300',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  {
    value: 'NORMAAL',
    label: 'Gemiddeld',
    dot: 'bg-primary-500',
    text: 'text-primary-700',
    bg: 'bg-primary-50',
    border: 'border-primary-300',
    ring: 'ring-primary-300',
    badge: 'bg-primary-100 text-primary-700 border-primary-200',
  },
  {
    value: 'HOOG',
    label: 'Hoog',
    dot: 'bg-warning-500',
    text: 'text-warning-700',
    bg: 'bg-warning-50',
    border: 'border-warning-300',
    ring: 'ring-warning-300',
    badge: 'bg-warning-100 text-warning-700 border-warning-200',
  },
  {
    value: 'URGENT',
    label: 'Dringend',
    dot: 'bg-danger-500',
    text: 'text-danger-700',
    bg: 'bg-danger-50',
    border: 'border-danger-300',
    ring: 'ring-danger-300',
    badge: 'bg-danger-100 text-danger-700 border-danger-200',
  },
];

const PRIORITY_BY_VALUE: Record<string, PriorityConfig> = Object.fromEntries(
  PRIORITY_OPTIONS.map((p) => [p.value, p]),
);

export function getPriorityConfig(priority: string): PriorityConfig {
  return PRIORITY_BY_VALUE[priority] ?? PRIORITY_OPTIONS[1];
}

export function getPriorityColor(priority: string): string {
  return getPriorityConfig(priority).text;
}

export function getPriorityLabel(priority: string): string {
  return getPriorityConfig(priority).label;
}
