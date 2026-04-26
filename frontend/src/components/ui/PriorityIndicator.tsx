import { cn } from '@/lib/utils';
import { getPriorityLabel } from '@/lib/utils';

interface PriorityIndicatorProps {
  priority: string;
  showLabel?: boolean;
}

const styleMap: Record<string, { dot: string; text: string }> = {
  LAAG: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  NORMAAL: { dot: 'bg-primary', text: 'text-primary' },
  HOOG: { dot: 'bg-warning', text: 'text-warning' },
  URGENT: { dot: 'bg-destructive', text: 'text-destructive' },
};

const dotsMap: Record<string, number> = {
  LAAG: 1,
  NORMAAL: 2,
  HOOG: 3,
  URGENT: 4,
};

export default function PriorityIndicator({
  priority,
  showLabel = true,
}: PriorityIndicatorProps) {
  const dotCount = dotsMap[priority] ?? 2;
  const styles = styleMap[priority] ?? styleMap.NORMAAL;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              i <= dotCount ? styles.dot : 'bg-muted',
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', styles.text)}>
          {getPriorityLabel(priority)}
        </span>
      )}
    </div>
  );
}
