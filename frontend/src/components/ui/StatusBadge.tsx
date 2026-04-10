import { getStatusColor, getStatusLabel } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${getStatusColor(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
}
