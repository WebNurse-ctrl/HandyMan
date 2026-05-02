# HandyMan — Facility Management Platform

Moderne, schaalbare webapplicatie voor het beheren van werkaanvragen,
taken, projecten en aankopen voor organisaties met meerdere campussen.

**Live**: https://handyman-eta-mocha.vercel.app

## Versie

**v1.6** — gebruikersbeheer (uitnodigingen via e-mail), pickup-flow voor
de technische dienst, multi-campus scope-RBAC, MEDEWERKER-restricties
en planning-velden + deadline-alarmen. Uitgerold in fases A → B → C →
C-2 → D. Volledig overzicht in [`HANDOVER.md`](HANDOVER.md).

Volgende sessie wordt **v1.7** met focus op taken (`/tasks`) en
projecten (`/projects`); zie de roadmap-sectie onderaan
[`HANDOVER.md`](HANDOVER.md).

## Features

- **Werkaanvragen** — Medewerkers dienen aanvragen in met
  campus/gebouw/afdeling/kamer-locatie en categorie.
- **Pickup-flow** (v1.6 fase B) — Technische dienst en diensthoofd
  kunnen werkaanvragen oppikken en worden zo eigenaar (kunnen
  voortgang bijwerken). Aanvrager blijft altijd zichtbaar. Diensthoofd
  + Facilitair manager + Administrator kunnen ook anders-toewijzen.
- **Voortgangsslider** met automatische statusovergang (0 → 100% in
  stappen van 20).
- **Feedback-thread** per werkaanvraag (comments).
- **Gebruikersbeheer** (v1.6 fase C) — Admins/FM/Diensthoofden nodigen
  medewerkers uit via e-mail. Geactiveerde users stellen wachtwoord in
  en vervolledigen hun profiel; admins kennen rol + campus-scope toe.
- **Multi-campus scope-RBAC** (v1.6 fase C-2) — Gebruikers kunnen
  toegang hebben tot één, meerdere of géén campussen (lege selectie =
  volledige organisatie).
- **Planning + deadline-alarm** (v1.6 fase D) — Werkaanvragen kunnen
  een deadline + start- en einddatum krijgen. Bij naderende of
  overschreden deadline: alarm-banner op detail, state-chip in lijst,
  automatische notificaties naar de toegewezen behandelaar.
- **Dual auth** — Microsoft Entra ID SSO **én** e-mail/wachtwoord-login
  naast elkaar.
- **Notificaties** — In-app notificaties (bell in navbar) bij nieuwe
  werkaanvragen, oppikken, registratie van nieuwe medewerkers, …
- **Admin-paneel** — Tabs voor Gebruikers, Uitnodigingen, Campussen,
  Categorieën en Instellingen (rol-gefilterd).
- **Dark/light theme** — Emerald + cyan brand-preset, switchbaar via
  navbar of profiel.

## Tech Stack

| Component | Technologie |
|-----------|------------|
| Framework | Next.js 14 (App Router, monolithisch) |
| Taal | TypeScript |
| Styling | Tailwind CSS 3 + CSS variables |
| Database | Supabase PostgreSQL |
| ORM | Prisma 5.x |
| State | Zustand (auth) + TanStack Query (server-state) |
| Auth (SSO) | Microsoft Entra ID / Azure AD |
| Auth (password) | bcryptjs + jose JWT (HS256) |
| E-mail | Resend |
| Hosting | Vercel (serverless) |

> Er is **geen aparte backend-server**. Alle backend-logica draait in
> Next.js API Routes (`frontend/src/app/api/*`). De `backend/` map in
> de repo is legacy NestJS-code en wordt niet gedeployd.

## Snelstart

```bash
# Clone en zet branches up-to-date
git clone https://github.com/WebNurse-ctrl/HandyMan.git
cd HandyMan
git fetch --all
git checkout claude/modernize-handyman-ui-EEzjx

# Frontend installeren en draaien
cd frontend
npm install
npx prisma db push      # synchroniseert schema met Supabase (DIRECT_URL nodig)
npm run dev             # http://localhost:3000
```

Vereiste env-vars (zie ook `HANDOVER.md` § Environment Variables):

```
DATABASE_URL=...                # Supabase pooled (poort 6543)
DIRECT_URL=...                  # Supabase direct (poort 5432)
AZURE_AD_TENANT_ID=...
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_REDIRECT_URI=http://localhost:3000/api/auth/callback
AUTH_SECRET=...                 # ≥ 32 tekens (openssl rand -base64 48)
RESEND_API_KEY=...              # voor uitnodigingsmails
MAIL_FROM="HandyMan <noreply@jouwdomein.be>"
APP_URL=http://localhost:3000
```

## Documentatie

- [`HANDOVER.md`](HANDOVER.md) — **start hier**. Actuele projectstatus,
  schema, API-overzicht, deployment, bekende beperkingen.
- [`CLAUDE.md`](CLAUDE.md) — instructies voor Claude Code-sessies (root).
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend-specifieke
  richtlijnen, themasysteem, locked layouts.
- [`docs/UI_INVARIANTS.md`](docs/UI_INVARIANTS.md) — niet-onderhandelbare
  UI-regels (vooral voor de werkaanvraag-detailpagina).
- [`docs/SESSION_PROMPT.md`](docs/SESSION_PROMPT.md) — onboarding-prompt
  voor nieuwe Claude-sessies.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — **historisch**
  (oorspronkelijke NestJS + Azure-opzet); zie HANDOVER voor de huidige
  architectuur.
- [`docs/SETUP.md`](docs/SETUP.md) — **historisch** (lokale Docker-opzet
  met aparte backend); voor de Vercel/Supabase-opzet zie HANDOVER.

## Project Structuur

```
HandyMan/
├── backend/             # LEGACY - oude NestJS-code, niet gedeployd
├── frontend/            # DE ACTIEVE APP (Vercel Root Directory)
│   ├── prisma/          # schema.prisma (19 tabellen, v1.6)
│   └── src/
│       ├── app/         # App Router pages + API routes
│       │   ├── api/     # Serverless backend
│       │   ├── accept-invite/[token]/   # v1.6 wachtwoord instellen
│       │   ├── admin/                   # tabs + componenten
│       │   ├── work-requests/           # lijst + detail + new
│       │   ├── profile/complete/        # v1.6 eerste-login flow
│       │   └── ...
│       ├── components/  # layout, ui
│       ├── hooks/       # useAuth (zustand)
│       ├── lib/         # auth.ts (JWT/bcrypt + RBAC), mail.ts (Resend),
│       │                # prisma.ts, api.ts, utils.ts
│       └── types/       # TypeScript types
├── docs/
│   ├── UI_INVARIANTS.md
│   ├── SESSION_PROMPT.md
│   ├── ARCHITECTURE.md  # historisch
│   └── SETUP.md         # historisch
├── HANDOVER.md          # actuele projectstatus
├── CLAUDE.md            # claude-code instructies (root)
└── README.md            # dit bestand
```
