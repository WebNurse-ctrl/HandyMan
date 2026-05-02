import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, PROJECT_MANAGE_ROLES, TASK_MANAGE_ROLES } from '@/lib/auth';
import { deleteFromStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/attachments/[id] — verwijder een upload + storage-object.
 * Toestemming gelijk aan upload-permissie van het bovenliggende object.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusIds, isMedewerker } = auth.ctx;

    const att = await prisma.attachment.findUnique({
      where: { id: params.id },
      include: {
        workRequest: { select: { campusId: true, requestedById: true } },
        task: {
          include: {
            workRequest: { select: { campusId: true } },
            project: { select: { campusId: true } },
          },
        },
        project: { select: { campusId: true } },
      },
    });
    if (!att) {
      return NextResponse.json({ message: 'Bijlage niet gevonden' }, { status: 404 });
    }

    let allowed = false;
    if (att.workRequestId && att.workRequest) {
      if (isMedewerker) {
        allowed = att.workRequest.requestedById === user.id;
      } else {
        allowed =
          scopeCampusIds.length === 0 ||
          scopeCampusIds.includes(att.workRequest.campusId);
      }
    } else if (att.taskId && att.task) {
      const wrCampus = att.task.workRequest?.campusId ?? null;
      const pCampus = att.task.project?.campusId ?? null;
      const inScope =
        scopeCampusIds.length === 0 ||
        (!wrCampus && !pCampus) ||
        (wrCampus !== null && scopeCampusIds.includes(wrCampus)) ||
        (pCampus !== null && scopeCampusIds.includes(pCampus));
      allowed =
        inScope && (TASK_MANAGE_ROLES as readonly string[]).includes(user.role);
    } else if (att.projectId && att.project) {
      const inScope =
        !att.project.campusId ||
        scopeCampusIds.length === 0 ||
        scopeCampusIds.includes(att.project.campusId);
      allowed =
        inScope && (PROJECT_MANAGE_ROLES as readonly string[]).includes(user.role);
    }
    if (!allowed) {
      return NextResponse.json({ message: 'Geen toegang' }, { status: 403 });
    }

    await prisma.attachment.delete({ where: { id: att.id } });
    if (att.fileName) {
      await deleteFromStorage(att.fileName);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Attachment DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
