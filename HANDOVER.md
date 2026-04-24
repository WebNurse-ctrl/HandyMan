# HandyMan - Project Handover Document v1.4.1

> Dit document bevat alle informatie die nodig is om in een nieuwe Claude Code sessie verder te werken aan HandyMan. Lees dit bestand eerst volledig voordat je wijzigingen maakt.

## Wat is HandyMan?

HandyMan is een **facility management webapplicatie** voor organisaties met meerdere campussen. Medewerkers dienen werkaanvragen in (bijv. kapotte verlichting, lekkende kraan), de technische dienst verwerkt deze als taken of projecten, en managers beheren budgetten en goedkeuringen.

## Live Deployment

- **URL**: https://handyman-eta-mocha.vercel.app
- **Hosting**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Microsoft Entra ID (Azure AD) SSO
- **Repo**: github.com/WebNurse-ctrl/HandyMan
- **Actieve hoofdbranch**: `main` — bevat v1.0 → v1.4.1 (incl. v1.3 admin beheer + v1.4 detailpagina + v1.4.1 locatie/categorie in detailkaart)
- **v1.3 feature branch**: `claude/admin-campus-management-U7E1t` (gemerged in main)
- **v1.4 feature branch**: `claude/job-request-details-ZBKGT` (gemerged in main)
- **v1.4.1 feature branch**: `claude/add-location-category-details-68Ldu`

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
│   │   │   │   ├── auth/       # login, callback, me
│   │   │   │   ├── buildings/  # v1.3 - publiek GET (cascade select)
│   │   │   │   ├── campuses/
│   │   │   │   ├── categories/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── departments/# v1.3 - publiek GET (cascade select)
│   │   │   │   ├── notifications/
│   │   │   │   ├── projects/
│   │   │   │   ├── purchases/
│   │   │   │   ├── rooms/      # v1.3 - publiek GET (cascade select)
│   │   │   │   ├── tasks/
│   │   │   │   ├── users/      # list, [id] DELETE, [id]/role PATCH, technical-staff
│   │   │   │   └── work-requests/  # /route.ts lijst+create,
│   │   │   │                       # [id]/route.ts v1.4 GET/PATCH (progress),
│   │   │   │                       # [id]/comments/route.ts v1.4 GET/POST
│   │   │   ├── admin/          # v1.3 - tabs: Gebruikers, Campussen, Categorieën, Instellingen
│   │   │   │   └── _components/# UsersTab, CampusesTab, CategoriesTab, SettingsTab
│   │   │   ├── dashboard/
│   │   │   ├── login/
│   │   │   ├── projects/
│   │   │   ├── purchases/
│   │   │   ├── tasks/
│   │   │   ├── work-requests/  # /page.tsx lijst, /new cascading selects,
│   │   │   │                   # [id]/page.tsx v1.4 detail+progress+feedback
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
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

**18 tabellen** in `frontend/prisma/schema.prisma`:

| Tabel | Beschrijving |
|-------|-------------|
| `users` | Gebruikers via Azure AD SSO. `isActive=false` fungeert als soft-delete. |
| `campuses` | Campuslocaties (naam, code, adres, stad) |
| **`buildings`** | **v1.3** Gebouwen per campus (campusId, name, code). Cascade delete vanuit campus. |
| **`departments`** | **v1.3** Afdelingen. Altijd campusId, optioneel buildingId (null = direct op campus). |
| **`rooms`** | **v1.3** Kamers/ruimtes per afdeling (name en/of number). Cascade delete vanuit afdeling. |
| `locations` | Legacy v1.0 locaties. Nog steeds gekoppeld aan work_requests via locationId. |
| `categories` | Categorieën met hiërarchie (parentId) en kleurlabel (HEX in `color`). |
| `work_requests` | Werkaanvragen. v1.3: extra kolommen `building_id`, `department_id`, `room_id` (allen nullable). **v1.4**: extra kolom `progress INTEGER NOT NULL DEFAULT 0` (0–100, stappen van 20). |
| `request_bundles` | Groepering van gerelateerde werkaanvragen |
| `tasks` | Taken met taskNumber, toewijzing, deadline, project-koppeling |
| `task_logs` | Werkregistratie per taak (beschrijving, uren) |
| `projects` | Projecten met budget, voortgang |
| `purchase_requests` | Aankopen met goedkeuringsflow, type KLEIN/GROOT |
| `purchase_approvals` | Goedkeuringsregistratie per aankoop |
| `comments` | Polymorf: gekoppeld aan work_request, task, of project. **v1.4**: gebruikt door de feedback-thread op de werkaanvraag detailpagina. |
| `attachments` | Bestanden gekoppeld aan entiteiten |
| `notifications` | In-app notificaties per gebruiker |
| `system_config` | Key-value systeeminstellingen (beheerd via /admin Instellingen) |
| `audit_logs` | Audit trail van alle wijzigingen |

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

## Authenticatie Flow

```
Login knop → /api/auth/login → redirect naar Microsoft login
→ Gebruiker logt in met werkaccount
→ Microsoft redirect naar /api/auth/callback?code=xxx
→ Callback wisselt code voor access_token
→ Haalt profiel op via Microsoft Graph API
→ Maakt/update user in Supabase database
→ Redirect naar /login?token=base64(userId)
→ Frontend slaat token op in localStorage
→ /api/auth/me haalt user data op bij elke paginalading
```

**Token**: simpele base64-encoding van de user UUID. Wordt meegestuurd als `Authorization: Bearer <token>` header.

**Rol-detectie**: bij eerste login wordt de rol afgeleid uit het Azure AD jobTitle veld (daarna aanpasbaar in /admin).

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
| Beheer (/admin) | | | | x | x |

**Let op**: RBAC enforcement op de Next.js API routes is nog niet geïmplementeerd - de sidebar verbergt /admin voor niet-managers, maar de routes zelf checken de rol nog niet.

## API Routes Overzicht

Alle routes staan in `frontend/src/app/api/` en gebruiken `export const dynamic = 'force-dynamic'`.

### Publieke / generieke routes

| Route | Methods | Beschrijving |
|-------|---------|-------------|
| `/api/auth/login` | GET | Redirect naar Microsoft OAuth |
| `/api/auth/callback` | GET | Verwerkt Microsoft callback |
| `/api/auth/me` | GET | Huidige user ophalen |
| `/api/work-requests` | GET, POST | Lijst + aanmaken. v1.3 accepteert `buildingId`, `departmentId`, `roomId`. **v1.4**: POST registreert de aanvraag onder de aangemelde gebruiker (decodeert Bearer token → user) i.p.v. `findFirst()`. |
| `/api/work-requests/[id]` | **GET, PATCH** | **v1.4** Detail ophalen en bijwerken (progress/status/priority/rejectionReason). Bij `progress=100` → status `AFGEWERKT` + `resolvedAt`; bij `progress>0` op een `INGEDIEND` aanvraag → status `IN_BEHANDELING`. **v1.4.1**: GET/PATCH includen nu ook `building`, `department` en `room` (naast `campus`, `location`, `category`) zodat de detailpagina de volledige locatiehiërarchie kan tonen. |
| `/api/work-requests/[id]/comments` | **GET, POST** | **v1.4** Feedback-thread voor een werkaanvraag. POST plaatst een comment onder de aangemelde gebruiker. |
| `/api/tasks` | GET, POST | Taken |
| `/api/projects` | GET, POST | Projecten |
| `/api/purchases` | GET, POST | Aankopen |
| `/api/notifications` | GET | Notificaties |
| `/api/notifications/count` | GET | Ongelezen aantal |
| `/api/notifications/read-all` | PATCH | Alles als gelezen |
| `/api/users` | GET | Gebruikerslijst |
| `/api/users/[id]` | **DELETE** | **v1.3** Soft-delete (isActive=false) |
| `/api/users/[id]/role` | **PATCH** | **v1.3** Rol van gebruiker wijzigen |
| `/api/users/technical-staff` | GET | Technisch personeel |
| `/api/campuses` | GET | Actieve campussen |
| `/api/buildings` | GET | **v1.3** `?campusId=` vereist. Voor cascade selects. |
| `/api/departments` | GET | **v1.3** `?campusId=` of `?buildingId=`. Met `&scope=direct` enkel buildingId=null. |
| `/api/rooms` | GET | **v1.3** `?departmentId=` vereist. Voor cascade selects. |
| `/api/categories` | GET | Actieve categorieën |
| `/api/dashboard/*` | GET | KPI endpoints |

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
| `/login` | login/page.tsx | Microsoft SSO login |
| `/dashboard` | dashboard/page.tsx | KPI kaarten, trends, werklast, budgetten |
| `/work-requests` | work-requests/page.tsx | Tabel met filters |
| `/work-requests/new` | work-requests/new/page.tsx | **v1.3** Formulier met cascading locatie selects: Campus → (Gebouw) → Afdeling → Kamer |
| `/work-requests/[id]` | work-requests/[id]/page.tsx | **v1.4** Detailpagina: meta (aanvrager, campus/gebouw/afd./kamer, categorie, timestamps), voortgangsslider 0/20/40/60/80/100 % met auto-statusovergang, feedback-thread (Comments). Slider disabled voor MEDEWERKER. **v1.4.1**: Details-kaart toont nu expliciet aparte regels voor `Gebouw`, `Afdeling` en `Kamer` (waar van toepassing) naast campus, plus de categorie met kleurstip. |
| `/tasks` | tasks/page.tsx | Takenlijst |
| `/projects` | projects/page.tsx | Projectkaarten |
| `/purchases` | purchases/page.tsx | Aankopentabel |
| `/admin` | admin/page.tsx | **v1.3** Tabbed beheer: Gebruikers / Campussen / Categorieën / Instellingen |

### Admin tabs (v1.3)

- **Gebruikers** (`_components/UsersTab.tsx`): tabel met rol-dropdown (direct opslaan) en verwijderknop (soft-delete)
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

### Werkaanvraag detailpagina (v1.4)

Route: `/work-requests/[id]` — opgebouwd uit een hoofdkolom en een side-panel.

**Hoofdkolom (links)**:

1. **Omschrijving** met optioneel een weigeringsreden.
2. **Feedback**: lijst van comments (chronologisch) + inline textarea om een nieuwe toe te voegen. Iedere aangemelde gebruiker kan posten.

**Side-panel (rechts)**:

1. **Details**: metadata (aanvrager, `Campus`, `Gebouw`, `Afdeling`, `Kamer` — alleen indien ingevuld — plus `Categorie` met kleur-stip wanneer de categorie een `color` heeft, `Laatst bijgewerkt`, `Afgewerkt op`).
2. **Werkvooruitgang** (sinds **v1.4.1** verplaatst van de hoofdkolom naar het side-panel, onder Details):
   - Range-input `min=0 max=100 step=20` — de slider rast vast op de stappen 0, 20, 40, 60, 80, 100.
   - Klikbare stap-knoppen onder de balk voor directe selectie.
   - Kleur van de balk: grijs (0) → oranje (≥20) → blauw (≥60) → groen (=100).
   - Rol-gating: alleen niet-MEDEWERKER rollen kunnen de waarde bijwerken. De server verifieert geen rol (conform de huidige RBAC-status) — gating is enkel UI-niveau.
   - Automatische statusovergang: bij `progress=100` → status `AFGEWERKT` + `resolvedAt`; bij `progress>0` op een `INGEDIEND` aanvraag → status `IN_BEHANDELING`.

### Cache-gedrag (v1.4)

`providers.tsx` is afgesteld voor altijd-verse data:

- `staleTime: 0`
- `refetchOnMount: 'always'`
- `refetchOnWindowFocus: true`

Mutaties invalideren expliciet `['work-requests']`, `['dashboard']`, `['work-request', id]` en `['work-request-comments', id]` zodat lijst, KPI-kaarten en comment-badges direct verversen zonder handmatige pagina-refresh.

## UI Design Systeem

- **Kleuren**: primary (blauw), accent (oranje), success (groen), warning (oranje), danger (rood)
- **CSS classes**: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.input`, `.label`, `.badge-*`
- **Status badges**: `getStatusColor()` en `getStatusLabel()` in `lib/utils.ts`
- **Prioriteit**: `PriorityIndicator` component

## Environment Variables (Vercel)

| Variable | Beschrijving |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection (poort 6543, `?pgbouncer=true&statement_cache_size=0`) |
| `DIRECT_URL` | Supabase direct connection (poort 5432, voor migraties) |
| `AZURE_AD_TENANT_ID` | Microsoft Entra ID tenant ID |
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `AZURE_AD_CLIENT_SECRET` | App registration secret |
| `AZURE_AD_REDIRECT_URI` | `https://handyman-eta-mocha.vercel.app/api/auth/callback` |

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

## Wat is geïmplementeerd in v1.4.1

- **Locatiehiërarchie + categorie zichtbaar op werkaanvraag detailpagina**: de Details-kaart op `/work-requests/[id]` toont nu naast Campus ook expliciet de aparte regels `Gebouw`, `Afdeling` en `Kamer` (alleen getoond als ze ingevuld zijn), zodat de aanvrager direct ziet waar de aanvraag aan toebehoort. De `Categorie` wordt getoond inclusief de kleur-stip uit de categorie-instellingen.
- **API `/api/work-requests/[id]` GET + PATCH**: de `include` is uitgebreid met `building`, `department` en `room` (met relevante velden zoals `name`, `code`, `number`). De oude legacy `location` blijft beschikbaar voor backward compatibility.
- **TypeScript type `WorkRequest`**: uitgebreid met optionele `building`, `department` en `room` velden, en extra velden op `campus` (`code`) en `category` (`icon`, `color`).
- **Layout-wijziging detailpagina**: de kaart `Werkvooruitgang` is verplaatst van de hoofdkolom (links) naar het side-panel (rechts), direct onder de Details-kaart. Dit voorkomt dubbele voortgangsindicatoren en groepeert alle status/metadata-informatie aan de rechterkant.

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

Deze items zijn **niet geïmplementeerd** en zijn kandidaten voor v1.5+:

1. **RBAC enforcement op API routes**: de Next.js API routes controleren momenteel niet de gebruikersrol. De werkaanvraag detailpagina gating is UI-only; de PATCH endpoint accepteert een voortgangs-update van elke geldige token.
2. **Foto upload**: het werkaanvraag formulier toont een upload area, maar de daadwerkelijke file upload is nog niet geïmplementeerd.
3. **Taak- en projectdetail**: `/tasks/[id]` en `/projects/[id]` ontbreken nog (alleen `/work-requests/[id]` bestaat vanaf v1.4).
4. **Work request conversie**: "Omzetten naar taak/project/aankoop" knoppen bestaan niet in de UI.
5. **Comments op taken/projecten**: de `comments` tabel is polymorf, maar UI-integratie bestaat momenteel alleen voor werkaanvragen (v1.4).
6. **E-mail notificaties**: alleen in-app notificaties, geen Microsoft Graph email integratie.
7. **Taak werkregistratie**: er is geen UI voor het logboek/werkregistratie bij taken.
8. **Zoekfunctie**: de globale zoekbalk in de navbar is niet functioneel.
9. **Mobile sidebar**: de hamburger menu toggle werkt niet op mobile.
10. **Token security**: het token is een simpele base64 van de user ID - niet cryptografisch veilig.
11. **Seed data**: de database is leeg bij eerste deploy - gebruik /admin om campussen/categorieën aan te maken.
12. **Goedkeuringsflow UI**: aankoop goedkeuren/afwijzen knoppen ontbreken in de UI.
13. **Budget alerts**: budget overschrijding notificaties niet geïmplementeerd.
14. **Deadline scheduler**: de dagelijkse deadline check (cron) werkt niet op Vercel serverless.
15. **Legacy Location tabel**: naast de nieuwe Building/Department/Room hiërarchie bestaat nog de oude `locations` tabel die via `WorkRequest.locationId` gekoppeld is. Voor nieuwe aanvragen wordt alleen nog de nieuwe hiërarchie gebruikt; de oude data blijft bestaan voor backward compatibility.

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
2. Checkout de hoofdbranch: `git checkout main`
3. Werk in `frontend/` — dat is de actieve app.
4. Na schema-wijzigingen: update `frontend/prisma/schema.prisma`, draai `npx prisma db push` tegen de Supabase DB (of schrijf equivalente SQL voor de SQL Editor). Alternatief: zet Vercel's Build Command op `npm run build:with-db-sync` zodat elke deploy het schema automatisch synchroniseert.
5. Voor een nieuwe feature: maak een feature branch vanaf `main` (bijv. `feature/task-detail-page`) en merge terug in `main` als die klaar is.
6. `git push` triggert automatisch een Vercel deployment.
7. De `backend/` map bevat de originele NestJS code als referentie; deze draait niet op Vercel.
