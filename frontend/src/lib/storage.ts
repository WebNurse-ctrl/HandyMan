import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * v1.7 — Supabase Storage helper voor foto-uploads op
 * werkaanvragen / projecten / taken.
 *
 * Vereist env-vars:
 *   • SUPABASE_URL              (publieke URL van het project)
 *   • SUPABASE_SERVICE_ROLE_KEY (service-role key, alléén op de server)
 *   • SUPABASE_STORAGE_BUCKET   (optioneel, default "attachments")
 *
 * De bucket moet bestaan en publiek leesbaar zijn (read-only).
 * Schrijven gebeurt via de service-role key.
 */

let cached: SupabaseClient | null = null;

export function getStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'attachments';
}

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt — uploads zijn uitgeschakeld.',
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export interface UploadedFile {
  url: string;
  path: string;
}

export async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadedFile> {
  const client = getServiceClient();
  const bucket = getStorageBucket();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${fileName}`;

  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload mislukt: ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteFromStorage(path: string): Promise<void> {
  const client = getServiceClient();
  const bucket = getStorageBucket();
  await client.storage.from(bucket).remove([path]).catch(() => undefined);
}
