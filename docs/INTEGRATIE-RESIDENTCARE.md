# HandyMan → ResidentCare — Integratie-Handover

> **Doel van dit document.** Dit is een zelfstandige briefing voor een Claude Code sessie die draait **in de ResidentCare-repository**. Het beschrijft wat HandyMan technisch is, hoe het in elkaar zit, en welke concrete vragen je in ResidentCare moet beantwoorden om te bepalen óf en hóe HandyMan daar geïntegreerd kan worden. Je hebt waarschijnlijk geen toegang tot de HandyMan-broncode vanuit ResidentCare — alle feiten die je nodig hebt om de afweging te maken staan hieronder.
>
> Dit document neemt **geen** beslissing. Het geeft je de feiten van de HandyMan-kant plus een onderzoeksplan voor de ResidentCare-kant, zodat je na verkenning een onderbouwd integratie-advies kunt schrijven.

---

## 1. Wat is HandyMan in één alinea

HandyMan is een **facility-management webapplicatie** voor organisaties met meerdere campussen. Medewerkers dienen werkaanvragen in (kapotte verlichting, lekkende kraan, …), de technische dienst verwerkt die als taken of projecten, en managers beheren budgetten, aankopen en goedkeuringen. Productie draait als **monolithische Next.js 14 app op Vercel** met een **Supabase PostgreSQL** database en **Microsoft Entra ID (Azure AD) SSO**.

Live: `https://handyman-eta-mocha.vercel.app` · Repo: `github.com/WebNurse-ctrl/HandyMan` · Hoofdbranch: `main` (v1.0 → v1.4).

---

## 2. Belangrijke architectuur-nuance (lees dit eerst)

De repo bevat **twee codebases**, en dit is de grootste valkuil bij een integratie-afweging:

| Map | Stack | Status |
|-----|-------|--------|
| `frontend/` | **Next.js 14 App Router** (UI + API Routes in één) | **DIT IS DE ACTIEVE PRODUCTIE-APP** op Vercel. Bevat alle v1.1–v1.4 features. |
| `backend/` | NestJS 10 + Prisma | **LEGACY / niet in gebruik.** Originele opzet, draait niet op Vercel. Alleen referentie. |

De `README.md`, `docs/ARCHITECTURE.md` en `docs/SETUP.md` beschrijven grotendeels de **oude NestJS + Azure Container Apps** opzet (aparte backend op poort 3001, JWT, Swagger, Docker Compose). Dat klopt **niet meer** met productie. De waarheid van vandaag staat in `HANDOVER.md` en in `frontend/`. **Baseer je integratie-oordeel op de Next.js-app, niet op de NestJS-docs.**

Concreet betekent dit: er is **geen aparte API-server**. Alle backend-logica draait in Next.js API Routes (`frontend/src/app/api/**/route.ts`) als Vercel serverless functions. Integreren = de Next.js-app + zijn database + zijn auth meenemen, niet een losse service aansluiten.

---

## 3. Tech stack (actieve app)

| Component | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router), React 18 |
| Taal | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| ORM | Prisma 5.8 |
| Database | Supabase PostgreSQL (PgBouncer pooling op 6543, direct op 5432) |
| Auth | Microsoft Entra ID / Azure AD (OAuth 2.0 authorization-code flow) |
| State | Zustand (auth), TanStack Query v5 (server state) |
| HTTP | Axios met Bearer-token interceptor |
| Toasts | react-hot-toast |
| Hosting | Vercel (serverless, Root Directory = `frontend`) |

Dependencies zijn bewust **licht**: geen NextAuth, geen aparte auth-library, geen UI-component-library. Auth en RBAC zijn met de hand gebouwd. Zie `frontend/package.json`.

---

## 4. Datamodel (Prisma, 18 tabellen)

Bron: `frontend/prisma/schema.prisma`. Alle tabel-/kolomnamen zijn `snake_case` in Postgres via `@map`. Id's zijn UUID-strings.

**Kern-entiteiten en hun relaties:**

```
User ──< WorkRequest >── Campus
              │            ├──< Building ──< Department ──< Room
              │            └──< Department (buildingId = null, "direct op campus")
              │            └──< Location (legacy v1.0)
              ├──< Task ──< TaskLog
              ├──< Project (budget) ──< PurchaseRequest ──< PurchaseApproval
              ├──< Comment (polymorf: workRequest | task | project)
              └──< Attachment (polymorf)
Category (self-ref hiërarchie) ──< WorkRequest / Task
Notification · SystemConfig · AuditLog
```

**Locatie-hiërarchie (v1.3):** Campus → (optioneel Building) → Department → Room. Een Department hangt altijd aan een Campus en optioneel aan een Building. `work_requests` heeft `building_id`, `department_id`, `room_id` (allen nullable) náást de legacy `location_id`.

**Enums:** `UserRole` (MEDEWERKER, TECHNISCHE_DIENST, DIENSTHOOFD, FACILITAIR_MANAGER, ADMIN), `WorkRequestStatus`, `Priority`, `TaskStatus`, `ProjectStatus`, `PurchaseStatus`, `PurchaseType`, `NotificationType`. Waarden zijn **Nederlandstalig** (bv. `INGEDIEND`, `AFGEWERKT`).

> **Integratie-relevant:** dit is een fors, op zichzelf staand domein-schema. Bij een gedeelde database moet je naam-/schemabotsingen met ResidentCare's tabellen uitsluiten (denk aan `users`, `notifications`, `comments`, `attachments`, `audit_logs` — generieke namen die kunnen botsen). HandyMan claimt deze tabelnamen in het `public` schema.

---

## 5. Authenticatie & autorisatie (kritisch integratiepunt)

**Flow** (`frontend/src/app/api/auth/*`):
1. `/api/auth/login` → redirect naar Microsoft `oauth2/v2.0/authorize` (scopes `openid profile email User.Read`).
2. Microsoft → `/api/auth/callback?code=…` → ruilt code voor access-token → haalt profiel via Microsoft Graph (`/v1.0/me`) → upsert `User` in DB (rol afgeleid uit `jobTitle` bij eerste login).
3. Callback redirect naar `/login?token=<base64(userId)>`; frontend bewaart token in `localStorage` (`handyman_token`).
4. Elke API-call stuurt `Authorization: Bearer <token>`; server doet `atob(token)` → `userId` → `prisma.user.findUnique`.

**Wat je moet weten voor integratie:**
- Het "token" is **base64 van de user-UUID** — géén JWT, géén handtekening, géén vervaldatum. Niet cryptografisch veilig (bekende beperking). Zie `frontend/src/app/api/work-requests/route.ts:58-73` voor het decodeerpatroon.
- **RBAC wordt server-side niet afgedwongen.** De sidebar verbergt `/admin` voor niet-managers en de UI gate't sommige acties, maar de API-routes checken de rol grotendeels niet. Elke geldige token kan de meeste endpoints aanroepen.
- Auth is verweven met **één specifieke Azure AD-tenant** (env vars hieronder).

> Dit is hét scharnierpunt van de integratie-afweging: **hoe authenticeert ResidentCare?** Als ResidentCare ook Entra ID/Microsoft 365 gebruikt → SSO kan gedeeld worden (mogelijk dezelfde app-registration of een tweede redirect-URI). Als ResidentCare een ander auth-systeem heeft (eigen JWT, Auth0, Supabase Auth, sessions) → dan is auth-unificatie het grootste werk van de hele integratie, niet het domeinmodel.

---

## 6. API-oppervlak (Next.js Route Handlers)

Alle routes onder `frontend/src/app/api/`, allemaal `export const dynamic = 'force-dynamic'`. Hoofdgroepen:

- **Auth:** `/api/auth/{login,callback,me}`
- **Werkaanvragen:** `/api/work-requests` (GET lijst+filters, POST), `/api/work-requests/[id]` (GET/PATCH, progress + auto-status), `/api/work-requests/[id]/comments` (GET/POST feedback-thread)
- **Domein-lijsten:** `/api/{tasks,projects,purchases,notifications,users,campuses,categories}`
- **Cascade-selects:** `/api/{buildings,departments,rooms}` (met `?campusId=` / `?buildingId=` / `?departmentId=`)
- **Dashboard/KPI:** `/api/dashboard/{overview,workload,campus-stats,resolution-time,budget-summary,trends}`
- **Beheer (v1.3):** `/api/admin/{campuses,buildings,departments,rooms,categories,settings,users}` met nested CRUD

Volledige tabel met methods staat in `HANDOVER.md` (§ "API Routes Overzicht"). De API is **intern** (door de eigen frontend geconsumeerd), niet als publieke/versioned API ontworpen — geen OpenAPI-spec in de actieve app (de oude NestJS had Swagger).

---

## 7. Frontend-pagina's

`/dashboard`, `/work-requests` (+ `/new` met cascading locatie-selects, + `/[id]` detail met voortgangsslider 0–100 in stappen van 20 en feedback-thread), `/tasks`, `/projects`, `/purchases`, `/admin` (tabbed: Gebruikers/Campussen/Categorieën/Instellingen), `/login`. Layout met sidebar in `frontend/src/components/layout/`. Eigen CSS-utilities (`.card`, `.btn-primary`, `.badge-*`) i.p.v. een component-library.

---

## 8. Environment & deployment

| Env var | Functie |
|---------|---------|
| `DATABASE_URL` | Supabase pooled (6543, `?pgbouncer=true&statement_cache_size=0`) — runtime |
| `DIRECT_URL` | Supabase direct (5432) — voor `prisma db push`/migraties |
| `AZURE_AD_TENANT_ID` / `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` | Entra ID app-registration |
| `AZURE_AD_REDIRECT_URI` | Callback-URL (moet exact matchen met Azure-config) |

Vercel: Root Directory `frontend`, Build `prisma generate && next build` (of `build:with-db-sync` voor auto-schemasync), Node 20. Schemawijzigingen: `cd frontend && npx prisma db push` of het losse SQL-script in `frontend/prisma/migrations/`.

---

## 9. Bekende beperkingen (relevant voor een integratie-oordeel)

Uit `HANDOVER.md` — de items die de integratie raken:
1. **Geen server-side RBAC** op API-routes (UI-only gating).
2. **Token = base64(userId)**, niet veilig — moet bij productie-integratie waarschijnlijk vervangen worden.
3. **Foto-upload niet geïmplementeerd** (UI bestaat, backend niet).
4. **Geen e-mailnotificaties** (alleen in-app); Graph-mailintegratie ontbreekt.
5. **Cron/deadline-scheduler werkt niet op Vercel serverless.**
6. **Legacy `Location`-tabel** bestaat náást de nieuwe Building/Department/Room-hiërarchie.
7. Diverse UI-gaten (globale zoek, mobiele sidebar, aankoop-goedkeuringsknoppen, taak-/projectdetail).
8. **Geen automatische tests** in de actieve app.

Deze betekenen: HandyMan is een werkend MVP/v1.4, geen volledig gehard product. Een integratie erft deze schulden.

---

## 10. Wat je in ResidentCare moet uitzoeken (onderzoeksplan)

Voer dit uit ín de ResidentCare-repo en leg de bevindingen vast. Pas daarna geef je het integratie-advies.

**A. Stack-fit**
- Welk framework/taal gebruikt ResidentCare? (Next.js? Iets anders? Welke versie/router?)
- Welke database en ORM? Is het Postgres? Gebruikt het Prisma, en zo ja, is er één `schema.prisma` of meerdere?
- Hosting: Vercel, Azure, anders? Serverless of long-running?

**B. Auth-fit (zwaarst wegend)**
- Hoe logt een ResidentCare-gebruiker in? Entra ID/Microsoft 365, of iets anders?
- Bestaat er al een `User`-model? Hoe ziet identiteit/rollen eruit? Is er een sessie- of token-mechanisme dat hergebruikt kan worden?
- Zo Entra ID: dezelfde tenant als HandyMan? Kan dezelfde app-registration met een extra redirect-URI dienen?

**C. Datamodel-fit**
- Heeft ResidentCare al tabellen met namen `users`, `notifications`, `comments`, `attachments`, `audit_logs`, `categories`? (Botsingsrisico bij gedeeld schema.)
- Is er een gedeeld locatie-/campusbegrip (gebouwen, afdelingen, kamers) dat met HandyMan's hiërarchie overlapt of dat hergebruikt kan worden?
- Delen de twee domeinen entiteiten (bv. dezelfde "bewoner"/"medewerker"/"locatie")? Dat bepaalt of integratie diep (gedeeld model) of oppervlakkig (naast elkaar) moet zijn.

**D. UI/navigatie-fit**
- Heeft ResidentCare een eigen layout/sidebar/design-system waar HandyMan-schermen in moeten passen?
- Tailwind aanwezig? Welke versie/config? Botst HandyMan's eigen `.card`/`.btn-*` met bestaande utilities?

**E. Operationeel**
- CI/CD, env-var-beheer, secrets (Key Vault?), monitoring — past HandyMan's Vercel+Supabase-model daarin, of moet het migreren?

---

## 11. Mogelijke integratie-scenario's (kies na onderzoek)

Schets ter oriëntatie; bevestig de juiste route met de bevindingen uit §10.

1. **Naast elkaar (losse apps, gedeelde SSO).** ResidentCare en HandyMan blijven aparte deploys; alleen Entra ID-login en eventueel een gedeelde gebruikersbron worden gelijkgetrokken. *Laagste risico, snelst.* Geschikt als de domeinen los staan en alleen "één login + linkje" nodig is. Werkt alleen vlot als ResidentCare óók Entra ID gebruikt.
2. **Module/feature binnen ResidentCare (mono-app).** HandyMan's pagina's + API-routes + Prisma-modellen worden in de ResidentCare-codebase opgenomen. *Hoogste integratie, hoogste werk:* vereist dat ResidentCare ook Next.js + Prisma + Postgres is, plus het samenvoegen van twee Prisma-schema's en het oplossen van auth-/tabelnaam-conflicten.
3. **Iframe/micro-frontend embedding.** HandyMan blijft een eigen app, ingebed in ResidentCare's shell. *Middenweg:* weinig codevermenging, maar auth-token delen via iframe is lastig en HandyMan's localStorage-token maakt dit fragiel.
4. **Gedeelde database, gescheiden apps.** Beide apps praten met één Postgres; HandyMan's tabellen krijgen eventueel een eigen schema-namespace. *Vereist* dat naamconflicten opgelost zijn en dat het `User`-begrip wordt geünificeerd.
5. **Domeinlogica extraheren (her-implementatie).** Niet HandyMan integreren maar het werkaanvraag-/taken-/aankopen-domein opnieuw bouwen ín ResidentCare's eigen conventies. Te overwegen als de stacks sterk verschillen (bv. ResidentCare is geen Next.js/Prisma) — dan is "integreren" feitelijk porten.

**Doorslaggevende factoren:** (1) deelt ResidentCare de auth (Entra ID)? (2) is ResidentCare Next.js + Prisma + Postgres? (3) overlappen de domeinmodellen? Twee of meer "ja" → scenario 2/4 haalbaar. Overwegend "nee" → scenario 1 of 5.

---

## 12. Aanbevolen werkwijze voor de Claude-sessie in ResidentCare

1. Lees dit document volledig.
2. Voer het onderzoeksplan uit §10 uit op de ResidentCare-codebase (stack, auth, DB, model, UI).
3. Vul per sectie A–E concrete bevindingen in.
4. Match die tegen de scenario's in §11 en kies de meest haalbare.
5. Lever een integratie-advies op met: gekozen scenario, concrete stappen, geschat werk, risico's (vooral auth-unificatie en tabelnaam-/modelconflicten), en open vragen voor de opdrachtgever.
6. Bouw nog niets vóór het scenario bevestigd is.

---

*Bronnen in de HandyMan-repo: `HANDOVER.md` (volledige feature-/API-/schema-details, leidend), `frontend/prisma/schema.prisma` (datamodel), `frontend/src/app/api/**` (API-gedrag), `frontend/src/app/api/auth/**` + `frontend/src/lib/api.ts` + `frontend/src/hooks/useAuth.ts` (auth). De NestJS-`backend/` en de oude `docs/ARCHITECTURE.md`/`docs/SETUP.md` beschrijven de niet-actieve legacy-opzet — gebruik ze niet als waarheid voor productie.*
