'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export default function CategoriesTab() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => apiGet('/api/admin/categories'),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      color?: string;
      description?: string;
      parentId?: string;
    }) => apiPost('/api/admin/categories', data),
    onSuccess: () => {
      invalidate();
      toast.success('Categorie aangemaakt');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon categorie niet aanmaken');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      apiPatch(`/api/admin/categories/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success('Categorie opgeslagen');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon categorie niet opslaan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Categorie verwijderd');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Kon categorie niet verwijderen');
    },
  });

  return (
    <div className="space-y-6">
      <NewCategoryForm
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Categorieën ({categories.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Laden...</div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Nog geen categorieën. Maak hierboven een nieuwe aan.
            </div>
          ) : (
            categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onUpdate={(data) =>
                  updateMutation.mutate({ id: cat.id, data })
                }
                onDelete={() => {
                  if (confirm(`Categorie "${cat.name}" verwijderen?`)) {
                    deleteMutation.mutate(cat.id);
                  }
                }}
                onAddSub={(data) =>
                  createMutation.mutate({ ...data, parentId: cat.id })
                }
                onUpdateSub={(id, data) => updateMutation.mutate({ id, data })}
                onDeleteSub={(id) => {
                  if (confirm('Subcategorie verwijderen?')) {
                    deleteMutation.mutate(id);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewCategoryForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { name: string; color?: string; description?: string }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!HEX_RE.test(form.color)) {
          toast.error('Ongeldige HEX kleur');
          return;
        }
        onSubmit({
          name: form.name,
          color: form.color,
          description: form.description || undefined,
        });
        setForm({ name: '', color: '#3b82f6', description: '' });
      }}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Nieuwe categorie
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input
          required
          placeholder="Naam"
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <ColorPicker
          value={form.color}
          onChange={(v) => setForm({ ...form, color: v })}
        />
        <input
          placeholder="Omschrijving (optioneel)"
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary whitespace-nowrap"
        >
          + Toevoegen
        </button>
      </div>
    </form>
  );
}

function CategoryRow({
  category,
  onUpdate,
  onDelete,
  onAddSub,
  onUpdateSub,
  onDeleteSub,
}: {
  category: Category;
  onUpdate: (data: Partial<Category>) => void;
  onDelete: () => void;
  onAddSub: (data: { name: string; color?: string }) => void;
  onUpdateSub: (id: string, data: Partial<Category>) => void;
  onDeleteSub: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: category.name,
    color: category.color || '#64748b',
    description: category.description || '',
  });
  const [subForm, setSubForm] = useState({ name: '', color: '#64748b' });

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 text-left"
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
          <div
            className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
            style={{ backgroundColor: category.color || '#e5e7eb' }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{category.name}</p>
            {category.description && (
              <p className="truncate text-xs text-gray-500">
                {category.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-gray-500">
            {category.children?.length || 0} sub
          </span>
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {editing ? 'Sluit' : 'Bewerk'}
        </button>
        <button
          onClick={onDelete}
          className="text-sm font-medium text-danger-600 hover:text-danger-700"
        >
          Verwijder
        </button>
      </div>

      {editing && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!HEX_RE.test(form.color)) {
                toast.error('Ongeldige HEX kleur');
                return;
              }
              onUpdate(form);
              setEditing(false);
            }}
            className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]"
          >
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <ColorPicker
              value={form.color}
              onChange={(v) => setForm({ ...form, color: v })}
            />
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Opslaan
            </button>
          </form>
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!HEX_RE.test(subForm.color)) {
                toast.error('Ongeldige HEX kleur');
                return;
              }
              onAddSub(subForm);
              setSubForm({ name: '', color: '#64748b' });
            }}
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <input
              required
              placeholder="Subcategorie naam"
              className="input"
              value={subForm.name}
              onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            />
            <ColorPicker
              value={subForm.color}
              onChange={(v) => setSubForm({ ...subForm, color: v })}
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              + Sub
            </button>
          </form>

          {category.children && category.children.length > 0 && (
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              {category.children.map((sub) => (
                <SubCategoryItem
                  key={sub.id}
                  sub={sub}
                  onUpdate={(data) => onUpdateSub(sub.id, data)}
                  onDelete={() => onDeleteSub(sub.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SubCategoryItem({
  sub,
  onUpdate,
  onDelete,
}: {
  sub: Category;
  onUpdate: (data: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: sub.name,
    color: sub.color || '#64748b',
  });

  if (editing) {
    return (
      <li className="p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!HEX_RE.test(form.color)) {
              toast.error('Ongeldige HEX kleur');
              return;
            }
            onUpdate(form);
            setEditing(false);
          }}
          className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <input
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <ColorPicker
            value={form.color}
            onChange={(v) => setForm({ ...form, color: v })}
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Opslaan
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-ghost whitespace-nowrap"
          >
            Annuleer
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <div
        className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
        style={{ backgroundColor: sub.color || '#e5e7eb' }}
      />
      <span className="flex-1 text-gray-900">{sub.name}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        Bewerk
      </button>
      <button
        onClick={onDelete}
        className="text-xs font-medium text-danger-600 hover:text-danger-700"
      >
        Verwijder
      </button>
    </li>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={HEX_RE.test(value) ? value : '#64748b'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#RRGGBB"
        className="input w-28 font-mono text-sm uppercase"
        maxLength={7}
      />
    </div>
  );
}
