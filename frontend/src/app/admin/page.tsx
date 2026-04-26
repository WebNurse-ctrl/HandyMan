'use client';

import { useState } from 'react';
import {
  Users,
  Building2,
  Tags,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import UsersTab from './_components/UsersTab';
import CampusesTab from './_components/CampusesTab';
import CategoriesTab from './_components/CategoriesTab';
import SettingsTab from './_components/SettingsTab';
import { cn } from '@/lib/utils';

type Tab = 'users' | 'campuses' | 'categories' | 'settings';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'users', label: 'Gebruikers', icon: Users },
  { id: 'campuses', label: 'Campussen', icon: Building2 },
  { id: 'categories', label: 'Categorieën', icon: Tags },
  { id: 'settings', label: 'Instellingen', icon: SettingsIcon },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Beheer"
          description="Campussen, categorieën, instellingen en gebruikersbeheer"
        />

        <div className="border-b border-border">
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
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
          {tab === 'users' && <UsersTab />}
          {tab === 'campuses' && <CampusesTab />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </AppLayout>
  );
}
