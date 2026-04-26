'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, LogOut, Menu, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { getInitials } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:pl-64">
      <div className="flex w-full items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="hidden flex-1 sm:block sm:max-w-md">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Zoeken..."
              className="h-9 w-full rounded-md border border-input bg-muted/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          {/* Notifications */}
          <Link
            href="/dashboard"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notificaties"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount && unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>

          {/* User menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((s) => !s)}
              className={cn(
                'flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-muted',
                showUserMenu && 'bg-muted',
              )}
            >
              <div className="avatar-fallback h-8 w-8 text-xs">
                {getInitials(user?.displayName)}
              </div>
              <span className="hidden text-sm font-medium text-foreground md:block">
                {user?.displayName?.split(' ')[0]}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-fade-in overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-elevated">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {user?.role?.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Profiel & voorkeuren
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  Uitloggen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
