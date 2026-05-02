'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Campus } from '@/types';

interface ScopeCampusSelectorProps {
  campuses: Campus[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Optionele compacte rendering voor in tabelcellen */
  compact?: boolean;
}

/**
 * Multi-select voor campus-scope.
 * Lege selectie = volledige organisatie. De knop toont een korte
 * samenvatting; klikken opent een popover met checkboxes.
 */
export default function ScopeCampusSelector({
  campuses,
  value,
  onChange,
  disabled,
  compact,
}: ScopeCampusSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = (campusId: string) => {
    if (value.includes(campusId)) {
      onChange(value.filter((id) => id !== campusId));
    } else {
      onChange([...value, campusId]);
    }
  };

  const summary =
    value.length === 0
      ? 'Volledige organisatie'
      : value.length === 1
        ? `Campus ${campuses.find((c) => c.id === value[0])?.name ?? '?'}`
        : `${value.length} campussen`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'input flex items-center justify-between gap-2 text-left',
          compact ? 'h-9 max-w-[220px] py-0 text-sm' : 'h-10',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-30 mt-1 w-64 rounded-lg border border-border bg-popover p-1.5 shadow-lg',
            'max-h-72 overflow-y-auto',
          )}
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
              value.length === 0
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-muted',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                value.length === 0
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border',
              )}
            >
              {value.length === 0 && <span className="text-[10px] leading-none">●</span>}
            </span>
            Volledige organisatie
          </button>
          <div className="my-1 h-px bg-border" />
          {campuses.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Geen campussen beschikbaar.
            </p>
          ) : (
            campuses.map((c) => {
              const checked = value.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
