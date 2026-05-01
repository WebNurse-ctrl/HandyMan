import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ASSIGN_ROLES, PICKUP_ROLES, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const detailInclude = {
  requestedBy: {
    select: { id: true, displayName: true, email: true, avatarUrl: true },
  },
  assignedTo: {
    select: { id: true, displayName: true, email: true, avatarUrl: true, role: true },
  },
  campus: { select: { id: true, name: true, code: true } },
  building: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true, code: true } },
  room: { select: { id: true, name: true, number: true } },
  location: { select: { id: true, name: true, building: true, floor: true, room: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
  attachments: true,
  _count: { select: { comments: true, attachments: true, tasks: true } },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, scopeCampusId, isMedewerker } = auth.ctx;

    const workRequest = await prisma.workRequest.findUnique({
      where: { id: params.id },
      include: detailInclude,
    });

    if (!workRequest) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    // RBAC + scope: MEDEWERKER mag alleen eigen aanvragen zien;
    // niet-MEDEWERKER met campus-scope alleen die campus.
    if (isMedewerker && workRequest.requestedById !== user.id) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }
    if (!isMedewerker && scopeCampusId && workRequest.campusId !== scopeCampusId) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    return NextResponse.json(workRequest);
  } catch (error) {
    console.error('Work request GET error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const { user, isAdmin, isMedewerker, scopeCampusId } = auth.ctx;

    const current = await prisma.workRequest.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, assignedToId: true, progress: true, campusId: true, requestedById: true },
    });
    if (!current) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    // Toegang: MEDEWERKER kan alleen eigen aanvraag wijzigen (in praktijk
    // alleen comments — progress/assign zijn voor TD/DH); scope-gebruikers
    // alleen binnen hun campus.
    if (isMedewerker && current.requestedById !== user.id) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }
    if (!isMedewerker && scopeCampusId && current.campusId !== scopeCampusId) {
      return NextResponse.json(
        { message: 'Werkaanvraag niet gevonden' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { progress, status, priority, rejectionReason, assignedToId } = body;

    const data: Record<string, unknown> = {};

    // ── assignedToId: claim / release / force-assign ──
    if (assignedToId !== undefined) {
      const newAssignee: string | null =
        assignedToId === null || assignedToId === '' ? null : String(assignedToId);
      const oldAssignee = current.assignedToId;

      if (newAssignee === null) {
        // Release
        if (oldAssignee && oldAssignee !== user.id && !isAdmin) {
          return NextResponse.json(
            { message: 'Alleen de eigenaar of een beheerder kan loslaten.' },
            { status: 403 },
          );
        }
        data.assignedToId = null;
      } else if (newAssignee === user.id) {
        // Claim by self
        if (!(PICKUP_ROLES as readonly string[]).includes(user.role)) {
          return NextResponse.json(
            { message: 'Je rol kan deze aanvraag niet oppikken.' },
            { status: 403 },
          );
        }
        if (oldAssignee && oldAssignee !== user.id) {
          return NextResponse.json(
            { message: 'Aanvraag is al toegewezen aan iemand anders.' },
            { status: 409 },
          );
        }
        if (current.status !== 'INGEDIEND' && !oldAssignee) {
          return NextResponse.json(
            { message: 'Oppikken kan alleen voor aanvragen met status "Ingediend".' },
            { status: 409 },
          );
        }
        data.assignedToId = user.id;
        if (current.status === 'INGEDIEND') {
          data.status = 'IN_BEHANDELING';
        }
      } else {
        // Force-assign to someone else
        if (!(ASSIGN_ROLES as readonly string[]).includes(user.role)) {
          return NextResponse.json(
            { message: 'Alleen Diensthoofd, Facilitair manager of Administrator kan iemand anders toewijzen.' },
            { status: 403 },
          );
        }
        const target = await prisma.user.findUnique({
          where: { id: newAssignee },
          select: { id: true, role: true, isActive: true },
        });
        if (!target || !target.isActive) {
          return NextResponse.json(
            { message: 'Toegewezen gebruiker niet gevonden.' },
            { status: 404 },
          );
        }
        if (!(PICKUP_ROLES as readonly string[]).includes(target.role)) {
          return NextResponse.json(
            { message: 'Toegewezen gebruiker mag geen werkaanvragen oppikken.' },
            { status: 400 },
          );
        }
        data.assignedToId = target.id;
        if (current.status === 'INGEDIEND') {
          data.status = 'IN_BEHANDELING';
        }
      }
    }

    // ── progress: server-side gating op assignedTo ──
    if (progress !== undefined) {
      const numericProgress = Number(progress);
      if (
        !Number.isInteger(numericProgress) ||
        numericProgress < 0 ||
        numericProgress > 100
      ) {
        return NextResponse.json(
          { message: 'Voortgang moet een geheel getal tussen 0 en 100 zijn' },
          { status: 400 },
        );
      }
      const effectiveAssignee = (data.assignedToId as string | null | undefined) ?? current.assignedToId;
      const mayEditProgress =
        isAdmin || (effectiveAssignee !== null && effectiveAssignee === user.id);
      if (!mayEditProgress) {
        return NextResponse.json(
          { message: 'Alleen de toegewezen behandelaar kan de voortgang bijwerken.' },
          { status: 403 },
        );
      }
      data.progress = numericProgress;

      if (numericProgress === 100) {
        data.status = 'AFGEWERKT';
        data.resolvedAt = new Date();
      } else if (numericProgress > 0 && current.status === 'INGEDIEND' && !data.status) {
        data.status = 'IN_BEHANDELING';
      }
    }

    if (status !== undefined && data.status === undefined) {
      data.status = status;
      if (status === 'AFGEWERKT') {
        data.resolvedAt = new Date();
        if (data.progress === undefined) data.progress = 100;
      }
    }

    if (priority !== undefined) data.priority = priority;
    if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Geen geldige velden om bij te werken' },
        { status: 400 },
      );
    }

    const updated = await prisma.workRequest.update({
      where: { id: params.id },
      data,
      include: detailInclude,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Work request PATCH error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
