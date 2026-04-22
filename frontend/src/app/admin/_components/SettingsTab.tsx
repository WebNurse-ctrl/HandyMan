'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPatch } from '@/lib/api';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string | null;
}

const LABELS: Record<string, { label: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] }> = {
  organization_name: { label: 'Organisatienaam', type: 'text' },
  support_email: { label: 'Support e-mailadres', type: 'text' },
  small_purchase_threshold: {
    label: 'Drempel kleine aankoop (EUR)',
    type: 'number',
  },
  auto_assign_requests: {
    label: 'Automatisch toewijzen van werkaanvragen',
    type: 'boolean',
  },
  default_request_priority: {
    label: 'Standaard prioriteit',
    type: 'select',
    options: ['LAAG', 'NORMAAL', 'HOOG', 'URGENT'],
  },
  notification_email_enabled: {
    label: 'E-mailnotificaties ingeschakeld',
    type: 'boolean',
  },
  deadline_reminder_days: {
    label: 'Herinnering aantal dagen voor deadline',
    type: 'number',
  },
};

export default function SettingsTab() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ['admin-settings'],
    queryFn: () => apiGet('/api/admin/settings'),
  });

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    settings.forEach((s) => {
      initial[s.key] = s.value;
    });
    setValues(initial);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Array<{ key: string; value: string }>) =>
      apiPatch('/api/admin/settings', { settings: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Instellingen opgeslagen');
    },
    onError: () => {
      toast.error('Kon instellingen niet opslaan');
    },
  });

  const handleSave = () => {
    const payload = Object.entries(values).map(([key, value]) => ({ key, value }));
    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Systeeminstellingen
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Pas de algemene instellingen aan die van toepassing zijn op de hele
            applicatie.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {settings.map((setting) => {
            const meta = LABELS[setting.key] || { label: setting.key, type: 'text' };
            return (
              <div
                key={setting.id}
                className="grid gap-4 px-6 py-4 md:grid-cols-[1fr_320px] md:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {meta.label}
                  </p>
                  {setting.description && (
                    <p className="mt-1 text-xs text-gray-500">
                      {setting.description}
                    </p>
                  )}
                </div>
                <SettingInput
                  setting={setting}
                  meta={meta}
                  value={values[setting.key] ?? ''}
                  onChange={(v) =>
                    setValues({ ...values, [setting.key]: v })
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            {saveMutation.isPending ? 'Bezig...' : 'Alles opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingInput({
  setting,
  meta,
  value,
  onChange,
}: {
  setting: Setting;
  meta: { label: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] };
  value: string;
  onChange: (v: string) => void;
}) {
  if (meta.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">
          {value === 'true' ? 'Aan' : 'Uit'}
        </span>
      </label>
    );
  }

  if (meta.type === 'select' && meta.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {meta.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={meta.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      placeholder={setting.description || ''}
    />
  );
}
