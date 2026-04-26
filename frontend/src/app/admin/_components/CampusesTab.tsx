'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  buildingId?: string | null;
  rooms: Room[];
}

interface Building {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  departments: Department[];
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

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery<CampusDetail>({
    queryKey: ['admin-campus', selectedId],
    queryFn: () => apiGet(`/api/admin/campuses/${selectedId}`),
    enabled: !!selectedId,
    retry: false,
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
          <h2 className="text-sm font-semibold text-foreground">Campussen</h2>
          <button
            type="button"
            onClick={() => {
              setShowNew(true);
              setSelectedId(null);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nieuw
          </button>
        </div>

        <div className="surface overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Laden...</div>
          ) : campuses.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nog geen campussen</div>
          ) : (
            <ul className="divide-y divide-border">
              {campuses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setShowNew(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-3 text-left transition-colors',
                      selectedId === c.id
                        ? 'bg-primary/10'
                        : 'hover:bg-muted',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-medium',
                          selectedId === c.id ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {c.name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                      {c._count && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c._count.buildings} gebouwen · {c._count.departments} afdelingen
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        selectedId === c.id ? 'text-primary' : 'text-muted-foreground/50',
                      )}
                    />
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
        ) : selectedId && detailLoading ? (
          <div className="flex h-64 items-center justify-center surface">
            <p className="text-sm text-muted-foreground">Laden...</p>
          </div>
        ) : selectedId && detailError ? (
          <DetailErrorPanel error={detailError} />
        ) : detail ? (
          <CampusDetailPanel
            campus={detail}
            onSave={(data) => updateCampus.mutate({ id: detail.id, data })}
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
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              Selecteer een campus of maak een nieuwe aan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailErrorPanel({ error }: { error: unknown }) {
  const err = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  const status = err.response?.status;
  const message =
    err.response?.data?.message || err.message || 'Onbekende fout';

  return (
    <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
      <h3 className="text-base font-semibold text-destructive">
        Kon campusdetails niet laden
      </h3>
      <p className="text-sm text-destructive/90">
        {status ? `HTTP ${status}: ` : ''}
        {message}
      </p>
      <div className="rounded-lg bg-card p-3 text-xs text-foreground">
        <p className="mb-1 font-semibold">Meest voorkomende oorzaak</p>
        <p className="text-muted-foreground">
          De database is niet bijgewerkt voor de nieuwste schema-wijzigingen
          (kolom <code className="font-mono">building_id</code> op{' '}
          <code className="font-mono">departments</code>, of de locatie-kolommen
          op <code className="font-mono">work_requests</code>). Voer de SQL uit
          die in de handover-notities staat en herlaad deze pagina.
        </p>
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
      className="card space-y-4"
    >
      <h3 className="text-lg font-semibold text-foreground">Nieuwe campus</h3>
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

  const directDeptCount = campus.departments.length;

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-border px-6">
        <nav className="flex gap-1">
          {[
            { id: 'info' as const, label: 'Gegevens' },
            {
              id: 'buildings' as const,
              label: `Gebouwen (${campus.buildings.length})`,
            },
            {
              id: 'departments' as const,
              label: `Afdelingen direct (${directDeptCount})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative px-3 py-3 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
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
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button type="submit" disabled={isSaving} className="btn-primary">
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

        {tab === 'departments' && (
          <DepartmentsSection
            campusId={campus.id}
            departments={campus.departments}
            scope="campus"
            emptyText="Deze campus heeft nog geen afdelingen die rechtstreeks onder de campus vallen. Voeg er een toe als deze campus niet uit aparte gebouwen bestaat."
          />
        )}
      </div>
    </div>
  );
}

function BuildingsSection({ campus }: { campus: CampusDetail }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          <Plus className="h-4 w-4" />
          Toevoegen
        </button>
      </form>

      {campus.buildings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen gebouwen gedefinieerd.</p>
      ) : (
        <div className="space-y-3">
          {campus.buildings.map((b) => (
            <BuildingRow
              key={b.id}
              building={b}
              expanded={expandedId === b.id}
              onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
              onDelete={() => {
                if (
                  confirm(
                    `Gebouw "${b.name}" verwijderen? Alle afdelingen en kamers in dit gebouw worden ook verwijderd.`,
                  )
                ) {
                  deleteBuilding.mutate(b.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BuildingRow({
  building,
  expanded,
  onToggle,
  onDelete,
}: {
  building: Building;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <div>
            <p className="font-medium text-foreground">{building.name}</p>
            <p className="text-xs text-muted-foreground">
              {building.code && <span className="mr-2">Code: {building.code}</span>}
              {building.departments.length}{' '}
              {building.departments.length === 1 ? 'afdeling' : 'afdelingen'}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Verwijder
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/40 px-4 py-4">
          <DepartmentsSection
            buildingId={building.id}
            departments={building.departments}
            scope="building"
            emptyText="Nog geen afdelingen in dit gebouw."
          />
        </div>
      )}
    </div>
  );
}

function DepartmentsSection({
  campusId,
  buildingId,
  departments,
  scope,
  emptyText,
}: {
  campusId?: string;
  buildingId?: string;
  departments: Department[];
  scope: 'campus' | 'building';
  emptyText: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '' });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-campus'] });

  const createDept = useMutation({
    mutationFn: (data: typeof form) => {
      const url =
        scope === 'building'
          ? `/api/admin/buildings/${buildingId}/departments`
          : `/api/admin/campuses/${campusId}/departments`;
      return apiPost(url, data);
    },
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
          <Plus className="h-4 w-4" />
          Toevoegen
        </button>
      </form>

      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {departments.map((d) => (
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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <div>
            <p className="font-medium text-foreground">{department.name}</p>
            <p className="text-xs text-muted-foreground">
              {department.rooms.length}{' '}
              {department.rooms.length === 1 ? 'kamer' : 'kamers'}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Verwijder
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border bg-muted/40 px-4 py-3">
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
              onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
            />
            <input
              placeholder="Nummer"
              className="input"
              value={roomForm.number}
              onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })}
            />
            <button
              type="submit"
              disabled={createRoom.isPending || (!roomForm.name && !roomForm.number)}
              className="btn-primary whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Kamer
            </button>
          </form>

          {department.rooms.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen kamers.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {department.rooms.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    {r.number && (
                      <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {r.number}
                      </span>
                    )}
                    <span className="text-foreground">{r.name || '—'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Kamer verwijderen?')) {
                        deleteRoom.mutate(r.id);
                      }
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
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
