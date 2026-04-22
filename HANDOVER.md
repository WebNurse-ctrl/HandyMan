# HandyMan - Project Handover Document v1.1

> Dit document bevat alle informatie die nodig is om in een nieuwe Claude Code sessie verder te werken aan HandyMan. Lees dit bestand eerst volledig voordat je wijzigingen maakt.

## Wat is HandyMan?

HandyMan is een **facility management webapplicatie** voor organisaties met meerdere campussen. Medewerkers dienen werkaanvragen in (bijv. kapotte verlichting, lekkende kraan), de technische dienst verwerkt deze als taken of projecten, en managers beheren budgetten en goedkeuringen.

## Live Deployment

- **URL**: https://handyman-eta-mocha.vercel.app
- **Hosting**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Microsoft Entra ID (Azure AD) SSO
- **Repo**: github.com/WebNurse-ctrl/HandyMan
- **Branch**: `claude/design-scalable-webapp-jwOIR`

## Tech Stack

| Component | Technologie |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Taal | TypeScript |
| Styling | Tailwind CSS |
| Database ORM | Prisma 5.x |
| Database | Supabase PostgreSQL (PgBouncer pooling) |
| State management | Zustand (auth), TanStack Query (server state) |
| HTTP client | Axios |
| Toasts | react-hot-toast |
| Auth | Microsoft Entra ID / Azure AD (OAuth 2.0) |
| Hosting | Vercel (serverless) |

## Architectuur

Dit is een **monolithische Next.js app** - er is GEEN aparte backend server. De backend logica draait in Next.js API Routes (serverless functions op Vercel).

```
HandyMan/
├── backend/                    # LEGACY - niet in gebruik op Vercel
├── frontend/                   # DE ACTIEVE APP (Vercel Root Directory)
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (15 tabellen)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # Serverless API routes (backend)
│   │   │   │   ├── auth/       # login, callback, me
│   │   │   │   ├── campuses/
│   │   │   │   ├── categories/
│   │   │   │   ├── dashboard/  # overview, workload, trends, budget, campus-stats, resolution-time
│   │   │   │   ├── notifications/ # list, count, read-all
│   │   │   │   ├── projects/
│   │   │   │   ├── purchases/
│   │   │   │   ├── tasks/
│   │   │   │   ├── users/      # list, technical-staff
│   │   │   │   └── work-requests/
│   │   │   ├── admin/          # Gebruikersbeheer pagina
│   │   │   ├── dashboard/      # Dashboard met KPIs
│   │   │   ├── login/          # Microsoft SSO login
│   │   │   ├── projects/       # Project overzicht (kaarten)
│   │   │   ├── purchases/      # Aankopen lijst
│   │   │   ├── tasks/          # Taken lijst
│   │   │   ├── work-requests/  # Aanvragen lijst + nieuw formulier
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── page.tsx        # Redirect naar /dashboard
│   │   │   └── providers.tsx   # QueryClient + Toaster
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar, Navbar
│   │   │   └── ui/             # DataTable, StatusBadge, PriorityIndicator, StatCard, Pagination, EmptyState
│   │   ├── hooks/
│   │   │   ├── useAuth.ts      # Zustand auth store
│   │   │   └── useNotifications.ts
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios instance met JWT interceptor
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   └── utils.ts        # cn(), formatDate(), getStatusColor(), etc.
│   │   └── types/
│   │       └── index.ts        # Alle TypeScript interfaces
│   ├── .eslintrc.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md         # Uitgebreide architectuur docs
│   └── SETUP.md                # Setup instructies
└── package.json                # Minimale root package.json
```

## Database Schema (Prisma)

**15 tabellen** in `frontend/prisma/schema.prisma`:

| Tabel | Beschrijving |
|-------|-------------|
| `users` | Gebruikers via Azure AD SSO. Velden: azureAdId, email, displayName, department, jobTitle, role, etc. |
| `campuses` | Campuslocaties (naam, code, adres, stad) |
| `locations` | Locaties binnen een campus (gebouw, verdieping, ruimte) |
| `categories` | Categorieën met hiërarchie (self-referencing parentId) |
| `work_requests` | Werkaanvragen met requestNumber, status, prioriteit, campus/locatie/categorie |
| `request_bundles` | Groepering van gerelateerde werkaanvragen |
| `tasks` | Taken met taskNumber, toewijzing, deadline, project-koppeling |
| `task_logs` | Werkregistratie per taak (beschrijving, uren) |
| `projects` | Projecten met budget (estimate/approved/spent), voortgang |
| `purchase_requests` | Aankopen met goedkeuringsflow, type KLEIN/GROOT |
| `purchase_approvals` | Goedkeuringsregistratie per aankoop |
| `comments` | Polymorf: gekoppeld aan work_request, task, of project |
| `attachments` | Bestanden gekoppeld aan aanvragen/taken/projecten/aankopen |
| `notifications` | In-app notificaties per gebruiker |
| `system_config` | Key-value systeeminstellingen |
| `audit_logs` | Audit trail van alle wijzigingen |

### Enums

- **UserRole**: MEDEWERKER, TECHNISCHE_DIENST, DIENSTHOOFD, FACILITAIR_MANAGER, ADMIN
- **WorkRequestStatus**: INGEDIEND, IN_BEHANDELING, GOEDGEKEURD, AFGEWERKT, GEWEIGERD
- **Priority**: LAAG, NORMAAL, HOOG, URGENT
- **TaskStatus**: OPEN, IN_UITVOERING, AFGEWERKT, ON_HOLD
- **ProjectStatus**: PLANNING, ACTIEF, ON_HOLD, AFGEROND, GEANNULEERD
- **PurchaseStatus**: AANGEVRAAGD, WACHT_OP_GOEDKEURING, GOEDGEKEURD_DIENSTHOOFD, GOEDGEKEURD, AFGEWEZEN, BESTELD, GELEVERD
- **PurchaseType**: KLEIN, GROOT

## Authenticatie Flow

```
Login knop → /api/auth/login → redirect naar Microsoft login
→ Gebruiker logt in met werkaccount
→ Microsoft redirect naar /api/auth/callback?code=xxx
→ Callback wisselt code voor access_token (POST naar Microsoft token endpoint)
→ Haalt profiel op via Microsoft Graph API (/v1.0/me)
→ Maakt/update user in Supabase database
→ Redirect naar /login?token=base64(userId)
→ Frontend slaat token op in localStorage
→ /api/auth/me haalt user data op bij elke paginalading
```

**Token** (v1.1+): gesigneerde **JWT (HS256)** met 8u geldigheidsduur. Geheim via `AUTH_SECRET` env var (min. 32 tekens). Payload bevat `sub` (user id), `role` en `email`. Claims: `iss=handyman`, `aud=handyman-web`. Wordt meegestuurd als `Authorization: Bearer <token>` header. De rol zit in de token zodat RBAC checks geen DB-hit nodig hebben; na een rolwijziging moet de gebruiker opnieuw inloggen of wachten tot de token verloopt (max 8u).

**Rol-detectie**: bij eerste login wordt de rol afgeleid uit het Azure AD jobTitle veld:
- Bevat "facilitair"/"facility" → FACILITAIR_MANAGER
- Bevat "diensthoofd"/"hoofd" → DIENSTHOOFD
- Bevat "technisch"/"onderhoud" → TECHNISCHE_DIENST
- Anders → MEDEWERKER

## Rollen & Rechten (RBAC)

| Functie | MEDEWERKER | TECHNISCHE_DIENST | DIENSTHOOFD | FACILITAIR_MANAGER | ADMIN |
|---------|:---:|:---:|:---:|:---:|:---:|
| Aanvraag indienen | x | x | x | x | x |
| Alle aanvragen zien | | x | x | x | x |
| Triage & dispatching | | x | x | x | x |
| Taken beheren | | x | x | x | x |
| Projecten aanmaken | | | x | x | x |
| Aankopen goedkeuren | | | x | x | x |
| Grote aankopen (>5000) goedkeuren | | | | x | x |
| Gebruikers/rollen beheren | | | | x | x |

**RBAC enforcement (v1.1+)**: alle Next.js API routes verifiëren de JWT en controleren de rol via `requireAuth()` / `requireRole()` uit `frontend/src/lib/auth-server.ts`. Specifiek:

- `MEDEWERKER` ziet alleen eigen `work-requests` en eigen `purchases`, en enkel aan zichzelf toegewezen `tasks`.
- `POST /api/tasks` vereist `TECHNISCHE_DIENST` of hoger.
- `POST /api/projects` vereist `DIENSTHOOFD` of hoger.
- `GET /api/users` en `PATCH /api/users/[id]/role` vereisen `FACILITAIR_MANAGER` of `ADMIN`.
- Enkel een `ADMIN` kan de `ADMIN` rol toekennen of een bestaande ADMIN wijzigen.
- Een gebruiker kan zijn eigen rol niet wijzigen.

## API Routes Overzicht

Alle routes staan in `frontend/src/app/api/` en gebruiken `export const dynamic = 'force-dynamic'`.

| Route | Methods | Beschrijving |
|-------|---------|-------------|
| `/api/auth/login` | GET | Redirect naar Microsoft OAuth |
| `/api/auth/callback` | GET | Verwerkt Microsoft callback, maakt user aan |
| `/api/auth/me` | GET | Huidige user ophalen via Bearer token |
| `/api/work-requests` | GET, POST | Lijst (met filters) en aanmaken |
| `/api/tasks` | GET, POST | Lijst (met filters) en aanmaken |
| `/api/projects` | GET, POST | Lijst (met filters) en aanmaken |
| `/api/purchases` | GET, POST | Lijst (met filters) en aanmaken |
| `/api/notifications` | GET | Lijst notificaties |
| `/api/notifications/count` | GET | Ongelezen aantal |
| `/api/notifications/read-all` | PATCH | Alles als gelezen markeren |
| `/api/users` | GET | Gebruikerslijst met paginering (FACILITAIR_MANAGER+) |
| `/api/users/[id]/role` | PATCH | Rol wijzigen (FACILITAIR_MANAGER+; alleen ADMIN mag ADMIN toekennen) |
| `/api/users/technical-staff` | GET | Technisch personeel |
| `/api/campuses` | GET | Alle campussen |
| `/api/categories` | GET | Alle categorieën |
| `/api/dashboard/overview` | GET | KPI statistieken |
| `/api/dashboard/workload` | GET | Taken per medewerker |
| `/api/dashboard/trends` | GET | Maandelijkse aanvraag trends |
| `/api/dashboard/budget-summary` | GET | Projectbudget overzicht |
| `/api/dashboard/campus-stats` | GET | Aanvragen per campus |
| `/api/dashboard/resolution-time` | GET | Gemiddelde doorlooptijd |

## Frontend Pagina's

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/` | page.tsx | Redirect naar /dashboard |
| `/login` | login/page.tsx | Microsoft SSO login met foutmeldingen |
| `/dashboard` | dashboard/page.tsx | KPI kaarten, trends grafiek, werklast, budgetten |
| `/work-requests` | work-requests/page.tsx | Tabel met filters (status) |
| `/work-requests/new` | work-requests/new/page.tsx | Formulier: titel, omschrijving, campus, categorie, prioriteit, foto |
| `/tasks` | tasks/page.tsx | Tabel met toewijzing, deadline, status |
| `/projects` | projects/page.tsx | Kaartweergave met budgetvoortgang |
| `/purchases` | purchases/page.tsx | Tabel met bedrag, type, goedkeuringsstatus |
| `/admin` | admin/page.tsx | Gebruikersbeheer met rol-dropdown |

## UI Design Systeem

- **Kleuren**: primary (blauw), accent (oranje), success (groen), warning (oranje), danger (rood)
- **CSS classes**: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.input`, `.label`, `.badge-*`
- **Status badges**: `getStatusColor()` en `getStatusLabel()` in `lib/utils.ts`
- **Prioriteit**: visuele dots indicator via `PriorityIndicator` component

## Environment Variables (Vercel)

| Variable | Beschrijving |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection (poort 6543, `?pgbouncer=true&statement_cache_size=0`) |
| `DIRECT_URL` | Supabase direct connection (poort 5432, voor migraties) |
| `AZURE_AD_TENANT_ID` | Microsoft Entra ID tenant ID |
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `AZURE_AD_CLIENT_SECRET` | App registration secret |
| `AZURE_AD_REDIRECT_URI` | `https://handyman-eta-mocha.vercel.app/api/auth/callback` |
| `AUTH_SECRET` | **v1.1+** - HMAC secret voor JWT signing (minimaal 32 tekens, random). Genereer met `openssl rand -base64 48`. |

## Wijzigingen in v1.1

- **#1 RBAC enforcement op API routes** — opgelost. Alle Next.js API routes gaan nu door `requireAuth()` / `requireRole()`. Zie `frontend/src/lib/auth-server.ts` en de RBAC sectie hierboven.
- **#10 Token security** — opgelost. Tokens zijn nu HS256-gesigneerde JWTs met 8u TTL; `AUTH_SECRET` env var is vereist.
- Nieuw endpoint `PATCH /api/users/[id]/role` voor rolbeheer (was stuk in v1.0: de admin UI riep het aan, maar het bestond niet).
- `/api/notifications/*` gebruikt nu de ingelogde gebruiker i.p.v. `prisma.user.findFirst()`.
- De `prisma.user.findFirst()` fallbacks in POST-routes (work-requests, tasks, projects, purchases) zijn vervangen door de geauthenticeerde gebruiker.

## Openstaande Beperkingen

Deze items zijn **niet geïmplementeerd** en zijn kandidaten voor volgende versies:

1. **Foto upload**: het formulier toont een upload area maar de daadwerkelijke file upload is nog niet geïmplementeerd
2. **Detail pagina's**: er zijn geen `/work-requests/[id]`, `/tasks/[id]`, `/projects/[id]` detail pagina's
3. **Work request conversie**: "Omzetten naar taak/project/aankoop" knoppen bestaan niet in de UI
4. **Commentaar systeem**: de comments tabel bestaat maar er is geen UI om comments toe te voegen
5. **E-mail notificaties**: notificaties zijn alleen in-app, geen Microsoft Graph email integratie
6. **Taak werkregistratie**: er is geen UI voor het logboek/werkregistratie bij taken
7. **Zoekfunctie**: de globale zoekbalk in de navbar is niet functioneel
8. **Mobile sidebar**: de hamburger menu toggle werkt niet op mobile
9. **Seed data**: de database is leeg (geen campussen, categorieën, demo data)
10. **Goedkeuringsflow UI**: aankoop goedkeuren/afwijzen knoppen ontbreken in de UI
11. **Budget alerts**: de budget overschrijding notificaties zijn niet geïmplementeerd
12. **Deadline scheduler**: de dagelijkse deadline check (cron) werkt niet op Vercel serverless
13. **Token revocation**: een rolwijziging is pas effectief nadat de gebruiker opnieuw inlogt of de token verloopt (max 8u). Voor onmiddellijke invalidering is een token-versie veld of server-side sessiestate nodig.

## Vercel Deployment Configuratie

| Setting | Waarde |
|---------|--------|
| Root Directory | `frontend` |
| Framework | Next.js (auto-detected) |
| Build Command | `prisma generate && next build` |
| Install Command | default (`npm install`) |
| Node.js Version | 20.x |

## Hoe verder te werken

1. Clone het repo: `git clone https://github.com/WebNurse-ctrl/HandyMan.git`
2. Checkout de branch: `git checkout claude/design-scalable-webapp-jwOIR`
3. Werk in `frontend/` - dat is de actieve app
4. De `backend/` map bevat de originele NestJS code als referentie voor business logica
5. Na wijzigingen: `git push` triggert automatisch een Vercel deployment
6. Database schema wijzigen: update `frontend/prisma/schema.prisma`, dan lokaal `npx prisma db push`
