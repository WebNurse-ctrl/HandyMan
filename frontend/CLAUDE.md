# HandyMan frontend — instructies voor Claude

Dit is de Next.js 14 frontend van HandyMan, een facility-management
platform. Voor je iets aanpast: lees `docs/UI_INVARIANTS.md` (in de
repo-root). De eindgebruiker is geen developer — wijzigingen die
bestaande functionaliteit verbreken of UX-keuzes terugrollen zijn
**niet acceptabel**.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript 5
- Tailwind CSS 3.4 met **CSS variables** voor light/dark theme
- shadcn-stijl componenten (custom, geen `shadcn/ui` CLI)
- next-themes (storage key `handyman-theme`)
- lucide-react voor iconen
- recharts voor charts
- @tanstack/react-query · zustand · prisma
- **Auth (v1.6)**: jose (HS256 JWT) + bcryptjs (password-hashing)
- **E-mail (v1.6)**: resend (uitnodigingsmails, HTML-template in
  `src/lib/mail.ts` met emerald/cyan gradient header)

## Themasysteem

Gebruik altijd semantic tokens:

| Doel | Class |
|------|-------|
| Achtergrond | `bg-background` |
| Tekst | `text-foreground` |
| Kaart | `bg-card text-card-foreground` |
| Subtiele tekst | `text-muted-foreground` |
| Lijn / border | `border-border` |
| Brand | `bg-primary text-primary-foreground` |
| Accent | `bg-accent` |
| Succes / Waarschuwing / Fout | `bg-success` / `bg-warning` / `bg-destructive` |

Vermijd `bg-gray-xxx`, `text-blue-xxx`, etc. in nieuwe code — die werken
niet in dark mode en zorgen voor kleurmismatches.

## Locked layouts

Sommige pagina's hebben een vaste layout die de gebruiker eerder bewust
heeft gekozen. Die zijn aangegeven met een `LOCKED LAYOUT` comment
bovenaan het bestand. Verplaats die blokken niet zonder expliciete
nieuwe vraag.

Op dit moment gelockt:

- `src/app/work-requests/[id]/page.tsx` — voortgangsindicator hoort in
  de rechterzijbalk; details-kaart heeft iconen per veld; pickup-knoppen
  leven in de Werkvooruitgang-kaart; eigenaar = `assignedTo`. Zie
  `docs/UI_INVARIANTS.md` §1.

## Auth-flow pagina's (v1.6)

Drie pagina's hangen samen aan de invitation/login-flow. Pas ze samen aan
of niet:

- `src/app/login/page.tsx` — toont **zowel** Microsoft 365 SSO **als**
  e-mail/wachtwoord-formulier. Beide eindigen in een JWT in localStorage.
- `src/app/accept-invite/[token]/page.tsx` — wachtwoord instellen vanuit
  een uitnodigingslink. Roept `/api/invitations/lookup` voor validatie
  en `/api/invitations/accept` voor activatie. Bij succes → auto-login
  + redirect naar `/profile/complete`.
- `src/app/profile/complete/page.tsx` — eerste-login profielformulier
  (voornaam/familienaam/telefoon/functie/afdeling). AppLayout redirect
  élke geauthenticeerde user met `profileCompleted=false` naar deze
  pagina, ongeacht waar ze proberen te navigeren.

## RBAC + scope op de frontend

- `src/components/layout/AppLayout.tsx` regelt twee redirects:
  - `profileCompleted=false` → `/profile/complete`
  - `role === 'MEDEWERKER'` op een niet-toegestane route → `/work-requests`
- `src/components/layout/Sidebar.tsx` filtert nav-items op rol. MEDEWERKER
  ziet alleen "Werkaanvragen" + de profile-link in de footer.
- API-aanroepen zijn server-side ge-gate via `lib/auth.ts`. Nooit alleen
  op UI-gating vertrouwen voor gevoelige acties.

## Auth-helper gebruik in API-routes

Standaardpatroon voor een nieuwe `route.ts`:

```ts
import { requireAuth, requireRole, ADMIN_ROLES, INVITE_ROLES } from '@/lib/auth';

// Iedereen ingelogd:
const auth = await requireAuth(request);
if (!auth.ok) return auth.response;
const { user, isMedewerker, scopeCampusId } = auth.ctx;

// Of specifieke rollen:
const auth = await requireRole(request, INVITE_ROLES);
```

`requireAuth` zorgt automatisch voor 401 op ontbrekend/ongeldig token.
`requireRole` voegt een 403 toe bij verkeerde rol. Nooit de auth-logica
in een nieuwe route opnieuw uitschrijven.

## Testen vóór je commit

Run altijd vanuit de `frontend/` map:

```bash
npx tsc --noEmit   # TypeScript check
npm run build      # Next.js build (incl. prisma generate)
```

Als beide groen zijn mag je committen.

## Branch

Werk standaard op `claude/modernize-handyman-ui-EEzjx` tenzij anders
gevraagd. Dit is de Vercel productie-deploy-branch.

## Nieuwe env-vars sinds v1.6

Vóór een nieuwe deploy moet op Vercel ingesteld zijn:

- `AUTH_SECRET` — minstens 32 random tekens (HS256 JWT-signing).
- `RESEND_API_KEY` — voor uitnodigingsmails.
- `MAIL_FROM` — bv. `HandyMan <noreply@jouwdomein.be>`.
- `APP_URL` — publieke URL voor accept-invite links.

Zonder deze vars werken login/invitation-flow niet.
