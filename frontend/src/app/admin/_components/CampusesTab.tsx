'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Building {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

interface Room {
  id: string;
  name?: string | null;
  number?: string | null;
  description?: string | null;
}

interface Department {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  rooms: Room[];
}

interface CampusDetail {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  buildings: Building[];
  departments: Department[];
}

interface CampusSummary {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  _count?: { buildings: number; departments: number };
}

export default function CampusesTab() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: campuses = [], isLoading } = useQuery<CampusSummary[]>({
    queryKey: ['admin-campuses'],
    queryFn: () => apiGet('/api/admin/campuses'),
  });

  const { data: detail } = useQuery<CampusDetail>({
    queryKey: ['admin-campus', selectedId],
    queryFn: () => apiGet(`/api/admin/campuses/${selectedId}`),
    enabled: !!selectedId,
  });

  const createCampus = useMutation({
    mutationFn: (data: Partial<CampusSummary>) =>
      apiPost<CampusSummary>('/api/admin/campuses', data),
    onSuccess: (c: CampusSummary) => {
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] });
      toast.success('Campus aangemaakt');
      setShowNew(false);
      setSelectedId(c.id);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon campus niet aanmaken');
    },
  });

  const updateCampus = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampusSummary> }) =>
      apiPatch(`/api/admin/campuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campus', selectedId] });
      toast.success('Campus opgeslagen');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon campus niet opslaan');
    },
  });

  const deleteCampus = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/campuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] });
      toast.success('Campus verwijderd');
      setSelectedId(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon campus niet verwijderen');
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Campussen</h2>
          <button
            onClick={() => {
              setShowNew(true);
              setSelectedId(null);
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            + Nieuw
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Laden...</div>
          ) : campuses.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Nog geen campussen</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {campuses.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setSelectedId(c.id);
                      setShowNew(false);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedId === c.id
                        ? 'bg-primary-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.code}</p>
                    {c._count && (
                      <p className="mt-1 text-xs text-gray-400">
                        {c._count.buildings} gebouwen · {c._count.departments} afdelingen
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {showNew ? (
          <NewCampusForm
            onSubmit={(data) => createCampus.mutate(data)}
            onCancel={() => setShowNew(false)}
            isPending={createCampus.isPending}
          />
        ) : detail ? (
          <CampusDetailPanel
            campus={detail}
            onSave={(data) =>
              updateCampus.mutate({ id: detail.id, data })
            }
            onDelete={() => {
              if (
                confirm(
                  `Campus "${detail.name}" verwijderen? Alle gebouwen, afdelingen en kamers worden ook verwijderd.`,
                )
              ) {
                deleteCampus.mutate(detail.id);
              }
            }}
            isSaving={updateCampus.isPending}
            isDeleting={deleteCampus.isPending}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              Selecteer een campus of maak een nieuwe aan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewCampusForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '' });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900">Nieuwe campus</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Naam *</label>
          <input
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Code *</label>
          <input
            required
            className="input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Adres</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Stad</label>
          <input
            className="input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Bezig...' : 'Aanmaken'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Annuleren
        </button>
      </div>
    </form>
  );
}

function CampusDetailPanel({
  campus,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  campus: CampusDetail;
  onSave: (data: Partial<CampusDetail>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [form, setForm] = useState({
    name: campus.name,
    code: campus.code,
    address: campus.address || '',
    city: campus.city || '',
  });

  const [tab, setTab] = useState<'info' | 'buildings' | 'departments'>('info');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setTab('info')}
              className={`-mb-px border-b-2 py-3 text-sm font-medium ${
                tab === 'info'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Gegevens
            </button>
            <button
              onClick={() => setTab('buildings')}
              className={`-mb-px border-b-2 py-3 text-sm font-medium ${
                tab === 'buildings'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Gebouwen ({campus.buildings.length})
            </button>
            <button
              onClick={() => setTab('departments')}
              className={`-mb-px border-b-2 py-3 text-sm font-medium ${
                tab === 'departments'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Afdelingen ({campus.departments.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {tab === 'info' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave(form);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Naam</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Code</label>
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Adres</label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Stad</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'Bezig...' : 'Opslaan'}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="btn-danger"
                >
                  {isDeleting ? 'Bezig...' : 'Campus verwijderen'}
                </button>
              </div>
            </form>
          )}

          {tab === 'buildings' && <BuildingsSection campus={campus} />}

          {tab === 'departments' && <DepartmentsSection campus={campus} />}
        </div>
      </div>
    </div>
  );
}

function BuildingsSection({ campus }: { campus: CampusDetail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-campus', campus.id] });

  const createBuilding = useMutation({
    mutationFn: (data: typeof form) =>
      apiPost(`/api/admin/campuses/${campus.id}/buildings`, data),
    onSuccess: () => {
      invalidate();
      setForm({ name: '', code: '', description: '' });
      toast.success('Gebouw toegevoegd');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon gebouw niet toevoegen');
    },
  });

  const deleteBuilding = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/buildings/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Gebouw verwijderd');
    },
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createBuilding.mutate(form);
        }}
        className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
      >
        <input
          required
          placeholder="Naam gebouw"
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Code (optioneel)"
          className="input"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <button
          type="submit"
          disabled={createBuilding.isPending}
          className="btn-primary whitespace-nowrap"
        >
          + Toevoegen
        </button>
      </form>

      {campus.buildings.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen gebouwen gedefinieerd.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {campus.buildings.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{b.name}</p>
                {b.code && <p className="text-xs text-gray-500">Code: {b.code}</p>}
              </div>
              <button
                onClick={() => {
                  if (confirm(`Gebouw "${b.name}" verwijderen?`)) {
                    deleteBuilding.mutate(b.id);
                  }
                }}
                className="text-sm font-medium text-danger-600 hover:text-danger-700"
              >
                Verwijder
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DepartmentsSection({ campus }: { campus: CampusDetail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '' });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-campus', campus.id] });

  const createDept = useMutation({
    mutationFn: (data: typeof form) =>
      apiPost(`/api/admin/campuses/${campus.id}/departments`, data),
    onSuccess: () => {
      invalidate();
      setForm({ name: '', code: '' });
      toast.success('Afdeling toegevoegd');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon afdeling niet toevoegen');
    },
  });

  const deleteDept = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/departments/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Afdeling verwijderd');
    },
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createDept.mutate(form);
        }}
        className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
      >
        <input
          required
          placeholder="Naam afdeling"
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Code (optioneel)"
          className="input"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <button
          type="submit"
          disabled={createDept.isPending}
          className="btn-primary whitespace-nowrap"
        >
          + Toevoegen
        </button>
      </form>

      {campus.departments.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen afdelingen gedefinieerd.</p>
      ) : (
        <div className="space-y-3">
          {campus.departments.map((d) => (
            <DepartmentRow
              key={d.id}
              department={d}
              onDelete={() => {
                if (
                  confirm(
                    `Afdeling "${d.name}" verwijderen? Alle kamers worden ook verwijderd.`,
                  )
                ) {
                  deleteDept.mutate(d.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentRow({
  department,
  onDelete,
}: {
  department: Department;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', number: '' });
  const queryClient = useQueryClient();

  const createRoom = useMutation({
    mutationFn: (data: typeof roomForm) =>
      apiPost(`/api/admin/departments/${department.id}/rooms`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campus'] });
      setRoomForm({ name: '', number: '' });
      toast.success('Kamer toegevoegd');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon kamer niet toevoegen');
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campus'] });
      toast.success('Kamer verwijderd');
    },
  });

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <p className="font-medium text-gray-900">{department.name}</p>
            <p className="text-xs text-gray-500">
              {department.rooms.length}{' '}
              {department.rooms.length === 1 ? 'kamer' : 'kamers'}
            </p>
          </div>
        </button>
        <button
          onClick={onDelete}
          className="text-sm font-medium text-danger-600 hover:text-danger-700"
        >
          Verwijder
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createRoom.mutate(roomForm);
            }}
            className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
          >
            <input
              placeholder="Naam kamer"
              className="input"
              value={roomForm.name}
              onChange={(e) =>
                setRoomForm({ ...roomForm, name: e.target.value })
              }
            />
            <input
              placeholder="Nummer"
              className="input"
              value={roomForm.number}
              onChange={(e) =>
                setRoomForm({ ...roomForm, number: e.target.value })
              }
            />
            <button
              type="submit"
              disabled={createRoom.isPending || (!roomForm.name && !roomForm.number)}
              className="btn-primary whitespace-nowrap"
            >
              + Kamer
            </button>
          </form>

          {department.rooms.length === 0 ? (
            <p className="text-xs text-gray-500">Nog geen kamers.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {department.rooms.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    {r.number && (
                      <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                        {r.number}
                      </span>
                    )}
                    <span className="text-gray-900">{r.name || '-'}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Kamer verwijderen?')) {
                        deleteRoom.mutate(r.id);
                      }
                    }}
                    className="text-xs font-medium text-danger-600 hover:text-danger-700"
                  >
                    Verwijder
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
