# HandyMan - Setup Guide

> ⚠️ **Historisch document — niet meer up-to-date**
>
> Dit bestand beschrijft de **oorspronkelijke** local-development opzet
> met Docker Compose + aparte NestJS-backend + lokale PostgreSQL.
>
> De huidige v1.6-opzet is een **monolithische Next.js app op Vercel**
> met Supabase als database. Er is géén Docker Compose, géén aparte
> backend, géén eigen PostgreSQL meer.
>
> Voor de actuele snelstart (clone → checkout deploy-branch →
> `npm install` → `prisma db push` → `npm run dev`) zie de
> [`README.md`](../README.md) en
> [`HANDOVER.md`](../HANDOVER.md) (sectie "Hoe verder te werken" en
> "Environment Variables"). Dit bestand wordt bewaard voor historische
> referentie.

---

## Vereisten (v1.0, historisch)

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optioneel)
- Azure AD / Entra ID tenant

## Snelstart met Docker

```bash
# Clone repository
git clone <repo-url>
cd HandyMan

# Start alle services
docker-compose up -d

# Database seeden
docker exec handyman-api npx prisma db seed
```

De applicatie is nu beschikbaar op:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger docs: http://localhost:3001/api/docs

## Handmatige Setup

### 1. Database

```bash
# Start PostgreSQL (of gebruik een bestaande instantie)
createdb handyman

# Of via Docker
docker run -d \
  --name handyman-db \
  -e POSTGRES_DB=handyman \
  -e POSTGRES_USER=handyman \
  -e POSTGRES_PASSWORD=handyman_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend

```bash
cd backend

# Kopieer .env
cp .env.example .env

# Pas .env aan met je Azure AD en database credentials

# Installeer dependencies
npm install

# Genereer Prisma client
npx prisma generate

# Voer migraties uit
npx prisma migrate dev

# Seed de database
npx prisma db seed

# Start development server
npm run start:dev
```

### 3. Frontend

```bash
cd frontend

# Kopieer .env
cp .env.example .env.local

# Pas .env.local aan met je Azure AD credentials

# Installeer dependencies
npm install

# Start development server
npm run dev
```

## Azure AD Configuratie

### App Registration aanmaken

1. Ga naar Azure Portal > Azure Active Directory > App registrations
2. Klik "New registration"
3. Vul in:
   - Naam: HandyMan
   - Redirect URI: `http://localhost:3001/api/auth/callback` (Web)
4. Na aanmaken, noteer:
   - Application (client) ID
   - Directory (tenant) ID
5. Ga naar "Certificates & secrets":
   - Maak een nieuw client secret
   - Noteer de waarde

### API Permissions

Voeg deze permissions toe:
- Microsoft Graph > Delegated:
  - `openid`
  - `profile`
  - `email`
  - `User.Read`
- Microsoft Graph > Application (voor notificatie emails):
  - `Mail.Send`

### .env configuratie

```env
AZURE_AD_TENANT_ID=<jouw-tenant-id>
AZURE_AD_CLIENT_ID=<jouw-client-id>
AZURE_AD_CLIENT_SECRET=<jouw-client-secret>
AZURE_AD_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

## Implementatieplanning

### Fase 1: Foundation (Week 1-2)
- [x] Project setup (monorepo, configs)
- [x] Database schema en migraties
- [x] Azure AD authenticatie
- [x] Gebruikersbeheer met rollen
- [x] Basis UI layout en navigatie

### Fase 2: Core Features (Week 3-5)
- [x] Werkaanvragen CRUD
- [x] Triage & dispatching
- [x] Takenbeheer met werkregistratie
- [x] Notificatie systeem

### Fase 3: Uitbreidingen (Week 6-8)
- [x] Projectbeheer met budget tracking
- [x] Aankoopbeheer met goedkeuringsflow
- [x] Dashboard & rapportering
- [ ] E-mail notificaties via Graph API

### Fase 4: Polish & Deploy (Week 9-10)
- [ ] End-to-end testing
- [ ] Performance optimalisatie
- [ ] Azure deployment
- [ ] UAT met eindgebruikers
- [ ] Documentatie en training

### Fase 5: Slimme Uitbreidingen (Backlog)
- [ ] AI-gebaseerde categorisatie
- [ ] Automatische prioriteitsuggesties
- [ ] Predictief onderhoud per locatie
- [ ] Templates voor taken/projecten
- [ ] Globale zoekfunctie
- [ ] SharePoint/OneDrive integratie
