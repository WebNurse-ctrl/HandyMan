'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Mail, Send, Trash2 } from 'lucide-react';
import ScopeCampusSelector from '@/components/ui/ScopeCampusSelector';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { Campus, UserInvitation } from '@/types';
import { formatDateTime } from '@/lib/utils';

const SUGGESTED_ROLE_LABELS: Record<string, string> = {
  MEDEWERKER: 'Medewerker',
  TECHNISCHE_DIENST: 'Technische dienst',
  DIENSTHOOFD: 'Diensthoofd',
  FACILITAIR_MANAGER: 'Facilitair manager',
};

export default function InvitationsTab() {
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [suggestedRole, setSuggestedRole] = useState('MEDEWERKER');
  const [scopeCampusIds, setScopeCampusIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ data: UserInvitation[] }>({
    queryKey: ['admin-invitations'],
    queryFn: () => apiGet('/api/invitations'),
  });

  const { data: campuses = [] } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: () => apiGet('/api/campuses'),
  });

  const createInvitation = useMutation({
    mutationFn: () =>
      apiPost<UserInvitation>('/api/invitations', {
        email,
        suggestedRole,
        scopeCampusIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      setEmail('');
      setScopeCampusIds([]);
      setSuggestedRole('MEDEWERKER');
      toast.success('Uitnodiging verzonden');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Uitnodiging versturen mislukt'),
  });

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success('Uitnodiging ingetrokken');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Intrekken mislukt'),
  });

  const invitations = data?.data ?? [];
  const pending = invitations.filter((i) => !i.acceptedAt);
  const accepted = invitations.filter((i) => i.acceptedAt);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4" />
          Nieuwe medewerker uitnodigen
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          De medewerker ontvangt een e-mail met een activatielink. Na activatie
          krijg je een melding zodat je de definitieve rol kan toekennen.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            createInvitation.mutate();
          }}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <label htmlFor="invite-email" className="label">
              E-mailadres
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              placeholder="medewerker@organisatie.be"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="label">
              Voorgestelde rol
            </label>
            <select
              id="invite-role"
              value={suggestedRole}
              onChange={(e) => setSuggestedRole(e.target.value)}
              className="input mt-1"
            >
              {Object.entries(SUGGESTED_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Toegang tot</span>
            <div className="mt-1">
              <ScopeCampusSelector
                campuses={campuses}
                value={scopeCampusIds}
                onChange={setScopeCampusIds}
              />
            </div>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={createInvitation.isPending}
              className="btn-primary h-10 px-4"
            >
              <Send className="h-4 w-4" />
              {createInvitation.isPending ? 'Versturen...' : 'Uitnodiging versturen'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground">
          Lopende uitnodigingen ({pending.length})
        </h3>
        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen openstaande uitnodigingen.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2">E-mail</th>
                  <th className="px-2 py-2">Rol</th>
                  <th className="px-2 py-2">Toegang</th>
                  <th className="px-2 py-2">Verstuurd</th>
                  <th className="px-2 py-2">Verloopt</th>
                  <th className="px-2 py-2 text-right">Actie</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-2.5 font-medium text-foreground">{inv.email}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {SUGGESTED_ROLE_LABELS[inv.suggestedRole] ?? inv.suggestedRole}
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {!inv.scopeCampuses || inv.scopeCampuses.length === 0
                        ? 'Volledige organisatie'
                        : inv.scopeCampuses.length === 1
                          ? `Campus ${inv.scopeCampuses[0].name}`
                          : inv.scopeCampuses.map((c) => c.name).join(', ')}
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {formatDateTime(inv.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString('nl-BE')}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => revokeInvitation.mutate(inv.id)}
                        disabled={revokeInvitation.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Intrekken
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {accepted.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-foreground">
            Geaccepteerde uitnodigingen
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {accepted.slice(0, 10).map((inv) => (
              <li key={inv.id} className="flex justify-between">
                <span className="text-foreground">{inv.email}</span>
                <span>{inv.acceptedAt && formatDateTime(inv.acceptedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
