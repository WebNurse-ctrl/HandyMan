import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  organization_name: {
    value: 'HandyMan',
    description: 'Naam van de organisatie',
  },
  support_email: {
    value: '',
    description: 'E-mailadres voor ondersteuning',
  },
  small_purchase_threshold: {
    value: '5000',
    description: 'Drempel (EUR) waarboven een aankoop als GROOT wordt beschouwd',
  },
  auto_assign_requests: {
    value: 'false',
    description: 'Werkaanvragen automatisch toewijzen aan technische dienst',
  },
  default_request_priority: {
    value: 'NORMAAL',
    description: 'Standaard prioriteit voor nieuwe werkaanvragen',
  },
  notification_email_enabled: {
    value: 'false',
    description: 'E-mailnotificaties inschakelen (naast in-app notificaties)',
  },
  deadline_reminder_days: {
    value: '3',
    description: 'Aantal dagen voor deadline waarop een herinnering gestuurd wordt',
  },
};

export async function GET() {
  try {
    const existing = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    const existingKeys = new Set(existing.map((e) => e.key));
    const missingKeys = Object.keys(DEFAULT_SETTINGS).filter(
      (k) => !existingKeys.has(k),
    );

    if (missingKeys.length > 0) {
      await prisma.systemConfig.createMany({
        data: missingKeys.map((key) => ({
          key,
          value: DEFAULT_SETTINGS[key].value,
          description: DEFAULT_SETTINGS[key].description,
        })),
        skipDuplicates: true,
      });
    }

    const settings = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as {
      settings: Array<{ key: string; value: string }>;
    };

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { message: 'settings array is verplicht' },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      settings.map((s) =>
        prisma.systemConfig.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: {
            key: s.key,
            value: s.value,
            description: DEFAULT_SETTINGS[s.key]?.description ?? null,
          },
        }),
      ),
    );

    const updated = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
