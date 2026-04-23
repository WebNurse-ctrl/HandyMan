'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { apiGet, apiPost } from '@/lib/api';
import { Campus, Category } from '@/types';

interface BuildingOption {
  id: string;
  name: string;
  code?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  code?: string | null;
  buildingId?: string | null;
}

interface RoomOption {
  id: string;
  name?: string | null;
  number?: string | null;
}

type LocationScope = 'building' | 'direct';

export default function NewWorkRequestPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    campusId: '',
    buildingId: '',
    departmentId: '',
    roomId: '',
    categoryId: '',
    priority: 'NORMAAL',
  });
  const [scope, setScope] = useState<LocationScope>('building');

  const { data: campuses } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: () => apiGet('/api/campuses'),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiGet('/api/categories'),
  });

  const { data: buildings = [] } = useQuery<BuildingOption[]>({
    queryKey: ['buildings', formData.campusId],
    queryFn: () =>
      apiGet('/api/buildings', { campusId: formData.campusId }),
    enabled: !!formData.campusId,
  });

  const departmentsQueryKey =
    scope === 'building' && formData.buildingId
      ? ['departments', 'building', formData.buildingId]
      : scope === 'direct' && formData.campusId
        ? ['departments', 'campus-direct', formData.campusId]
        : ['departments', 'none'];

  const { data: departments = [] } = useQuery<DepartmentOption[]>({
    queryKey: departmentsQueryKey,
    queryFn: () => {
      if (scope === 'building' && formData.buildingId) {
        return apiGet('/api/departments', { buildingId: formData.buildingId });
      }
      if (scope === 'direct' && formData.campusId) {
        return apiGet('/api/departments', {
          campusId: formData.campusId,
          scope: 'direct',
        });
      }
      return Promise.resolve([]);
    },
    enabled:
      (scope === 'building' && !!formData.buildingId) ||
      (scope === 'direct' && !!formData.campusId),
  });

  const { data: rooms = [] } = useQuery<RoomOption[]>({
    queryKey: ['rooms', formData.departmentId],
    queryFn: () =>
      apiGet('/api/rooms', { departmentId: formData.departmentId }),
    enabled: !!formData.departmentId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiPost('/api/work-requests', {
        title: data.title,
        description: data.description,
        campusId: data.campusId,
        buildingId: data.buildingId || undefined,
        departmentId: data.departmentId || undefined,
        roomId: data.roomId || undefined,
        categoryId: data.categoryId || undefined,
        priority: data.priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Werkaanvraag succesvol ingediend!');
      router.push('/work-requests');
    },
    onError: () => {
      toast.error('Er is iets misgegaan bij het indienen');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleCampusChange = (campusId: string) => {
    setFormData({
      ...formData,
      campusId,
      buildingId: '',
      departmentId: '',
      roomId: '',
    });
    setScope('building');
  };

  const handleScopeChange = (next: LocationScope) => {
    setScope(next);
    setFormData({
      ...formData,
      buildingId: '',
      departmentId: '',
      roomId: '',
    });
  };

  const handleBuildingChange = (buildingId: string) => {
    setFormData({ ...formData, buildingId, departmentId: '', roomId: '' });
  };

  const handleDepartmentChange = (departmentId: string) => {
    setFormData({ ...formData, departmentId, roomId: '' });
  };

  const hasBuildings = buildings.length > 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Terug
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nieuwe werkaanvraag</h1>
          <p className="mt-1 text-sm text-gray-500">
            Beschrijf je probleem of verzoek zo duidelijk mogelijk
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Titel *</label>
            <input
              type="text"
              className="input"
              placeholder="Kort omschrijving van het probleem"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="label">Omschrijving *</label>
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Geef een gedetailleerde beschrijving..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="label">Locatie</label>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Campus *
                </label>
                <select
                  className="input mt-1"
                  value={formData.campusId}
                  onChange={(e) => handleCampusChange(e.target.value)}
                  required
                >
                  <option value="">Selecteer campus</option>
                  {campuses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.campusId && hasBuildings && (
                <div className="flex gap-4 rounded-lg border border-gray-200 bg-white p-3 text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={scope === 'building'}
                      onChange={() => handleScopeChange('building')}
                      className="h-3.5 w-3.5 text-primary-600"
                    />
                    <span className="text-gray-700">In een gebouw</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={scope === 'direct'}
                      onChange={() => handleScopeChange('direct')}
                      className="h-3.5 w-3.5 text-primary-600"
                    />
                    <span className="text-gray-700">
                      Direct op campus (zonder gebouw)
                    </span>
                  </label>
                </div>
              )}

              {formData.campusId && scope === 'building' && hasBuildings && (
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Gebouw
                  </label>
                  <select
                    className="input mt-1"
                    value={formData.buildingId}
                    onChange={(e) => handleBuildingChange(e.target.value)}
                  >
                    <option value="">Selecteer gebouw</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.code ? ` (${b.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.campusId && !hasBuildings && (
                <p className="text-xs text-gray-500">
                  Deze campus heeft geen gebouwen. Selecteer direct een
                  afdeling.
                </p>
              )}

              {((scope === 'building' && formData.buildingId) ||
                scope === 'direct') &&
                formData.campusId && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Afdeling
                    </label>
                    <select
                      className="input mt-1"
                      value={formData.departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={departments.length === 0}
                    >
                      <option value="">
                        {departments.length === 0
                          ? 'Geen afdelingen beschikbaar'
                          : 'Selecteer afdeling'}
                      </option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {formData.departmentId && (
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Kamer / ruimte
                  </label>
                  <select
                    className="input mt-1"
                    value={formData.roomId}
                    onChange={(e) =>
                      setFormData({ ...formData, roomId: e.target.value })
                    }
                    disabled={rooms.length === 0}
                  >
                    <option value="">
                      {rooms.length === 0
                        ? 'Geen kamers beschikbaar'
                        : 'Selecteer kamer (optioneel)'}
                    </option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.number ? `${r.number} — ` : ''}
                        {r.name || 'Onbenoemd'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Categorie</label>
            <select
              className="input"
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
            >
              <option value="">Selecteer categorie</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Prioriteit</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'LAAG', label: 'Laag', color: 'border-gray-300' },
                {
                  value: 'NORMAAL',
                  label: 'Normaal',
                  color: 'border-primary-300',
                },
                { value: 'HOOG', label: 'Hoog', color: 'border-warning-300' },
                {
                  value: 'URGENT',
                  label: 'Urgent',
                  color: 'border-danger-300',
                },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, priority: p.value })
                  }
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                    formData.priority === p.value
                      ? `${p.color} bg-gray-50 ring-2 ring-offset-1`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Foto (optioneel)</label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-gray-400">
              <div className="text-center">
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  Sleep een foto hierheen of{' '}
                  <span className="font-medium text-primary-600">
                    klik om te uploaden
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PNG, JPG tot 10MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Indienen...' : 'Aanvraag indienen'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
