'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'segmented';
  className?: string;
}

const OPTIONS = [
  { value: 'light', label: 'Licht', icon: Sun },
  { value: 'dark', label: 'Donker', icon: Moon },
  { value: 'system', label: 'Systeem', icon: Monitor },
] as const;

export default function ThemeToggle({
  variant = 'icon',
  className,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          variant === 'icon'
            ? 'h-9 w-9 rounded-md bg-muted'
            : 'h-10 w-full rounded-md bg-muted',
          className,
        )}
      />
    );
  }

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex rounded-lg border border-border bg-muted p-1',
          className,
        )}
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Single icon button: cycles light → dark → system
  const current = resolvedTheme === 'dark' ? Moon : Sun;
  const Icon = current;

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label="Toggle theme"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
