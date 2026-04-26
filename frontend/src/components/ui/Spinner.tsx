import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 24, className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-muted border-t-primary',
        className,
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Laden"
    />
  );
}
