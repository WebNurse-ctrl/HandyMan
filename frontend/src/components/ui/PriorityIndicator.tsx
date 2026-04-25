import { cn, getPriorityConfig } from '@/lib/utils';

interface PriorityIndicatorProps {
  priority: string;
  showLabel?: boolean;
  variant?: 'badge' | 'dots';
  className?: string;
}

const DOT_COUNT: Record<string, number> = {
  LAAG: 1,
  NORMAAL: 2,
  HOOG: 3,
  URGENT: 4,
};

export default function PriorityIndicator({
  priority,
  showLabel = true,
  variant = 'badge',
  className,
}: PriorityIndicatorProps) {
  const config = getPriorityConfig(priority);
  const dotCount = DOT_COUNT[priority] ?? 2;

  const dots = (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i <= dotCount ? config.dot : 'bg-gray-200',
          )}
        />
      ))}
    </div>
  );

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {dots}
        {showLabel && (
          <span className={cn('text-xs font-medium', config.text)}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.badge,
        className,
      )}
    >
      {dots}
      {showLabel && config.label}
    </span>
  );
}
