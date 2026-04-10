'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { apiGet, apiPost } from '@/lib/api';
import { Campus, Category } from '@/types';

export default function NewWorkRequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    campusId: '',
    locationId: '',
    categoryId: '',
    priority: 'NORMAAL',
  });

  const { data: campuses } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: () => apiGet('/api/campuses'),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiGet('/api/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost('/api/work-requests', data),
    onSuccess: () => {
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Terug
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Nieuwe werkaanvraag
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Beschrijf je probleem of verzoek zo duidelijk mogelijk
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Title */}
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

          {/* Description */}
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

          {/* Campus & Location */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Campus *</label>
              <select
                className="input"
                value={formData.campusId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    campusId: e.target.value,
                    locationId: '',
                  })
                }
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
          </div>

          {/* Priority */}
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

          {/* Photo upload area */}
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

          {/* Submit */}
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
