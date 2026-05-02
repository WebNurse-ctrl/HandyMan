'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const POPOVER_WIDTH = 256;
const POPOVER_MAX_HEIGHT = 320;
const POPOVER_GAP = 4;

/**
 * Multi-select voor campus-scope.
 * Lege selectie = volledige organisatie. De knop toont een korte
 * samenvatting; klikken opent een popover-portal met checkboxes
 * (rendert op `document.body` zodat een krappe parent niet clipt).
 */
export default function ScopeCampusSelector({
  campuses,
  value,
  onChange,
  disabled,
  compact,
}: ScopeCampusSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Bereken popover-positie wanneer geopend, en sluit bij scroll/resize.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      // Ruimte onder de knop; anders boven openen.
      const spaceBelow = viewportH - rect.bottom;
      const openUpward = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow;
      const top = openUpward
        ? Math.max(8, rect.top - POPOVER_MAX_HEIGHT - POPOVER_GAP)
        : rect.bottom + POPOVER_GAP;
      // Houd popover binnen viewport-breedte.
      const left = Math.min(
        Math.max(8, rect.left),
        viewportW - POPOVER_WIDTH - 8,
      );
      setPos({ top, left });
    };
    update();
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Sluit bij klik buiten knop én buiten popover.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
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
    <>
      <button
        ref={buttonRef}
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

      {mounted && open && pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              zIndex: 100,
            }}
            className="overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg"
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
                {value.length === 0 && (
                  <span className="text-[10px] leading-none">●</span>
                )}
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
          </div>,
          document.body,
        )}
    </>
  );
}
