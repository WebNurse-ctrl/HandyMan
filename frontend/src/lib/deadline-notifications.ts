import { prisma } from '@/lib/prisma';
import { APPROACHING_THRESHOLD_DAYS } from '@/lib/deadlines';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(d: Date): string {
  return d.toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Idempotente check: maakt voor elke aanvraag met deadline waarvan
 * de toegewezen behandelaar nog geen recente (≤ 24 u) notificatie kreeg
 * een nieuwe `WORK_REQUEST_DEADLINE_APPROACHING` of
 * `WORK_REQUEST_DEADLINE_EXCEEDED` aan.
 *
 * Wordt aangeroepen vanuit de werkaanvragen-lijst-route. Veilig om
 * meermaals na elkaar te draaien — de 24 u-throttle voorkomt spam.
 * Failures worden gelogd maar niet gepropageerd (notificaties zijn
 * niet kritisch voor de lijst-respons).
 */
export async function processDeadlineNotifications(now: Date = new Date()): Promise<void> {
  try {
    const approachingCutoff = new Date(now.getTime() + APPROACHING_THRESHOLD_DAYS * DAY_MS);
    const recentCutoff = new Date(now.getTime() - DAY_MS);

    const requests = await prisma.workRequest.findMany({
      where: {
        assignedToId: { not: null },
        deadline: { not: null },
        status: { notIn: ['AFGEWERKT', 'GEWEIGERD'] },
        OR: [
          { deadline: { lt: now } },
          { deadline: { gte: now, lte: approachingCutoff } },
        ],
      },
      select: {
        id: true,
        title: true,
        requestNumber: true,
        assignedToId: true,
        deadline: true,
      },
    });

    if (requests.length === 0) return;

    // Haal voor alle in één keer recente notificaties op.
    const existing = await prisma.notification.findMany({
      where: {
        entityType: 'work_request',
        entityId: { in: requests.map((r) => r.id) },
        type: { in: ['WORK_REQUEST_DEADLINE_APPROACHING', 'WORK_REQUEST_DEADLINE_EXCEEDED'] },
        createdAt: { gt: recentCutoff },
      },
      select: { entityId: true, userId: true, type: true },
    });

    const existingKey = new Set(
      existing.map((e) => `${e.entityId}|${e.userId}|${e.type}`),
    );

    const toCreate = requests
      .map((r) => {
        const isOverdue = r.deadline! < now;
        const type = isOverdue
          ? ('WORK_REQUEST_DEADLINE_EXCEEDED' as const)
          : ('WORK_REQUEST_DEADLINE_APPROACHING' as const);
        const key = `${r.id}|${r.assignedToId!}|${type}`;
        if (existingKey.has(key)) return null;
        return {
          userId: r.assignedToId!,
          type,
          title: isOverdue ? 'Deadline overschreden' : 'Deadline nadert',
          message: isOverdue
            ? `${r.requestNumber}: ${r.title} — deadline was ${formatDate(r.deadline!)}.`
            : `${r.requestNumber}: ${r.title} — deadline op ${formatDate(r.deadline!)}.`,
          entityType: 'work_request',
          entityId: r.id,
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (toCreate.length > 0) {
      await prisma.notification.createMany({ data: toCreate });
    }
  } catch (err) {
    console.error('Deadline notification check failed:', err);
  }
}
