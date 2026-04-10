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

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LAAG: 'text-gray-500',
    NORMAAL: 'text-primary-600',
    HOOG: 'text-warning-600',
    URGENT: 'text-danger-600',
  };
  return colors[priority] || 'text-gray-500';
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LAAG: 'Laag',
    NORMAAL: 'Normaal',
    HOOG: 'Hoog',
    URGENT: 'Urgent',
  };
  return labels[priority] || priority;
}
