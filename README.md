# HandyMan - Facility Management Platform

Een moderne, schaalbare webapplicatie voor het beheren van werkaanvragen, taken, projecten, aankopen en budgetten voor organisaties met meerdere campussen.

> Een **Salvion.Care**-project. Salvion.Care is de onderneming achter de
> zorg-softwaresuite — vlaggenschip **ResidentCare**, plus **CareDesk** en **HandyMan**.

## Features

- **Werkaanvragen** - Medewerkers dienen eenvoudig aanvragen in met foto-upload
- **Triage & Dispatching** - Centrale inbox voor technische dienst
- **Takenbeheer** - Taken toewijzen, opvolgen en werkregistratie bijhouden
- **Projectbeheer** - Projecten met budgetopvolging en voortgangsvisualisatie
- **Aankoopbeheer** - Goedkeuringsflow (diensthoofd -> facilitair manager)
- **Dashboard** - Realtime inzichten, trends en KPIs
- **SSO** - Microsoft 365 / Azure AD authenticatie
- **Notificaties** - In-app + e-mail via Microsoft Graph

## Tech Stack

| Layer | Technologie |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, TanStack Query |
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Auth | Azure AD / Entra ID (MSAL, OAuth 2.0) |
| Hosting | Azure Container Apps |
| CI/CD | GitHub Actions |

## Snelstart

```bash
# Start met Docker
docker-compose up -d

# Of handmatig
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Zie [docs/SETUP.md](docs/SETUP.md) voor volledige installatie-instructies.

## Documentatie

- [Architectuur](docs/ARCHITECTURE.md) - Technische architectuur, API design, database schema
- [Setup Guide](docs/SETUP.md) - Installatie, Azure AD configuratie, deployment

## Project Structuur

```
HandyMan/
├── backend/              # NestJS API
│   ├── prisma/           # Database schema & migraties
│   └── src/
│       ├── auth/         # Azure AD authenticatie
│       ├── users/        # Gebruikersbeheer
│       ├── work-requests/# Werkaanvragen
│       ├── tasks/        # Takenbeheer
│       ├── projects/     # Projectbeheer
│       ├── purchases/    # Aankoopbeheer
│       ├── notifications/# Notificaties
│       ├── dashboard/    # Rapportering
│       └── common/       # Gedeelde modules
├── frontend/             # Next.js applicatie
│   └── src/
│       ├── app/          # Pages (App Router)
│       ├── components/   # UI componenten
│       ├── hooks/        # React hooks
│       ├── lib/          # Utilities
│       └── types/        # TypeScript types
├── docs/                 # Documentatie
├── docker-compose.yml    # Local development
└── .github/workflows/    # CI/CD pipeline
```
