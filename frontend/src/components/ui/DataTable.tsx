'use client';

import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  isLoading,
  emptyMessage = 'Geen resultaten gevonden',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="animate-pulse">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="h-4 w-full rounded bg-gray-200" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b border-gray-100 px-6 py-4">
              <div className="h-4 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500',
                    col.className,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors',
                  onRowClick
                    ? 'cursor-pointer hover:bg-gray-50'
                    : '',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-6 py-4 text-sm',
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
