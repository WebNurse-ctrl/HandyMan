'use client';

import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Mail, Phone, Shield, UserCircle2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
  ADMIN: 'Administrator',
};

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Profiel & voorkeuren"
          description="Bekijk je gegevens en pas je weergavevoorkeuren aan"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile card */}
          <div className="card lg:col-span-2">
            <div className="flex flex-wrap items-center gap-5 border-b border-border pb-6">
              <Avatar name={user.displayName} size="lg" className="h-16 w-16 text-xl" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-foreground">{user.displayName}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {user.jobTitle || ROLE_LABELS[user.role] || user.role}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                  <Shield className="h-3 w-3" />
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>

            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <DetailRow icon={<Mail />} label="E-mailadres" value={user.email} />
              {user.phone && (
                <DetailRow icon={<Phone />} label="Telefoon" value={user.phone} />
              )}
              {user.department && (
                <DetailRow
                  icon={<Building2 />}
                  label="Afdeling"
                  value={user.department}
                />
              )}
              <DetailRow
                icon={<UserCircle2 />}
                label="Rol"
                value={ROLE_LABELS[user.role] ?? user.role}
              />
            </dl>

            <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Profielgegevens worden gesynchroniseerd vanuit Microsoft 365. Wijzigingen
              moeten via je organisatie worden doorgevoerd.
            </p>
          </div>

          {/* Preferences card */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Weergave
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Kies hoe HandyMan eruit ziet — kleur en contrast worden onmiddellijk
                toegepast en bewaard op dit toestel.
              </p>
              <div className="mt-5">
                <ThemeToggle variant="segmented" className="w-full justify-stretch" />
              </div>
              <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span><strong className="text-foreground">Licht</strong> — heldere achtergrond, beste leesbaarheid bij daglicht.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span><strong className="text-foreground">Donker</strong> — sleek slate-thema, comfortabel in donkere ruimtes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span><strong className="text-foreground">Systeem</strong> — volgt automatisch de instelling van je toestel.</span>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Brand kleur
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                HandyMan gebruikt momenteel de <strong className="text-foreground">Emerald</strong> kleurpreset.
              </p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {[
                  { tone: 'bg-primary', label: 'Primary' },
                  { tone: 'bg-accent', label: 'Accent' },
                  { tone: 'bg-success', label: 'Success' },
                  { tone: 'bg-warning', label: 'Warning' },
                  { tone: 'bg-destructive', label: 'Danger' },
                ].map((c) => (
                  <div key={c.label} className="flex flex-col items-center gap-1.5">
                    <div className={`h-9 w-full rounded-md ring-1 ring-border ${c.tone}`} />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}
