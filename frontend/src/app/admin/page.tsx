'use client';

import { useState } from 'react';
import {
  Mail,
  Users,
  Building2,
  Tags,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import UsersTab from './_components/UsersTab';
import InvitationsTab from './_components/InvitationsTab';
import CampusesTab from './_components/CampusesTab';
import CategoriesTab from './_components/CategoriesTab';
import SettingsTab from './_components/SettingsTab';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type Tab = 'users' | 'invitations' | 'campuses' | 'categories' | 'settings';

const TABS: { id: Tab; label: string; icon: LucideIcon; roles: string[] }[] = [
  { id: 'users', label: 'Gebruikers', icon: Users, roles: ['ADMIN', 'FACILITAIR_MANAGER', 'DIENSTHOOFD'] },
  { id: 'invitations', label: 'Uitnodigingen', icon: Mail, roles: ['ADMIN', 'FACILITAIR_MANAGER', 'DIENSTHOOFD'] },
  { id: 'campuses', label: 'Campussen', icon: Building2, roles: ['ADMIN', 'FACILITAIR_MANAGER'] },
  { id: 'categories', label: 'Categorieën', icon: Tags, roles: ['ADMIN', 'FACILITAIR_MANAGER'] },
  { id: 'settings', label: 'Instellingen', icon: SettingsIcon, roles: ['ADMIN', 'FACILITAIR_MANAGER'] },
];

export default function AdminPage() {
  const { user } = useAuth();
  const visibleTabs = TABS.filter((t) => !user || t.roles.includes(user.role));
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? 'users');

  const activeId = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Beheer"
          description="Gebruikers, uitnodigingen en organisatiestructuur"
        />

        <div className="border-b border-border">
          <nav className="flex flex-wrap gap-1">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = activeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="animate-fade-in">
          {activeId === 'users' && <UsersTab />}
          {activeId === 'invitations' && <InvitationsTab />}
          {activeId === 'campuses' && <CampusesTab />}
          {activeId === 'categories' && <CategoriesTab />}
          {activeId === 'settings' && <SettingsTab />}
        </div>
      </div>
    </AppLayout>
  );
}
