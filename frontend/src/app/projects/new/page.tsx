'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, FolderKanban, ImagePlus, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import api, { apiGet, apiPost } from '@/lib/api';
import { Project, ProjectLeadCandidate, Campus } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const MANAGE_ROLES = ['DIENSTHOOFD', 'FACILITAIR_MANAGER', 'ADMIN'];

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const allowed = !!user && MANAGE_ROLES.includes(user.role);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [campusId, setCampusId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: campuses = [] } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: () => apiGet('/api/campuses'),
    enabled: allowed,
  });

  const { data: leads = [] } = useQuery<ProjectLeadCandidate[]>({
    queryKey: ['project-leads'],
    queryFn: () => apiGet('/api/users/project-leads'),
    enabled: allowed,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<Project>('/api/projects', payload),
    onSuccess: async (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Foto's uploaden voor het nieuwe project (indien gekozen).
      if (files.length > 0) {
        setUploading(true);
        try {
          for (const file of files) {
            const form = new FormData();
            form.append('file', file);
            form.append('target', 'project');
            form.append('targetId', project.id);
            await api.post('/api/attachments', form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }
        } catch (err) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Niet alle foto’s konden geladen worden';
          toast.error(msg);
        } finally {
          setUploading(false);
        }
      }
      toast.success('Project aangemaakt');
      router.push(`/projects/${project.id}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Aanmaken mislukt'),
  });

  if (!allowed) {
    return (
      <AppLayout>
        <div className="card">
          <h1 className="text-base font-semibold text-foreground">Geen toegang</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alleen Diensthoofd, Facilitair manager of Administrator kan
            projecten aanmaken.
          </p>
        </div>
      </AppLayout>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Naam is verplicht');
      return;
    }
    createMutation.mutate({
      name: trimmed,
      description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      campusId: campusId || null,
      managerId: managerId || null,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Projecten
        </button>

        <PageHeader
          title="Nieuw project"
          description="Maak een project aan en koppel later werkaanvragen en taken."
        />

        <form onSubmit={submit} className="card max-w-2xl space-y-5">
          <div>
            <label htmlFor="project-name" className="label">
              Titel <span className="text-destructive">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bv. Renovatie cafetaria gebouw A"
              className="input mt-1"
              maxLength={150}
            />
          </div>

          <div>
            <label htmlFor="project-description" className="label">
              Omschrijving
            </label>
            <textarea
              id="project-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Doel, scope, randvoorwaarden..."
              className="input mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="project-deadline" className="label">
                Deadline
              </label>
              <input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="project-campus" className="label">
                Campus
              </label>
              <select
                id="project-campus"
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="input mt-1"
              >
                <option value="">Geen specifieke campus</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="project-manager" className="label">
              Projectverantwoordelijke
            </label>
            <select
              id="project-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="input mt-1"
            >
              <option value="">Nog niet toegewezen</option>
              {leads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} · {u.role.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Een gewone medewerker kan geen projectverantwoordelijke zijn.
            </p>
          </div>

          <div>
            <label htmlFor="project-photos" className="label inline-flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" />
              Foto's (optioneel)
            </label>
            <input
              id="project-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
            />
            {files.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {files.length} foto{files.length === 1 ? '' : "'s"} geselecteerd.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.push('/projects')}
              className="btn-ghost h-9 px-3"
              disabled={createMutation.isPending || uploading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || uploading}
              className="btn-primary h-9 px-4"
            >
              {createMutation.isPending || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderKanban className="h-4 w-4" />
              )}
              {createMutation.isPending
                ? 'Aanmaken...'
                : uploading
                  ? "Foto's opladen..."
                  : 'Project aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
