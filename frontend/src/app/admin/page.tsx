'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UsersTab from './_components/UsersTab';
import CampusesTab from './_components/CampusesTab';
import CategoriesTab from './_components/CategoriesTab';
import SettingsTab from './_components/SettingsTab';

type Tab = 'users' | 'campuses' | 'categories' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Gebruikers' },
  { id: 'campuses', label: 'Campussen' },
  { id: 'categories', label: 'Categorieën' },
  { id: 'settings', label: 'Instellingen' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beheer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Campussen, categorieën, instellingen en gebruikersbeheer
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-6 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-primary-600 font-semibold text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'campuses' && <CampusesTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </AppLayout>
  );
}
