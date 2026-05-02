# HandyMan - Project Handover Document v1.6

> Dit document bevat alle informatie die nodig is om in een nieuwe Claude Code sessie verder te werken aan HandyMan. Lees dit bestand eerst volledig voordat je wijzigingen maakt.

## Wat is HandyMan?

HandyMan is een **facility management webapplicatie** voor organisaties met meerdere campussen. Medewerkers dienen werkaanvragen in (bijv. kapotte verlichting, lekkende kraan), de technische dienst verwerkt deze als taken of projecten, en managers beheren budgetten en goedkeuringen.

## Live Deployment

- **URL**: https://handyman-eta-mocha.vercel.app
- **Hosting**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Microsoft Entra ID (Azure AD) SSO
- **Repo**: github.com/WebNurse-ctrl/HandyMan
- **Vercel deploy-branch (Production)**: `claude/modernize-handyman-ui-EEzjx` — élke
  push hierheen triggert een productie-deploy. **Werk standaard op deze branch**
  tenzij expliciet anders gevraagd. `main` loopt achter en is GEEN deploy-bron.
- **v1.6 commits op deploy-branch** (meest recent eerst):
  - `f65b9c6` fix(deadline-banner): donker-oranje tekst op licht-oranje banner
  - `7521ec3` feat(deadlines): fase D — planning-velden + alarm-banner + notificaties
  - `a755c70` fix(scope-ux): scope-popover via portal + optimistische checkbox-feedback
  - `f8446bc` feat(scope): fase C-2 — multi-campus scope (1+ campussen of volledige organisatie)
  - `baebfcd` fix(mail): inspecteer Resend-response en surface echte fout
  - `1a797ad` feat(work-requests): Diensthoofd mag ook anders-toewijzen
  - `f9a866c` docs(v1.6): synchroniseer alle documenten met v1.6-eindstand
  - `4182393` feat(users): v1.6 fase C — invitations, scope-RBAC en MEDEWERKER-restrictie
  - `e399c18` feat(work-requests): v1.6 fase B — pickup-flow + server-side progress-gating
  - `6b13bb3` feat(auth): v1.6 fase A — schema-fundament + JWT/bcrypt auth
- **v1.5 commits**:
  - `e54dd9d` docs(v1.5): lock één-indicator + eigenaarschap-gating + deploy-branch
  - `1092232` fix(work-requests): één voortgangsindicator + locatiehiërarchie op detail
  - `86c0274` fix(work-requests): restore locked detail-page layout + lock invariants
  - `a9e2039` feat(ui): modernize HandyMan with Apex-style emerald theme + dark mode
- **Eerdere feature branches** (merged of gestaged elders, NIET de deploy-bron):
  - `claude/admin-campus-management-U7E1t` (v1.3 admin beheer)
  - `claude/job-request-details-ZBKGT` (v1.4 detailpagina, basis)
  - `claude/merge-main-branch-OIMCi` (alternatieve v1.4.x fix — niet gemerged)

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
| Auth (SSO) | Microsoft Entra ID / Azure AD (OAuth 2.0) |
| Auth (password, v1.6) | bcryptjs (12 rounds) + jose JWT (HS256, 30 d) |
| E-mail (v1.6) | Resend (uitnodigingsmails) |
| Hosting | Vercel (serverless) |

## Architectuur

Dit is een **monolithische Next.js app** - er is GEEN aparte backend server. De backend logica draait in Next.js API Routes (serverless functions op Vercel).

```
HandyMan/
├── backend/                    # LEGACY - niet in gebruik op Vercel
├── frontend/                   # DE ACTIEVE APP (Vercel Root Directory)
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (18 tabellen)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # Serverless API routes (backend)
│   │   │   │   ├── admin/      # v1.3 - beheer-only endpoints
│   │   │   │   │   ├── buildings/[id]/           # GET/PATCH/DELETE + /departments
│   │   │   │   │   ├── campuses/                 # GET/POST + [id] detail + /buildings + /departments
│   │   │   │   │   ├── categories/               # GET/POST + [id]
│   │   │   │   │   ├── departments/[id]/         # PATCH/DELETE + /rooms
│   │   │   │   │   ├── rooms/[id]/               # PATCH/DELETE
│   │   │   │   │   └── settings/                 # GET/PATCH
│   │   │   │   ├── auth/       # login (SSO), callback, me,
│   │   │   │   │               # v1.6 password-login + complete-profile
│   │   │   │   ├── buildings/  # v1.3 - publiek GET (cascade select)
│   │   │   │   ├── campuses/
│   │   │   │   ├── categories/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── departments/# v1.3 - publiek GET (cascade select)
│   │   │   │   ├── invitations/# v1.6 - GET/POST list+create + [id] DELETE
│   │   │   │   │               #         + lookup (publiek) + accept (publiek)
│   │   │   │   ├── notifications/
│   │   │   │   ├── projects/
│   │   │   │   ├── purchases/
│   │   │   │   ├── rooms/      # v1.3 - publiek GET (cascade select)
│   │   │   │   ├── tasks/
│   │   │   │   ├── users/      # list (DH/FM/ADMIN), [id] PATCH/DELETE,
│   │   │   │   │               # [id]/role legacy, technical-staff (TD/DH/FM/ADMIN)
│   │   │   │   └── work-requests/  # /route.ts v1.6 scope-filter + MEDEWERKER own-only,
│   │   │   │                       # [id]/route.ts v1.6 GET/PATCH (progress + assignedToId),
│   │   │   │                       # [id]/comments/route.ts v1.6 scope-aware GET/POST
│   │   │   ├── admin/          # v1.6 - tabs: Gebruikers, Uitnodigingen,
│   │   │   │   │               #              Campussen, Categorieën, Instellingen
│   │   │   │   └── _components/# UsersTab, InvitationsTab, CampusesTab,
│   │   │   │                   # CategoriesTab, SettingsTab
│   │   │   ├── accept-invite/  # v1.6 - /[token]/page.tsx wachtwoord instellen
│   │   │   ├── dashboard/
│   │   │   ├── login/          # v1.6 - SSO + e-mail/wachtwoord-formulier
│   │   │   ├── profile/        # v1.6 - /complete/page.tsx eerste-login flow
│   │   │   ├── projects/
│   │   │   ├── purchases/
│   │   │   ├── tasks/
│   │   │   ├── work-requests/  # /page.tsx lijst (kolom Toegewezen + Oppikken-knop),
│   │   │   │                   # /new cascading selects,
│   │   │   │                   # [id]/page.tsx v1.6 detail + assignedTo-gating
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/                # auth.ts (JWT/bcrypt + RBAC helpers),
│   │   │                       # mail.ts (Resend), prisma.ts, api.ts, utils.ts
│   │   └── types/
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── SETUP.md
└── package.json
```

## Database Schema (Prisma)

**21 tabellen** in `frontend/prisma/schema.prisma` (v1.6 fase C-2 voegde de
join-tabellen `user_campus_scopes` en `user_invitation_scopes` toe):

| Tabel | Beschrijving |
|-------|-------------|
| `users` | Gebruikers (Azure AD SSO én password-login, v1.6). Kolommen: `password_hash` (nullable; alleen voor uitgenodigde users), `azure_ad_id` (nullable; alleen voor SSO), `profile_completed`. Scope is M2M via `user_campus_scopes` (zie verder). `isActive=false` = soft-delete. |
| `campuses` | Campuslocaties (naam, code, adres, stad). |
| **`buildings`** | **v1.3** Gebouwen per campus. Cascade delete vanuit campus. |
| **`departments`** | **v1.3** Afdelingen. Altijd campusId, optioneel buildingId (null = direct op campus). |
| **`rooms`** | **v1.3** Kamers/ruimtes per afdeling. Cascade delete vanuit afdeling. |
| `locations` | Legacy v1.0 locaties. Nog gekoppeld aan work_requests via `locationId`. |
| `categories` | Categorieën met hiërarchie (parentId) en kleurlabel (HEX). |
| `work_requests` | Werkaanvragen. v1.3: `building_id`, `department_id`, `room_id`. **v1.4**: `progress INT 0–100` (stappen van 20). **v1.6**: `assigned_to_id` (nullable; eigenaar na pickup). **v1.6 fase D**: `deadline`, `start_date`, `end_date` (allen nullable; planning-velden). |
| **`user_invitations`** | **v1.6 fase A** Uitnodigingen: `email`, `token` (uniek), `invited_by_id`, `suggested_role`, `expires_at` (7 dagen), `accepted_at`. Scope is M2M via `user_invitation_scopes`. |
| **`user_campus_scopes`** | **v1.6 fase C-2** Join-tabel `user_id` × `campus_id` (composite PK). Bepaalt voor niet-MEDEWERKERs welke campussen ze in werkaanvragen zien. Lege set = volledige organisatie. Cascade delete vanuit beide kanten. |
| **`user_invitation_scopes`** | **v1.6 fase C-2** Join-tabel `invitation_id` × `campus_id`. Wordt bij accept-invite naar `user_campus_scopes` gekopieerd. |
| `request_bundles` | Groepering van gerelateerde werkaanvragen. |
| `tasks` | Taken met taskNumber, toewijzing, deadline, project-koppeling. |
| `task_logs` | Werkregistratie per taak (beschrijving, uren). |
| `projects` | Projecten met budget, voortgang. |
| `purchase_requests` | Aankopen met goedkeuringsflow, type KLEIN/GROOT. |
| `purchase_approvals` | Goedkeuringsregistratie per aankoop. |
| `comments` | Polymorf: work_request / task / project. **v1.4**: feedback-thread op werkaanvraag-detail. |
| `attachments` | Bestanden gekoppeld aan entiteiten. |
| `notifications` | In-app notificaties per gebruiker. **v1.6**: trigger bij accept-invite (`USER_REGISTERED`) → alle ADMIN/FM/DH. |
| `system_config` | Key-value systeeminstellingen (beheerd via /admin Instellingen). |
| `audit_logs` | Audit trail van alle wijzigingen. |

### Locatie-hiërarchie (v1.3)

```
Campus
├── Building (optioneel)
│   └── Department (buildingId = building.id)
│       └── Room
└── Department (buildingId = null, "direct op campus")
    └── Room
```

Een afdeling hoort **altijd** bij een campus, en **optioneel** bij een gebouw van die campus. Een campus kan dus tegelijk gebouwen met afdelingen hebben, én afdelingen die rechtstreeks op de campus hangen.

### Enums

- **UserRole**: MEDEWERKER, TECHNISCHE_DIENST, DIENSTHOOFD, FACILITAIR_MANAGER, ADMIN
- **WorkRequestStatus**: INGEDIEND, IN_BEHANDELING, GOEDGEKEURD, AFGEWERKT, GEWEIGERD
- **Priority**: LAAG, NORMAAL, HOOG, URGENT
- **TaskStatus**: OPEN, IN_UITVOERING, AFGEWERKT, ON_HOLD
- **ProjectStatus**: PLANNING, ACTIEF, ON_HOLD, AFGEROND, GEANNULEERD
- **PurchaseStatus**: AANGEVRAAGD, WACHT_OP_GOEDKEURING, GOEDGEKEURD_DIENSTHOOFD, GOEDGEKEURD, AFGEWEZEN, BESTELD, GELEVERD
- **PurchaseType**: KLEIN, GROOT
- **NotificationType** (v1.6): WORK_REQUEST_CREATED, WORK_REQUEST_STATUS_CHANGED, **WORK_REQUEST_ASSIGNED**, **WORK_REQUEST_DEADLINE_APPROACHING** (fase D), **WORK_REQUEST_DEADLINE_EXCEEDED** (fase D), TASK_ASSIGNED, TASK_STATUS_CHANGED, TASK_DEADLINE_APPROACHING, PURCHASE_APPROVAL_NEEDED, PURCHASE_APPROVED, PURCHASE_REJECTED, PROJECT_BUDGET_ALERT, COMMENT_ADDED, **USER_REGISTERED**

## Authenticatie Flow

Sinds **v1.6** zijn er **twee parallelle login-paden**: Microsoft Entra ID
SSO (voor users met een werkaccount) en e-mail/wachtwoord (voor users die
via een uitnodiging zijn aangemaakt). Beide eindigen in een
**HS256 JWT-token** in `localStorage` als `handyman_token`.

### Pad 1 — Microsoft Entra ID SSO

```
Login knop "Inloggen met Microsoft 365" → /api/auth/login → redirect naar Microsoft
→ Gebruiker logt in met werkaccount
→ Microsoft redirect naar /api/auth/callback?code=xxx
→ Callback wisselt code voor access_token
→ Haalt profiel op via Microsoft Graph API
→ Maakt/update user in Supabase database
→ Redirect naar /login?token=<JWT>
→ Frontend slaat token op in localStorage
```

### Pad 2 — E-mail + wachtwoord (v1.6)

```
Admin maakt invitation → /api/invitations (POST, ADMIN/FM/DH only)
→ Resend stuurt HTML-mail naar user met link /accept-invite/<token>
→ User opent link → /api/invitations/lookup?token=... (publiek)
→ User stelt wachtwoord in → /api/invitations/accept (POST, publiek)
   → bcrypt-hash, user wordt aangemaakt of ge-reactiveerd
   → invitation.acceptedAt gezet
   → Notificatie naar alle ADMIN/FM/DH (USER_REGISTERED)
   → Returns { token: <JWT>, profileCompleted: false }
→ Frontend slaat token op, redirect naar /profile/complete
→ User vult profiel aan → /api/auth/complete-profile
   → profileCompleted=true, displayName="<voornaam> <familienaam>"
→ Redirect naar /work-requests

Latere logins: /login formulier → /api/auth/password-login (e-mail + wachtwoord)
   → bcrypt verify → JWT
```

### Token

**HS256 JWT** (lib `jose`), TTL 30 dagen, payload `{ sub: <userId>, iat, exp }`.
Geverifieerd via env-var `AUTH_SECRET` (≥ 32 tekens). Wordt meegestuurd als
`Authorization: Bearer <token>` header. De helpers in `lib/auth.ts`
(`requireAuth`, `requireRole`, `getUserFromRequest`) wrappen deze
verificatie + RBAC.

**Rol-detectie**: bij SSO-login wordt de rol afgeleid uit het Azure AD
jobTitle veld; bij invitation-flow neemt de user de `suggestedRole`
over (door admin gekozen). In beide gevallen aanpasbaar in /admin
Gebruikers.

## Rollen & Rechten (RBAC, bijgewerkt v1.6)

| Functie | MEDEWERKER | TECHNISCHE_DIENST | DIENSTHOOFD | FACILITAIR_MANAGER | ADMIN |
|---------|:---:|:---:|:---:|:---:|:---:|
| Aanvraag indienen | x | x | x | x | x |
| **Alleen eigen aanvragen zien** (v1.6) | x | | | | |
| Alle aanvragen zien (binnen scope) | | x | x | x | x |
| Werkaanvraag oppikken / loslaten (v1.6) | | x | x | x | x |
| Voortgang bewerken (alleen eigenaar, v1.6) | | x | x | x | x |
| Anders toewijzen (force-assign, v1.6) | | | x | x | x |
| Loslaten van iemand anders (v1.6) | | | | x | x |
| Triage & dispatching | | x | x | x | x |
| Taken beheren | | x | x | x | x |
| Projecten aanmaken | | | x | x | x |
| Aankopen goedkeuren | | | x | x | x |
| Grote aankopen (>5000) goedkeuren | | | | x | x |
| **Medewerkers uitnodigen** (v1.6) | | | x | x | x |
| **Rol + scope toekennen** (v1.6) | | | x | x | x |
| Beheer (/admin) | | | x (Gebruikers + Uitnodigingen) | x (alle tabs) | x (alle tabs) |
| Campussen / categorieën / instellingen | | | | x | x |

**Scope-RBAC** (v1.6, multi-campus): elke niet-MEDEWERKER kan optioneel
beperkt worden tot **één of meerdere campussen** via de join-tabel
`user_campus_scopes`. Lege selectie = volledige organisatie. Alleen
werkaanvragen van die campussen zijn dan zichtbaar in lijst, detail en
comments. Geldt nog **niet** voor tasks/projects/purchases (v1.7).

**Server-side enforcement** (v1.6): de Next.js API routes valideren auth
+ rol via `requireAuth` / `requireRole` uit `lib/auth.ts`. De UI-only
gating uit eerdere versies is gedicht voor werkaanvragen + comments +
invitations + user-management. Resterende routes (tasks, projects,
purchases, dashboard, notifications) hebben nog géén server-side rol-
checks (UI-only) — kandidaat voor v1.7.

## API Routes Overzicht

Alle routes staan in `frontend/src/app/api/` en gebruiken `export const dynamic = 'force-dynamic'`.

### Auth-routes

| Route | Methods | Auth | Beschrijving |
|-------|---------|------|-------------|
| `/api/auth/login` | GET | publiek | Redirect naar Microsoft OAuth (SSO-pad) |
| `/api/auth/callback` | GET | publiek | Verwerkt Microsoft callback → JWT (v1.6) |
| `/api/auth/me` | GET | JWT | Huidige user ophalen incl. `profileCompleted`, `scopeCampusId` |
| `/api/auth/password-login` | **POST** | publiek | **v1.6** E-mail + wachtwoord → JWT (bcrypt verify) |
| `/api/auth/complete-profile` | **POST** | JWT | **v1.6** firstName/lastName/phone/jobTitle/department + zet `profileCompleted=true` |

### Invitation-routes (v1.6)

| Route | Methods | Auth | Beschrijving |
|-------|---------|------|-------------|
| `/api/invitations` | GET, POST | ADMIN/FM/DH | Lijst + aanmaken. POST verstuurt mail via Resend; bij mailfout wordt invitation gerold-back. |
| `/api/invitations/[id]` | DELETE | ADMIN/FM/DH | Intrekken. Geblokkeerd als al geaccepteerd. |
| `/api/invitations/lookup` | GET | publiek | `?token=` → `{ valid, email, inviterName, expiresAt }` of `{ valid: false, reason }` |
| `/api/invitations/accept` | POST | publiek | `{ token, password }` → user + JWT + USER_REGISTERED notificaties. Wachtwoord ≥ 10 tekens. |

### Werkaanvragen (v1.6 scope-aware)

| Route | Methods | Auth | Beschrijving |
|-------|---------|------|-------------|
| `/api/work-requests` | GET, POST | JWT | GET filtert op scope (`scopeCampusId`) en eigenaarschap (MEDEWERKER → eigen). POST: iedereen mag indienen. Lijst includet `assignedTo`. |
| `/api/work-requests/[id]` | GET, PATCH | JWT | GET/PATCH met scope-check; 404 voor buiten-scope. PATCH velden: `progress` (eigenaar/admin), `status`, `priority`, `rejectionReason`, **`assignedToId`** (claim/release/force per RBAC, v1.6). |
| `/api/work-requests/[id]/comments` | GET, POST | JWT | Scope-aware. MEDEWERKER ziet alleen eigen aanvraag. |

### Beheer-routes voor users (v1.6)

| Route | Methods | Auth | Beschrijving |
|-------|---------|------|-------------|
| `/api/users` | GET | DH/FM/ADMIN | Gebruikerslijst incl. `scopeCampus`. |
| `/api/users/[id]` | PATCH, DELETE | DH/FM/ADMIN | PATCH `{ role?, scopeCampusId? }` (v1.6). DELETE = soft-delete. |
| `/api/users/[id]/role` | PATCH | DH/FM/ADMIN | Legacy alias voor rolwijziging (gelockt v1.6). |
| `/api/users/technical-staff` | GET | TD/DH/FM/ADMIN | Lijst voor toewijs-modal. v1.6 incl. DIENSTHOOFD. |

### Andere generieke routes

| Route | Methods | Auth | Beschrijving |
|-------|---------|------|-------------|
| `/api/tasks` | GET, POST | UI-only | Taken (rol-check nog niet server-side) |
| `/api/projects` | GET, POST | UI-only | Projecten |
| `/api/purchases` | GET, POST | UI-only | Aankopen |
| `/api/notifications` | GET | UI-only | Notificaties |
| `/api/notifications/count` | GET | UI-only | Ongelezen aantal |
| `/api/notifications/read-all` | PATCH | UI-only | Alles als gelezen |
| `/api/campuses` | GET | publiek | Actieve campussen (gebruikt door /work-requests/new) |
| `/api/buildings` | GET | publiek | `?campusId=` voor cascade selects |
| `/api/departments` | GET | publiek | `?campusId=` of `?buildingId=`. Met `&scope=direct` alleen direct-op-campus |
| `/api/rooms` | GET | publiek | `?departmentId=` voor cascade selects |
| `/api/categories` | GET | publiek | Actieve categorieën |
| `/api/dashboard/*` | GET | UI-only | KPI endpoints (MEDEWERKER ziet sidebar niet, maar API niet ge-gate) |

### Beheer-routes (`/api/admin/*`, v1.3)

| Route | Methods | Beschrijving |
|-------|---------|-------------|
| `/api/admin/campuses` | GET, POST | Alle campussen (inclusief inactief) |
| `/api/admin/campuses/[id]` | GET, PATCH, DELETE | Detail incl. nested buildings > departments > rooms én direct-op-campus departments |
| `/api/admin/campuses/[id]/buildings` | GET, POST | Gebouwen van een campus |
| `/api/admin/campuses/[id]/departments` | GET, POST | Direct-op-campus afdelingen (buildingId=null) |
| `/api/admin/buildings/[id]` | GET, PATCH, DELETE | Detail gebouw incl. departments+rooms |
| `/api/admin/buildings/[id]/departments` | GET, POST | Afdelingen binnen een gebouw |
| `/api/admin/departments/[id]` | PATCH, DELETE | Afdeling beheer |
| `/api/admin/departments/[id]/rooms` | GET, POST | Kamers per afdeling |
| `/api/admin/rooms/[id]` | PATCH, DELETE | Kamer beheer |
| `/api/admin/categories` | GET, POST | Hoofdcategorieën met children genest |
| `/api/admin/categories/[id]` | PATCH, DELETE | Categorie beheer (ook subs via parentId) |
| `/api/admin/settings` | GET, PATCH | SystemConfig key-value (bulk upsert) |

## Frontend Pagina's

| Route | Component | Beschrijving |
|-------|-----------|-------------|
| `/` | page.tsx | Redirect naar /dashboard |
| `/login` | login/page.tsx | **v1.6** SSO-knop **én** e-mail/wachtwoord-formulier |
| `/accept-invite/[token]` | accept-invite/[token]/page.tsx | **v1.6** Wachtwoord-instellen vanuit uitnodiging; bij succes auto-login + redirect naar `/profile/complete` |
| `/profile/complete` | profile/complete/page.tsx | **v1.6** Eerste-login profielformulier (voornaam, familienaam, telefoon, functie, afdeling). AppLayout forceert deze route zolang `profileCompleted=false`. |
| `/profile` | profile/page.tsx | Eigen profiel + theme-toggle |
| `/dashboard` | dashboard/page.tsx | KPI kaarten, trends, werklast, budgetten. **v1.6**: niet zichtbaar voor MEDEWERKER (sidebar verbergt + AppLayout redirect). |
| `/work-requests` | work-requests/page.tsx | Tabel met filters. **v1.6**: kolom "Toegewezen" + inline "Oppikken"-knop voor TD/DH/ADMIN/FM op `INGEDIEND`-rijen. |
| `/work-requests/new` | work-requests/new/page.tsx | **v1.3** Cascading locatie-selects: Campus → (Gebouw) → Afdeling → Kamer. |
| `/work-requests/[id]` | work-requests/[id]/page.tsx | **v1.6** Detailpagina (LOCKED). Slider voor `assignedTo`-eigenaar (niet meer aanvrager); pickup/loslaten/anders-toewijzen-knoppen; "Toegewezen aan"-rij in Details. Zie `docs/UI_INVARIANTS.md` §1. |
| `/tasks` | tasks/page.tsx | Takenlijst (verborgen voor MEDEWERKER) |
| `/projects` | projects/page.tsx | Projectkaarten (verborgen voor MEDEWERKER) |
| `/purchases` | purchases/page.tsx | Aankopentabel (verborgen voor MEDEWERKER) |
| `/admin` | admin/page.tsx | **v1.6** Tabs (rol-gefilterd): Gebruikers, Uitnodigingen (DH/FM/ADMIN); Campussen, Categorieën, Instellingen (FM/ADMIN). |

### Admin tabs (v1.6)

- **Gebruikers** (`_components/UsersTab.tsx`): tabel met rol-dropdown,
  scope-dropdown (Volledige organisatie | Campus X) en verwijderknop
  (soft-delete). Zichtbaar voor DH/FM/ADMIN.
- **Uitnodigingen** (`_components/InvitationsTab.tsx`, **v1.6**):
  formulier (e-mail + voorgestelde rol + scope) → verstuurt via Resend.
  Lijst lopende uitnodigingen met intrekken-knop + lijst geaccepteerde
  uitnodigingen. Zichtbaar voor DH/FM/ADMIN.
- **Campussen** (`_components/CampusesTab.tsx`): master-detail lay-out
  - Linkerlijst: alle campussen met telling van gebouwen/afdelingen
  - Rechterpaneel: tabs Gegevens / Gebouwen / Afdelingen (direct)
  - Gebouwen zijn uitklapbaar → tonen afdelingen + kamers van dat gebouw
  - Afdelingen-tab op campus toont alleen afdelingen zonder gebouw (voor kleinere campussen)
  - Laad-/foutstatus getoond als detail-fetch faalt
- **Categorieën** (`_components/CategoriesTab.tsx`):
  - Colorpicker (native `<input type="color">`) + HEX invoerveld met regex validatie
  - Uitklapbaar voor subcategorieën (inline bewerken + toevoegen)
- **Instellingen** (`_components/SettingsTab.tsx`):
  - Default keys worden bij eerste GET automatisch aangemaakt
  - Bulk opslaan via één PATCH

### Werkaanvraag formulier (v1.3)

Cascading selects in `/work-requests/new`:

1. **Campus** (verplicht)
2. Als campus gebouwen heeft: keuzerondjes `In een gebouw` vs `Direct op campus (zonder gebouw)`
3. **Gebouw** (alleen als "In een gebouw" gekozen is)
4. **Afdeling** (gefilterd op buildingId óf direct-op-campus afhankelijk van scope)
5. **Kamer/ruimte** (optioneel, gefilterd op afdeling)

De waardes worden verstuurd als `buildingId`, `departmentId`, `roomId` naar `/api/work-requests` POST.

### Werkaanvraag detailpagina (v1.6 — pickup-flow)

Route: `/work-requests/[id]` — twee-koloms layout (zie ook `docs/UI_INVARIANTS.md` §1, GELOCKT):

**Hoofdkolom (`lg:col-span-2`)**:

1. **Omschrijving** met optioneel een weigeringsreden.
2. **Feedback**: lijst van comments (chronologisch) + inline textarea. Iedere gebruiker met toegang kan posten.

**Rechterzijbalk (`lg:col-span-1`)**:

3. **Werkvooruitgang** — toont **exact één indicator** (regel ongewijzigd sinds v1.5, wel **andere eigenaar-definitie**):
   - **Toegewezen behandelaar** (`workRequest.assignedTo?.id === user.id`, v1.6): range-slider `min=0 max=100 step=20` met klikbare stap-knoppen en Opslaan/Annuleren. **Geen** statische gevulde balk erboven.
   - **Alle anderen** (incl. de oorspronkelijke aanvrager): alléén een gevulde balk + percentage. Tekst onderaan: *"Alleen ${assignedTo.displayName} kan de voortgang bijwerken."* of *"Niemand pikt deze aanvraag op..."* als nog niet toegewezen.
   - Kleur van de balk: grijs (0) → oranje (≥20) → blauw (≥60) → groen (=100).
   - Onder de slider/balk: knoppenrij **Oppikken / Loslaten / Anders toewijzen** (rolafhankelijk, v1.6). Zie UI_INVARIANTS §1 punt 8.
   - **Server-side gating** (v1.6 fase B): `PATCH /api/work-requests/[id]` met `progress` accepteert alleen `assignedTo.id === user.id` (of ADMIN/FM). De UI-only-gating-leemte uit eerdere versies is dicht.
   - Automatische statusovergang: bij `progress=100` → status `AFGEWERKT` + `resolvedAt`; bij claim of bij `progress>0` op een `INGEDIEND` aanvraag → status `IN_BEHANDELING`.
4. **Details** met iconen per veld:
   - `User` — **Aanvrager** (origineel; altijd zichtbaar)
   - `UserCheck` — **Toegewezen aan** (v1.6; "Nog niet opgepikt" als leeg)
   - `Building2` — Campus
   - `Building` — Gebouw (alléén als toegekend)
   - `LayoutGrid` — Afdeling (alléén als toegekend)
   - `DoorOpen` — Kamer (alléén als toegekend; toont `nummer · naam`)
   - `MapPin` — Legacy `location` (backward compat)
   - `Tag` — Categorie
   - `Clock` — Laatst bijgewerkt
   - `CheckCircle2` — Afgewerkt op (alléén als `resolvedAt`)

De API-include op `/api/work-requests/[id]` (GET én PATCH) levert
`requestedBy`, **`assignedTo`** (v1.6), `building`, `department`, `room`
zodat de frontend eigenaarschap kan bepalen en de hiërarchie kan tonen.

### Cache-gedrag (v1.4)

`providers.tsx` is afgesteld voor altijd-verse data:

- `staleTime: 0`
- `refetchOnMount: 'always'`
- `refetchOnWindowFocus: true`

Mutaties invalideren expliciet `['work-requests']`, `['dashboard']`, `['work-request', id]` en `['work-request-comments', id]` zodat lijst, KPI-kaarten en comment-badges direct verversen zonder handmatige pagina-refresh.

## UI Design Systeem

- **Kleuren** (v1.5 emerald/cyan thema): primary `#10b981` (emerald),
  accent `#06b6d4` (cyan), success/warning/destructive via CSS-variabelen.
  Definities in `frontend/src/app/globals.css` (`:root` + `.dark`).
- **Theme toggle**: `next-themes`, storage key `handyman-theme`. Bediening
  via `frontend/src/components/ui/ThemeToggle.tsx` (navbar + /profile).
- **CSS classes**: `.card`, `.card-elevated`, `.btn-primary`, `.btn-secondary`,
  `.btn-danger`, `.btn-ghost`, `.input`, `.label`, `.badge-*`,
  `.brand-mark`, `.text-gradient-brand`.
- **Iconen**: lucide-react (geen eigen inline SVG's in nieuwe pagina's,
  zie UI_INVARIANTS §3).
- **Status badges**: `getStatusColor()` en `getStatusLabel()` in `lib/utils.ts`.
- **Prioriteit**: `PriorityIndicator` component.

## Environment Variables (Vercel)

| Variable | Beschrijving |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection (poort 6543, `?pgbouncer=true&statement_cache_size=0`) |
| `DIRECT_URL` | Supabase direct connection (poort 5432, voor migraties) |
| `AZURE_AD_TENANT_ID` | Microsoft Entra ID tenant ID |
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `AZURE_AD_CLIENT_SECRET` | App registration secret |
| `AZURE_AD_REDIRECT_URI` | `https://handyman-eta-mocha.vercel.app/api/auth/callback` |
| `AUTH_SECRET` | **v1.6** HS256 JWT-signing key (≥ 32 tekens). Bv. `openssl rand -base64 48`. |
| `RESEND_API_KEY` | **v1.6 fase C** API-key van Resend voor uitnodigingsmails |
| `MAIL_FROM` | **v1.6 fase C** Verzendadres bv. `HandyMan <noreply@example.be>`. **Let op**: het domein moet geverifieerd zijn in de Resend-dashboard (DNS-records), anders rejectt Resend de send. Voor testen kan `HandyMan <onboarding@resend.dev>` gebruikt worden — dat domein is altijd geldig op een Resend-account. |
| `APP_URL` | **v1.6 fase C** Publieke URL voor accept-invite links |

## Database Migraties

Het meest pragmatische commando na een pull van `main`:

```bash
cd frontend
npx prisma db push
```

Dit synchroniseert de complete v1.3 + v1.4 schema in één keer. Hieronder de SQL ter referentie, gesplitst per versie.

### v1.3 schema

Nieuwe tabellen `buildings`, `departments`, `rooms` + locatie-FK's op `work_requests`:

```sql
-- v1.3 stap 1: nieuwe tabellen buildings, departments, rooms
CREATE TABLE IF NOT EXISTS "buildings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "campus_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "buildings_campus_id_name_key"
    ON "buildings"("campus_id", "name");
ALTER TABLE "buildings"
    ADD CONSTRAINT "buildings_campus_id_fkey"
    FOREIGN KEY ("campus_id") REFERENCES "campuses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "campus_id" TEXT NOT NULL,
    "building_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "departments_campus_id_name_key"
    ON "departments"("campus_id", "name");
CREATE INDEX IF NOT EXISTS "departments_building_id_idx"
    ON "departments"("building_id");
ALTER TABLE "departments"
    ADD CONSTRAINT "departments_campus_id_fkey"
    FOREIGN KEY ("campus_id") REFERENCES "campuses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments"
    ADD CONSTRAINT "departments_building_id_fkey"
    FOREIGN KEY ("building_id") REFERENCES "buildings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "department_id" TEXT NOT NULL,
    "name" TEXT,
    "number" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "rooms_department_id_idx"
    ON "rooms"("department_id");
ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- v1.3 stap 2: locatie-kolommen op work_requests
ALTER TABLE "work_requests"
    ADD COLUMN IF NOT EXISTS "building_id" TEXT,
    ADD COLUMN IF NOT EXISTS "department_id" TEXT,
    ADD COLUMN IF NOT EXISTS "room_id" TEXT;

ALTER TABLE "work_requests"
    ADD CONSTRAINT "work_requests_building_id_fkey"
    FOREIGN KEY ("building_id") REFERENCES "buildings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_requests"
    ADD CONSTRAINT "work_requests_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_requests"
    ADD CONSTRAINT "work_requests_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
```

### v1.4 schema

Voeg de `progress` kolom toe. Dit SQL-script staat ook als los bestand in `frontend/prisma/migrations/2026_04_23_add_work_request_progress.sql`:

```sql
ALTER TABLE work_requests
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_requests_progress_range'
  ) THEN
    ALTER TABLE work_requests
      ADD CONSTRAINT work_requests_progress_range
      CHECK (progress BETWEEN 0 AND 100);
  END IF;
END $$;
```

### Optioneel: automatische push in Vercel build

`frontend/package.json` biedt een opt-in script `build:with-db-sync`:

```json
"build:with-db-sync": "prisma db push --skip-generate && prisma generate && next build"
```

Als je Vercel's **Build Command** op `npm run build:with-db-sync` zet, wordt elke deploy automatisch gesynchroniseerd. `prisma db push` zonder `--accept-data-loss` faalt bij destructieve wijzigingen (bewust) zodat je stille dataverlies voorkomt. Zorg dat `DIRECT_URL` in Vercel gedefinieerd is, want `prisma db push` vereist een directe connectie (poort 5432, niet de PgBouncer-pooler op 6543).

## Wat is geïmplementeerd in v1.6

v1.6 bracht **gebruikersbeheer** (uitnodigingen via e-mail), **scope-gebaseerde
toegang** tot werkaanvragen, **MEDEWERKER-restricties**, de **pickup-flow**
voor de technische dienst, en **planning + deadline-alarmen**. De wijzigingen
zijn in vier sequentiële fases uitgerold (A → B → C → C-2 → D); zie de
gedetailleerde secties hieronder voor elke fase.

### v1.6 hoofdpunten in één oogopslag

- **Auth v2** (fase A): bcrypt password-hash + HS256 JWT (`AUTH_SECRET`).
  Microsoft Entra SSO én e-mail/wachtwoord-login co-existeren.
- **Pickup-flow** (fase B): TD/Diensthoofd "pikken werkaanvragen op" en
  worden eigenaar; de aanvrager blijft zichtbaar maar verliest het
  bewerkrecht op de slider. Server-side ge-gate.
- **Invitations + Resend mail** (fase C): admins/FM/DH nodigen
  medewerkers uit. HTML-mail met emerald/cyan brand-template, accept-
  link → wachtwoord instellen → profiel vervolledigen → automatische
  notificaties naar admins.
- **MEDEWERKER-restrictie** (fase C): MEDEWERKER ziet alléén eigen
  aanvragen + kan nieuwe indienen. Sidebar verbergt de rest; AppLayout
  redirect; API geeft 403/404.
- **Multi-campus scope** (fase C-2): elke niet-MEDEWERKER kan toegang
  hebben tot één, meerdere of géén campussen via de join-tabel
  `user_campus_scopes`. Lege selectie = volledige organisatie.
- **Planning + deadlines** (fase D): drie optionele datum-velden op
  werkaanvragen (deadline/start_date/end_date) met UI-alarmen bij
  nadering/overschrijding en automatische notificaties naar de
  toegewezen behandelaar.

## Roadmap — voorzien voor v1.7+

In de volgende sessie willen we **taken en projecten uitwerken** tot het
niveau dat werkaanvragen nu hebben. Concrete kandidaten:

### Taken

- `/tasks/[id]`-detailpagina met dezelfde locked-layout-conventies als
  werkaanvragen: rechts-zijbalk Werkvooruitgang + Details, hoofdkolom
  Omschrijving + Feedback (comments).
- Voortgangsindicator + status-flow (OPEN → IN_UITVOERING → AFGEWERKT /
  ON_HOLD); analoog aan v1.6 fase B-pickup als de logica overlapt.
- Werkregistratie / `task_logs`-UI: log-formulier (uren + beschrijving)
  + lijst van eerdere logs op de detailpagina.
- Comments-thread (de `comments`-tabel is polymorf, alleen
  UI-integratie ontbreekt).
- Conversie-knop op werkaanvraag-detail: "Omzetten naar taak".
- Deadline-alarmen voor `tasks.due_date` (analoog aan
  `WORK_REQUEST_DEADLINE_*` notificaties — `TASK_DEADLINE_APPROACHING`
  bestaat al in de enum).
- Server-side RBAC + scope op `/api/tasks*` (nu UI-only ge-gate).

### Projecten

- `/projects/[id]`-detailpagina met budget-summary + voortgang +
  gekoppelde taken/werkaanvragen/aankopen.
- Project-aanmaak vanuit een werkaanvraag (1-op-1 relatie via
  `WorkRequest.project`).
- Budget-overzicht: estimate vs approved vs spent met visuele
  voortgangsbalk; alert bij overschrijding (`PROJECT_BUDGET_ALERT`
  bestaat al in de enum, nog niet getriggerd).
- Comments-thread.
- Server-side RBAC + scope op `/api/projects*`.

### Algemene v1.7-doelen

- Vercel Cron job voor de deadline-check (i.p.v. on-fetch). De huidige
  `processDeadlineNotifications()` in `lib/deadline-notifications.ts`
  is al cron-friendly: idempotent + 24 u-throttle. Kan rechtstreeks
  via een `/api/cron/deadlines`-endpoint exposed worden.
- Wachtwoord-reset / "vergeten"-flow.
- Rate-limiting op `/api/auth/password-login`.
- Profiel bewerken na completion (`/profile`-pagina toont nu read-only
  na de eerste vul-flow).

### v1.6 fase D — deadlines + alarm-meldingen

Werkaanvragen krijgen drie optionele datum-velden:

| Veld | Doel |
|---|---|
| `deadline` | Uiterste datum waarop de aanvraag afgewerkt moet zijn |
| `start_date` | Geplande startdatum van het werk |
| `end_date` | Geplande einddatum van het werk |

**Drempels** (in `frontend/src/lib/deadlines.ts`):

- `approaching` = deadline binnen 3 dagen, status ≠ AFGEWERKT/GEWEIGERD
- `overdue` = deadline gepasseerd, status ≠ AFGEWERKT/GEWEIGERD
- Aanvragen zonder deadline of in eindstatus → `none`

**UI-meldingen**:

- **Detailpagina**: alarm-banner tussen header en 2-koloms grid bij
  `approaching` (oranje, `AlarmClock`-icoon) of `overdue` (rood,
  `AlertTriangle`-icoon).
- **Lijstpagina**: nieuwe kolom "Deadline" met state-chip in dezelfde
  kleuren; aanvragen zonder deadline tonen `—`.
- **Details-kaart**: drie nieuwe rijen met iconen `AlarmClock` (Deadline,
  inline waarschuwingstekst), `Calendar` (Startdatum), `CalendarCheck2`
  (Einddatum). De kaart-header heeft een `Pencil` "Planning"-knop voor
  de assignedTo-eigenaar en ADMIN/FM/DH; opent een modal met drie
  `<input type="date">`-velden.

**Notificaties** (server-side, in `frontend/src/lib/deadline-notifications.ts`):

- Bij elke `GET /api/work-requests` (lijst-fetch) wordt
  `processDeadlineNotifications()` op de achtergrond aangeroepen.
- Voor elke aanvraag met `assignedToId IS NOT NULL`, `deadline IS NOT NULL`,
  status ≠ `AFGEWERKT`/`GEWEIGERD` en deadline approaching/overdue:
  maakt een notificatie aan voor de toegewezen behandelaar van type
  `WORK_REQUEST_DEADLINE_APPROACHING` of `_EXCEEDED`.
- **Idempotent** via 24 u-throttle op `(userId, entityId, type)` —
  bestaande recente notificatie binnen 24 u → skip.
- Failures gelogd, lijst-respons blijft werken.

**API** (`PATCH /api/work-requests/[id]`):

- Accepteert `deadline`, `startDate`, `endDate` (ISO-strings of `null`).
- Permissie: assignedTo + ADMIN/FM/DH (zelfde set als progress-edit /
  force-assign).
- `POST /api/work-requests` accepteert dezelfde drie velden bij creatie
  (optioneel; standaard `null`).

**Migratie-SQL (v1.6 fase D)**:

```sql
-- Datum-kolommen op werkaanvragen
ALTER TABLE "work_requests"
  ADD COLUMN IF NOT EXISTS "deadline"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "end_date"   TIMESTAMP(3);

-- Nieuwe NotificationType-waardes (los uitvoeren — niet binnen transactie)
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'WORK_REQUEST_DEADLINE_APPROACHING';
ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'WORK_REQUEST_DEADLINE_EXCEEDED';
```

`prisma db push` regelt dit ook automatisch.

### v1.6 fase C — invitation-flow + scope-RBAC

**Auth — co-existentie van Microsoft Entra ID SSO en password-login:**

- `POST /api/auth/password-login` (e-mail + wachtwoord → JWT). Rate-limiting
  via Vercel/edge nog niet geïmplementeerd.
- Login-pagina toont beide opties (Microsoft 365 boven, e-mail/wachtwoord
  onder).

**Invitation-flow:**

- `POST /api/invitations` (ADMIN/FM/DH) maakt token + verstuurt mail via
  Resend. E-mail-template in `frontend/src/lib/mail.ts` met HandyMan
  emerald/cyan gradient header.
- `GET /api/invitations` — lijst (alle uitnodigingen) voor ADMIN/FM/DH.
- `DELETE /api/invitations/[id]` — intrekken (alleen niet-geaccepteerde).
- `GET /api/invitations/lookup?token=` — publiek; geeft email +
  inviterName + valid-status terug.
- `POST /api/invitations/accept` — publiek; ontvangt `{ token, password }`,
  hasht wachtwoord (bcrypt 12 rounds), maakt User of activeert bestaande
  User, markeert invitation, fired notificaties (USER_REGISTERED) naar alle
  actieve ADMIN/FM/DH. Wachtwoord-minimum: 10 tekens.
- `POST /api/auth/complete-profile` — vereist auth; vult firstName/
  lastName/phone/jobTitle/department aan, zet `profileCompleted=true`.

**Pagina's:**

- `/accept-invite/[token]/page.tsx` — wachtwoord instellen + automatisch
  inloggen + redirect naar `/profile/complete` (of werkaanvragen als al
  voltooid).
- `/profile/complete/page.tsx` — eerste-login profielformulier; geblokkeerde
  redirect via AppLayout zolang `profileCompleted=false`.

**Scope-filter (campus-gebaseerde toegang):**

- `users.scope_campus_id` (uit fase A) bepaalt of een gebruiker alleen
  werkaanvragen van één campus ziet of de volledige organisatie.
- Toegepast op `GET /api/work-requests` (lijst), `GET /api/work-requests/[id]`,
  `PATCH /api/work-requests/[id]`, `GET/POST /api/work-requests/[id]/comments`.
- Niet-MEDEWERKER met `scopeCampusId !== null` ziet alleen aanvragen van die
  campus. Buiten-scope-id-lookups krijgen 404 (geen leak).

**MEDEWERKER-restrictie:**

- API-niveau: MEDEWERKER ziet alléén werkaanvragen waar `requestedById ===
  user.id`. Andere routes geven 403 (`/api/users`, `/api/users/technical-staff`,
  `/api/invitations*`, `/api/users/[id]*`).
- UI-niveau: sidebar verbergt Dashboard/Taken/Projecten/Aankopen/Beheer.
  AppLayout redirect MEDEWERKER van álle paden behalve `/work-requests/*`
  en `/profile/*` terug naar `/work-requests`.
- Resultaat: MEDEWERKER kan alléén nieuwe aanvragen indienen + eigen
  aanvragen bekijken. Niets anders.

**Admin UI — nieuwe Uitnodigingen-tab:**

- `/admin` toont nu vijf tabs (rol-gefilterd):
  - **Gebruikers** (DH/FM/ADMIN) — scope-toewijzing toegevoegd: select
    "Volledige organisatie" of een campus per gebruiker.
  - **Uitnodigingen** (DH/FM/ADMIN) — formulier (e-mail + voorgestelde
    rol + scope) + lijst lopende uitnodigingen (intrekken-knop) + lijst
    geaccepteerde uitnodigingen.
  - **Campussen, Categorieën, Instellingen** (FM/ADMIN, ongewijzigd).
- DH ziet dus enkel Gebruikers + Uitnodigingen.
- Sidebar `Beheer`-link is uitgebreid naar DIENSTHOOFD.

**Notificaties:**

- Nieuwe `NotificationType` enum-waarde `USER_REGISTERED` en
  `WORK_REQUEST_ASSIGNED` (laatste gereserveerd, nog niet gebruikt).
- Bij accept-invite worden notificaties aangemaakt voor alle actieve
  ADMIN/FM/DH met titel "Nieuwe medewerker aangemeld" en `entityType=user`,
  `entityId=user.id`. De Notifications-bell pikt deze automatisch op.

**Nieuwe env-vars op Vercel (vereist voor fase C):**

| Variabele | Beschrijving |
|---|---|
| `RESEND_API_KEY` | API-key voor het versturen van uitnodigingsmails |
| `MAIL_FROM` | Verzendadres in formaat `HandyMan <noreply@example.be>` |
| `APP_URL` | Publieke URL (bv. `https://handyman-eta-mocha.vercel.app`) — wordt gebruikt om de accept-invite link te bouwen |

**Migratie-SQL (v1.6 fase C):** alleen één enum-uitbreiding nodig:

```sql
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WORK_REQUEST_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'USER_REGISTERED';
```

> Belangrijk: in Postgres mag `ALTER TYPE ... ADD VALUE` niet binnen een
> transactie draaien. Voer beide statements los uit (Supabase SQL Editor
> doet dit automatisch correct).

### v1.6 fase C-2 — multi-campus scope

De single-campus scope (`users.scope_campus_id`) is vervangen door een
**many-to-many** relatie. Een gebruiker (en uitnodiging) kan nu één,
meerdere of géén campussen hebben:

| `scopeCampuses` | Toegang |
|---|---|
| `[]` (leeg) | **Volledige organisatie** (alle werkaanvragen) |
| `[campus A]` | Alleen werkaanvragen van campus A |
| `[campus A, campus B, …]` | Werkaanvragen van álle gekozen campussen |

Twee nieuwe join-tabellen: `user_campus_scopes` en
`user_invitation_scopes`. De oude `scope_campus_id`-kolommen op `users`
en `user_invitations` verdwijnen (data wordt eerst gemigreerd naar de
join-tabellen). API-handlers gebruiken `where.campusId IN
(scopeCampusIds)` voor het filter.

**Migratie-SQL (v1.6 fase C-2)** — moet vóór de deploy gedraaid
worden, anders crasht de app op missing column / table:

```sql
-- 1. Nieuwe join-tabellen
CREATE TABLE IF NOT EXISTS "user_campus_scopes" (
  "user_id"   TEXT NOT NULL,
  "campus_id" TEXT NOT NULL,
  CONSTRAINT "user_campus_scopes_pkey" PRIMARY KEY ("user_id","campus_id")
);
CREATE INDEX IF NOT EXISTS "user_campus_scopes_campus_id_idx"
  ON "user_campus_scopes"("campus_id");
ALTER TABLE "user_campus_scopes"
  ADD CONSTRAINT "user_campus_scopes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_campus_scopes"
  ADD CONSTRAINT "user_campus_scopes_campus_id_fkey"
  FOREIGN KEY ("campus_id") REFERENCES "campuses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "user_invitation_scopes" (
  "invitation_id" TEXT NOT NULL,
  "campus_id"     TEXT NOT NULL,
  CONSTRAINT "user_invitation_scopes_pkey" PRIMARY KEY ("invitation_id","campus_id")
);
CREATE INDEX IF NOT EXISTS "user_invitation_scopes_campus_id_idx"
  ON "user_invitation_scopes"("campus_id");
ALTER TABLE "user_invitation_scopes"
  ADD CONSTRAINT "user_invitation_scopes_invitation_id_fkey"
  FOREIGN KEY ("invitation_id") REFERENCES "user_invitations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_invitation_scopes"
  ADD CONSTRAINT "user_invitation_scopes_campus_id_fkey"
  FOREIGN KEY ("campus_id") REFERENCES "campuses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill bestaande single-scope rijen (alleen als kolommen nog bestaan)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'scope_campus_id'
  ) THEN
    EXECUTE 'INSERT INTO "user_campus_scopes" ("user_id","campus_id")
             SELECT id, scope_campus_id FROM "users"
             WHERE scope_campus_id IS NOT NULL
             ON CONFLICT DO NOTHING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_invitations' AND column_name = 'scope_campus_id'
  ) THEN
    EXECUTE 'INSERT INTO "user_invitation_scopes" ("invitation_id","campus_id")
             SELECT id, scope_campus_id FROM "user_invitations"
             WHERE scope_campus_id IS NOT NULL
             ON CONFLICT DO NOTHING';
  END IF;
END $$;

-- 3. Drop oude single-scope kolommen + FKs + indexen
ALTER TABLE "users"
  DROP CONSTRAINT IF EXISTS "users_scope_campus_id_fkey";
DROP INDEX IF EXISTS "users_scope_campus_id_idx";
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "scope_campus_id";

ALTER TABLE "user_invitations"
  DROP CONSTRAINT IF EXISTS "user_invitations_scope_campus_id_fkey";
ALTER TABLE "user_invitations"
  DROP COLUMN IF EXISTS "scope_campus_id";
```

> Of pragmatisch: `cd frontend && npx prisma db push` — dat regelt
> alles automatisch (Prisma genereert de juiste DDL voor de nieuwe
> models). Backfill loopt dan **niet** automatisch; bestaande
> single-scope-toewijzingen gaan verloren en moeten handmatig
> hertoegekend worden via `/admin → Gebruikers`. Voor productie:
> draai eerst de SQL hierboven (met backfill) in de Supabase SQL
> Editor en pas dán `prisma db push` voor verificatie.

### v1.6 fase B — pickup-flow

**Eigenaarschap losgekoppeld van aanvragerschap.** TD en Diensthoofd
"pikken aanvragen op" via een knop; pas dán krijgen ze het bewerkrecht
op de voortgangsslider. De aanvrager blijft altijd zichtbaar in
Details, maar heeft géén bewerkrecht meer op de voortgang.

### API

`PATCH /api/work-requests/[id]` accepteert nu `assignedToId`:

| Action | Body | Permissie | Side effect |
|---|---|---|---|
| **Claim (zelf)** | `{ assignedToId: <currentUser.id> }` | TD/DH/ADMIN/FM, alleen als `status === 'INGEDIEND'` en geen huidige eigenaar | Status `INGEDIEND` → `IN_BEHANDELING` |
| **Release (zelf)** | `{ assignedToId: null }` | huidige `assignedTo` of ADMIN/FM | — |
| **Force-assign** | `{ assignedToId: <other.id> }` | DH/FM/ADMIN; doelgebruiker moet TD/DH/ADMIN/FM zijn | Status `INGEDIEND` → `IN_BEHANDELING` |

`PATCH` met `progress` is nu **server-side ge-gate**: alleen
`assignedTo.id === user.id` (of ADMIN/FM) mag voortgang aanpassen. Dit
sluit de UI-only-gating-leemte uit "Bekende Beperkingen 1" voor
werkaanvragen.

`GET /api/work-requests/[id]` en de lijst-endpoint includen `assignedTo`
(id, displayName, email, avatarUrl, role) zodat de frontend de
gating-checks kan uitvoeren.

### UI

- **Detailpagina** (`/work-requests/[id]`):
  - Slider verschijnt alléén voor `workRequest.assignedTo?.id === user.id`.
  - Voortgangskaart heeft een knoppenrij onderaan: `Oppikken` /
    `Loslaten` / `Anders toewijzen` (afhankelijk van rol + state).
  - `Anders toewijzen` opent een modal met de lijst uit
    `/api/users/technical-staff` (uitgebreid met DIENSTHOOFD).
  - Details-kaart bevat een nieuwe rij **Toegewezen aan** met
    `UserCheck`-icoon. Toont "Nog niet opgepikt" wanneer leeg.
- **Lijstpagina** (`/work-requests`):
  - Nieuwe kolom **Toegewezen** (toont naam of italic "Niet opgepikt").
  - Inline `Oppikken`-knop op rijen waar status=`INGEDIEND` en
    niemand toegewezen, alleen voor TD/DH/ADMIN/FM.

### UI invariants — gewijzigd

`docs/UI_INVARIANTS.md` §1 is herschreven: eigenaar = `assignedTo`, niet
meer `requestedBy`. Aanvrager blijft zichtbaar in Details. Pickup-knoppen
zijn nu onderdeel van de Werkvooruitgang-kaart en mogen daar niet
verdwijnen.

### v1.6 fase A — auth-fundament

> Dit is een **infrastructuur-commit** zonder UI-wijzigingen. De feature
> wordt in drie fases uitgerold (A → B → C). Fase A levert het schema en
> de auth-helpers; fase B de pickup-flow; fase C de invitation-flow + RBAC.

### Schema-uitbreidingen

- `users.password_hash TEXT NULL` — bcrypt-hash voor uitgenodigde
  medewerkers (nullable; Entra-AD-gebruikers houden `NULL` en loggen via SSO).
- `users.azure_ad_id` — was `NOT NULL UNIQUE`, nu `NULL UNIQUE` zodat
  password-only accounts kunnen bestaan.
- `users.profile_completed BOOLEAN NOT NULL DEFAULT true` — bestaande
  users staan default op `true`; nieuwe uitgenodigde users worden op
  `false` gezet zodat de "vul je profiel aan"-flow getriggerd kan worden.
- ~~`users.scope_campus_id`~~ (verwijderd in fase C-2). Vervangen door de
  join-tabel `user_campus_scopes`: een gebruiker kan toegang hebben tot
  één, meerdere of géén campussen (lege selectie = volledige organisatie).
- `work_requests.assigned_to_id TEXT NULL` (FK → `users.id`) — eigenaar
  na "oppikken" door TD/Diensthoofd. `requested_by_id` blijft de
  oorspronkelijke aanvrager.
- Nieuwe tabel `user_invitations` (id, email, token, invited_by_id,
  suggested_role, scope_campus_id, expires_at, accepted_at, timestamps).

### Auth-token migratie (base64 → JWT)

Het base64-van-UUID-token is vervangen door een **HS256 JWT** met `sub`,
`iat`, `exp` (30 dagen). Implementatie in `frontend/src/lib/auth.ts`:

- `signSessionToken(userId)` / `verifySessionToken(token)`
- `getUserIdFromRequest(request)` / `getUserFromRequest(request)`
- `hashPassword(plain)` / `verifyPassword(plain, hash)` (bcrypt, 12 rounds)

**Nieuwe env-var op Vercel**: `AUTH_SECRET` — minstens 32 random tekens
(bijv. `openssl rand -base64 48`). Zonder deze env-var werkt login niet.
Bestaande sessies (oude base64-tokens) zijn na de deploy ongeldig — alle
gebruikers moeten één keer opnieuw inloggen.

### Migratie-SQL (v1.6 fase A)

```sql
-- users: password_hash, profile_completed, scope_campus_id; azure_ad_id nullable
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "profile_completed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "scope_campus_id" TEXT;

ALTER TABLE "users"
  ALTER COLUMN "azure_ad_id" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_scope_campus_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_scope_campus_id_fkey"
      FOREIGN KEY ("scope_campus_id") REFERENCES "campuses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_scope_campus_id_idx"
  ON "users"("scope_campus_id");

-- work_requests.assigned_to_id
ALTER TABLE "work_requests"
  ADD COLUMN IF NOT EXISTS "assigned_to_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_requests_assigned_to_id_fkey'
  ) THEN
    ALTER TABLE "work_requests"
      ADD CONSTRAINT "work_requests_assigned_to_id_fkey"
      FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "work_requests_assigned_to_id_idx"
  ON "work_requests"("assigned_to_id");

-- user_invitations
CREATE TABLE IF NOT EXISTS "user_invitations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "suggested_role" TEXT NOT NULL DEFAULT 'MEDEWERKER',
    "scope_campus_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_invitations_token_key"
  ON "user_invitations"("token");
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx"
  ON "user_invitations"("email");
CREATE INDEX IF NOT EXISTS "user_invitations_invited_by_id_idx"
  ON "user_invitations"("invited_by_id");
ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_invitations"
  ADD CONSTRAINT "user_invitations_scope_campus_id_fkey"
  FOREIGN KEY ("scope_campus_id") REFERENCES "campuses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

Het meest pragmatische alternatief: `cd frontend && npx prisma db push`.

## Wat is geïmplementeerd in v1.5

- **Eén voortgangsindicator** op de werkaanvraag detailpagina: slider voor de eigenaar, statische balk voor read-only kijkers. Voorheen werden beide tegelijk getoond — dat oogde dubbel.
- **Eigenaarschap als bewerkrecht** (i.p.v. rol). Alleen `workRequest.requestedBy.id === user.id` kan de slider bedienen. De vroegere `canEdit = user?.role !== 'MEDEWERKER'` is afgeschaft.
- **Volledige locatiehiërarchie zichtbaar** in de Details-kaart: naast Campus ook Gebouw, Afdeling en Kamer (elk alléén wanneer toegekend) met eigen lucide-iconen.
- **API en types uitgebreid**: GET/PATCH `/api/work-requests/[id]` includen nu `building`, `department`, `room`; het `WorkRequest`-type heeft `requestedBy.id` en de drie nieuwe optionele relaties.

## Wat is geïmplementeerd in v1.4

- **Werkaanvraag detailpagina** `/work-requests/[id]` met:
  - Metadata (aanvrager, campus/gebouw/afdeling/kamer, categorie, timestamps).
  - Voortgangsslider met vaste stappen van 20 % (0/20/40/60/80/100).
  - Automatische statusovergang bij `progress=100` → `AFGEWERKT` + `resolvedAt`; bij `progress>0` op `INGEDIEND` → `IN_BEHANDELING`.
  - Feedback-thread die bouwt op de bestaande `comments` tabel.
- **`progress` kolom** op `work_requests` (Int, 0–100, default 0, DB-niveau CHECK constraint).
- **POST `/api/work-requests` fix**: aanvragen worden nu geregistreerd onder de aangemelde gebruiker (via Bearer token → user lookup). Voorheen viel hij terug op `prisma.user.findFirst()` wat willekeurig een gebruiker koos.
- **Live-UI updates**: `staleTime: 0` + `refetchOnMount: 'always'` + expliciete cache-invalidatie op alle mutaties, zodat toevoegingen en wijzigingen direct zichtbaar zijn zonder pagina-refresh. Ook veranderingen die buiten de app plaatsvinden (Supabase, andere tab) worden bij window-focus opgepikt.

## Wat is geïmplementeerd in v1.3

- Campusbeheer: aanmaken/bewerken/verwijderen van campussen met adres en stad
- Per campus: gebouwenbeheer met naam en optionele code
- Per campus: afdelingenbeheer (direct of onder een gebouw)
- Per afdeling: kamers/ruimtes met naam en/of nummer
- Categorie-hiërarchie met kleurlabel (colorpicker + HEX)
- Systeeminstellingen via SystemConfig key-value
- Gebruikersrol-wijziging persistent opslaan (voorheen ging het verloren)
- Gebruiker soft-delete (isActive=false)
- Werkaanvraag formulier met cascading campus → gebouw → afdeling → kamer selectie

## Bekende Beperkingen

Deze items zijn **niet geïmplementeerd** en zijn kandidaten voor v1.7+.
Items die in v1.6 zijn opgelost staan ter referentie als ✅ vermeld.

### Opgelost in v1.6

- ✅ **RBAC / eigenaarschap op werkaanvragen**: `requireAuth` + `requireRole`
  helpers; scope-filter; MEDEWERKER own-only; progress-PATCH server-side
  ge-gate op `assignedTo`.
- ✅ **E-mail-integratie**: Resend voor uitnodigingsmails (HTML-template
  in `lib/mail.ts`). Bij API-rejecties wordt de exacte foutboodschap
  doorgegeven (Resend SDK gooit niet, dus `result.error` wordt geïnspecteerd).
- ✅ **Token security**: bcrypt-passwords + HS256 JWT (was base64-UUID).
- ✅ **Multi-campus scope** (fase C-2): één gebruiker kan toegang hebben
  tot meerdere campussen via de join-tabel `user_campus_scopes`; lege
  selectie = volledige organisatie.
- ✅ **Planning-velden + deadline-alarm** (fase D): deadline/start_date/
  end_date op werkaanvragen, alarm-banner op detail, state-chip in
  lijst, automatische notificaties naar de toegewezen behandelaar.

### Open

1. **RBAC voor tasks/projects/purchases/dashboard/notifications API**:
   nog UI-only ge-gate. MEDEWERKER kan in theorie via curl `/api/tasks`
   bevragen — UI toont het niet maar server geeft data terug. v1.7-taak.
2. **Scope-filter op tasks/projects/purchases**: de `scope_campus_id`
   wordt momenteel alleen op werkaanvragen toegepast (zoals afgesproken
   in v1.6). Uitbreiden naar overige entiteiten = v1.7.
3. **Wachtwoord-reset / "vergeten"-flow**: er is geen reset-endpoint;
   admin moet manueel een nieuwe uitnodiging sturen als iemand z'n
   wachtwoord vergeten is.
4. **Rate-limiting op `/api/auth/password-login`**: brute-force-bescherming
   ontbreekt. Vercel/edge rate-limit toevoegen in v1.7.
5. **Profiel bewerken na completion**: `/profile` toont gegevens maar
   editen werkt niet — alleen `/profile/complete` schrijft (eenmalig).
6. **Foto upload**: het werkaanvraag formulier toont een upload area,
   maar de daadwerkelijke file upload is nog niet geïmplementeerd.
7. **Taak- en projectdetail**: `/tasks/[id]` en `/projects/[id]` ontbreken.
8. **Work request conversie**: "Omzetten naar taak/project/aankoop"
   knoppen bestaan niet in de UI.
9. **Comments op taken/projecten**: de `comments` tabel is polymorf,
   maar UI-integratie bestaat alleen voor werkaanvragen.
10. **Taak werkregistratie**: geen UI voor het logboek bij taken.
11. **Zoekfunctie**: de globale zoekbalk in de navbar is niet functioneel.
12. **Mobile sidebar**: de hamburger menu toggle werkt niet op mobile.
13. **Seed data**: de database is leeg bij eerste deploy — gebruik
    `/admin` om campussen/categorieën aan te maken. Eerste user wordt via
    Microsoft SSO automatisch aangemaakt; na inloggen kan deze zichzelf
    de ADMIN-rol toekennen via een directe Supabase-update.
14. **Goedkeuringsflow UI**: aankoop goedkeuren/afwijzen knoppen
    ontbreken in de UI.
15. **Budget alerts**: budget-overschrijding notificaties niet
    geïmplementeerd.
16. **Deadline scheduler (cron)**: `processDeadlineNotifications()`
    draait nu on-fetch bij elke `GET /api/work-requests`. Voor een
    echte achtergrond-scheduler (bv. om mails te versturen wanneer
    niemand de lijst opent) is een Vercel Cron-job aangewezen — de
    helper is idempotent + 24 u-throttled, dus klaar om als
    `/api/cron/deadlines` aangesloten te worden.
17. **Legacy Location tabel**: naast de nieuwe Building/Department/Room
    hiërarchie bestaat nog de oude `locations` tabel die via
    `WorkRequest.locationId` gekoppeld is. Voor nieuwe aanvragen wordt
    alleen de nieuwe hiërarchie gebruikt; oude data blijft voor backward
    compatibility.

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
2. **Eerst:** `git fetch --all` zodat álle branches lokaal zichtbaar zijn. De repo bevat tien+ feature branches; zonder fetch lijkt het alsof er minder werk is.
3. Checkout de **deploy-branch**: `git checkout claude/modernize-handyman-ui-EEzjx` (NIET `main` — dat is achterhaald en niet wat Vercel deployt).
4. Werk in `frontend/` — dat is de actieve app.
5. **Vóór elke commit**: lees `docs/UI_INVARIANTS.md` en `frontend/CLAUDE.md`. De SessionStart-hook toont de invariants automatisch. Run `cd frontend && npx tsc --noEmit && npm run build` om groen licht te krijgen.
6. Na schema-wijzigingen: update `frontend/prisma/schema.prisma`, draai `npx prisma db push` tegen de Supabase DB (of schrijf equivalente SQL voor de SQL Editor). Alternatief: zet Vercel's Build Command op `npm run build:with-db-sync` zodat elke deploy het schema automatisch synchroniseert. **Let op**: enum-uitbreidingen (zoals v1.6 `NotificationType.USER_REGISTERED`) vereisen `ALTER TYPE ... ADD VALUE` los uitgevoerd — niet binnen een transactie. `prisma db push` regelt dit correct.
7. Voor een nieuwe feature: blijf op `claude/modernize-handyman-ui-EEzjx` of maak een feature branch vanaf die branch. Een feature branch ergens anders heeft géén effect op de live deploy.
8. `git push -u origin claude/modernize-handyman-ui-EEzjx` triggert automatisch een Vercel productie-deployment.
9. De `backend/` map bevat de originele NestJS code als referentie; deze draait niet op Vercel.
