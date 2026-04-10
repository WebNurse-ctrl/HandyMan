import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const colorMap = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
}: StatCardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success-600' : 'text-danger-600',
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-gray-400">vs vorige maand</span>
          </div>
        )}
      </div>
      {icon && (
        <div className={cn('rounded-lg p-2.5', colorMap[color])}>
          {icon}
        </div>
      )}
    </div>
  );
}
