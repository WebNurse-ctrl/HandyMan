'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiDelete } from '@/lib/api';
import { Attachment } from '@/types';
import { cn } from '@/lib/utils';

interface PhotoUploaderProps {
  attachments: Attachment[];
  /** Welk type doel — bepaalt de payload `target` voor de upload-API. */
  target: 'project' | 'task' | 'work-request';
  targetId: string;
  /** Mag de gebruiker uploaden/verwijderen? Anders read-only galerij. */
  canEdit: boolean;
  onChange?: () => void;
}

export default function PhotoUploader({
  attachments,
  target,
  targetId,
  canEdit,
  onChange,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('target', target);
        form.append('targetId', targetId);
        await api.post('/api/attachments', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success('Foto opgeladen');
      onChange?.();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Upload mislukt';
      toast.error(msg);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deze foto verwijderen?')) return;
    try {
      await apiDelete(`/api/attachments/${id}`);
      toast.success('Foto verwijderd');
      onChange?.();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Verwijderen mislukt';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3">
      {attachments.length === 0 && !canEdit && (
        <p className="text-xs text-muted-foreground">Geen foto's.</p>
      )}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={att.url}
                alt={att.originalName}
                className="h-full w-full object-cover"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/85 text-destructive opacity-0 shadow-soft transition-opacity hover:bg-background group-hover:opacity-100"
                  title="Verwijderen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className={cn('btn-secondary', busy && 'cursor-wait')}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {busy ? 'Bezig met opladen...' : 'Foto toevoegen'}
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            JPG, PNG of WEBP — max 10 MB per foto.
          </p>
        </div>
      )}
    </div>
  );
}
