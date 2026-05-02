import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, PROJECT_MANAGE_ROLES, TASK_MANAGE_ROLES } from '@/lib/auth';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

type Target = 'project' | 'task' | 'work-request';

/**
 * POST /api/attachments
 * Multipart upload — `file` (verplicht) + `target` ('project'|'task'|'work-request') +
 * `targetId`. Slaat de foto op in Supabase Storage en logt een Attachment-rij.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusIds, isMedewerker } = auth.ctx;

    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ message: 'Multipart-form vereist' }, { status: 400 });
    }
    const file = form.get('file');
    const target = form.get('target') as Target | null;
    const targetId = form.get('targetId');

    if (!(file instanceof Blob) || typeof targetId !== 'string' || !targetId) {
      return NextResponse.json(
        { message: 'Ongeldige form-velden (file, target, targetId)' },
        { status: 400 },
      );
    }
    const originalName = (file as File).name || 'upload';
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { message: `Bestandstype ${mime} niet toegestaan. Enkel afbeeldingen.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: 'Bestand te groot (max 10 MB).' },
        { status: 400 },
      );
    }

    // Authorisatie + scope per target.
    let workRequestId: string | null = null;
    let taskId: string | null = null;
    let projectId: string | null = null;

    if (target === 'work-request') {
      const wr = await prisma.workRequest.findUnique({
        where: { id: targetId },
        select: { id: true, campusId: true, requestedById: true },
      });
      if (!wr) {
        return NextResponse.json({ message: 'Werkaanvraag niet gevonden' }, { status: 404 });
      }
      if (isMedewerker && wr.requestedById !== user.id) {
        return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
      }
      if (
        !isMedewerker &&
        scopeCampusIds.length > 0 &&
        !scopeCampusIds.includes(wr.campusId)
      ) {
        return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
      }
      workRequestId = wr.id;
    } else if (target === 'task') {
      if (isMedewerker || !(TASK_MANAGE_ROLES as readonly string[]).includes(user.role)) {
        return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
      }
      const t = await prisma.task.findUnique({
        where: { id: targetId },
        include: {
          workRequest: { select: { campusId: true } },
          project: { select: { campusId: true } },
        },
      });
      if (!t) {
        return NextResponse.json({ message: 'Taak niet gevonden' }, { status: 404 });
      }
      if (scopeCampusIds.length > 0) {
        const wrCampus = t.workRequest?.campusId ?? null;
        const pCampus = t.project?.campusId ?? null;
        const inScope =
          (!wrCampus && !pCampus) ||
          (wrCampus && scopeCampusIds.includes(wrCampus)) ||
          (pCampus && scopeCampusIds.includes(pCampus));
        if (!inScope) {
          return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
        }
      }
      taskId = t.id;
    } else if (target === 'project') {
      if (!(PROJECT_MANAGE_ROLES as readonly string[]).includes(user.role)) {
        return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
      }
      const p = await prisma.project.findUnique({
        where: { id: targetId },
        select: { id: true, campusId: true },
      });
      if (!p) {
        return NextResponse.json({ message: 'Project niet gevonden' }, { status: 404 });
      }
      if (
        p.campusId &&
        scopeCampusIds.length > 0 &&
        !scopeCampusIds.includes(p.campusId)
      ) {
        return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
      }
      projectId = p.id;
    } else {
      return NextResponse.json(
        { message: 'Ongeldige target. Kies project, task of work-request.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let uploaded: { url: string; path: string };
    try {
      uploaded = await uploadToStorage(buffer, originalName, mime);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload mislukt';
      return NextResponse.json({ message: msg }, { status: 500 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        fileName: uploaded.path,
        originalName,
        mimeType: mime,
        size: file.size,
        url: uploaded.url,
        workRequestId,
        taskId,
        projectId,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Attachments POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
