import { cn } from '@/lib/utils';
import { getPriorityColor, getPriorityLabel } from '@/lib/utils';

interface PriorityIndicatorProps {
  priority: string;
  showLabel?: boolean;
}

export default function PriorityIndicator({
  priority,
  showLabel = true,
}: PriorityIndicatorProps) {
  const dots: Record<string, number> = {
    LAAG: 1,
    NORMAAL: 2,
    HOOG: 3,
    URGENT: 4,
  };

  const dotCount = dots[priority] || 2;
  const colorClass = getPriorityColor(priority);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              i <= dotCount ? colorClass.replace('text-', 'bg-') : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', colorClass)}>
          {getPriorityLabel(priority)}
        </span>
      )}
    </div>
  );
}
