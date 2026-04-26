'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  FolderKanban,
  ShoppingCart,
  Settings2,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[] | null;
  section: 'workspace' | 'beheer';
  badge?: string;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: null,
    section: 'workspace',
  },
  {
    name: 'Werkaanvragen',
    href: '/work-requests',
    icon: ClipboardList,
    roles: null,
    section: 'workspace',
  },
  {
    name: 'Taken',
    href: '/tasks',
    icon: CheckSquare,
    roles: ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'],
    section: 'workspace',
  },
  {
    name: 'Projecten',
    href: '/projects',
    icon: FolderKanban,
    roles: ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'],
    section: 'workspace',
  },
  {
    name: 'Aankopen',
    href: '/purchases',
    icon: ShoppingCart,
    roles: ['TECHNISCHE_DIENST', 'DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'],
    section: 'workspace',
  },
  {
    name: 'Beheer',
    href: '/admin',
    icon: Settings2,
    roles: ['FACILITAIR_MANAGER', 'ADMIN'],
    section: 'beheer',
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredNav = navigation.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  const workspace = filteredNav.filter((i) => i.section === 'workspace');
  const beheer = filteredNav.filter((i) => i.section === 'beheer');

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-sidebar-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="brand-mark">
              <Wrench className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">
                HandyMan
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Facility Suite
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Sluit menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <NavSection label="Workspace" items={workspace} pathname={pathname} onNavigate={onClose} />
          {beheer.length > 0 && (
            <NavSection label="Beheer" items={beheer} pathname={pathname} onNavigate={onClose} />
          )}
        </nav>

        {/* Footer */}
        {user && (
          <div className="border-t border-sidebar-border p-4">
            <Link
              href="/profile"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent"
            >
              <div className="avatar-fallback h-9 w-9 text-sm">
                {user.displayName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.department || formatRole(user.role)}
                </p>
              </div>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {isActive && (
                  <span
                    className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground',
                  )}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    MEDEWERKER: 'Medewerker',
    TECHNISCHE_DIENST: 'Technische dienst',
    DIENSTHOOFD: 'Diensthoofd',
    FACILITAIR_MANAGER: 'Facilitair manager',
    ADMIN: 'Administrator',
  };
  return map[role] ?? role;
}
