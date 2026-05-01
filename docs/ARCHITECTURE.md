# HandyMan - Architectuur Document

> ⚠️ **Historisch document — niet meer up-to-date**
>
> Dit bestand beschrijft de **oorspronkelijke** v1.0-architectuur:
> aparte NestJS-backend, Azure Container Apps, eigen PostgreSQL.
>
> De huidige v1.6-architectuur is **monolithisch op Vercel met
> Supabase**. Er is géén aparte backend meer; alle backend-logica zit
> in Next.js API Routes. Auth gebruikt naast Microsoft Entra ID ook
> bcryptjs/JWT password-login. E-mail loopt via Resend.
>
> Voor de actuele architectuur, schema, API-overzicht en deployment
> zie **[`../HANDOVER.md`](../HANDOVER.md)**. Dit bestand wordt
> bewaard voor historische referentie.

---

## Overzicht (v1.0, historisch)

HandyMan is een moderne, schaalbare webapplicatie voor facility management, ontworpen voor organisaties met meerdere campussen. De applicatie beheert werkaanvragen, taken, projecten, aankopen en budgetten.

---

## Technische Stack

| Component | Technologie | Versie |
|-----------|------------|--------|
| Frontend | Next.js (React) | 14.x |
| UI Framework | Tailwind CSS | 3.4.x |
| State Management | Zustand + TanStack Query | 4.x / 5.x |
| Backend | NestJS (Node.js) | 10.x |
| Database | PostgreSQL | 16.x |
| ORM | Prisma | 5.x |
| Authenticatie | Azure AD / Entra ID (MSAL) | - |
| API Documentatie | Swagger / OpenAPI | 3.0 |
| Containerisatie | Docker | - |
| CI/CD | GitHub Actions | - |
| Hosting | Azure Container Apps | - |

---

## Architectuur Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        AZURE CLOUD                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Azure Container Apps                   │ │
│  │  ┌──────────────┐     ┌──────────────┐                  │ │
│  │  │  Frontend     │     │   Backend    │                  │ │
│  │  │  (Next.js)    │────▶│  (NestJS)    │                  │ │
│  │  │  Port 3000    │     │  Port 3001   │                  │ │
│  │  └──────────────┘     └──────┬───────┘                  │ │
│  │                               │                          │ │
│  │                        ┌──────▼───────┐                  │ │
│  │                        │  PostgreSQL   │                  │ │
│  │                        │  (Azure DB)   │                  │ │
│  │                        └──────────────┘                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────┐    ┌────────────────┐                    │
│  │  Azure AD /     │    │  Microsoft     │                    │
│  │  Entra ID       │    │  Graph API     │                    │
│  │  (SSO + RBAC)   │    │  (Users/Mail)  │                    │
│  └────────────────┘    └────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
Users ──────────────── WorkRequests ──── Attachments
  │                       │    │            Comments
  │                       │    └───── RequestBundles
  │                       │
  ├── Tasks ──────────────┘
  │    │    ├── TaskLogs
  │    │    ├── Comments
  │    │    └── Attachments
  │    │
  │    └── Projects ────── PurchaseRequests
  │         │               │    ├── PurchaseApprovals
  │         │               │    └── Attachments
  │         ├── Comments
  │         └── Attachments
  │
  ├── Notifications
  └── AuditLogs

Campuses ──── Locations
Categories (self-referencing hierarchy)
SystemConfig (key-value pairs)
```

### Hoofdtabellen

| Tabel | Beschrijving |
|-------|-------------|
| `users` | Gebruikers gesynchroniseerd vanuit Azure AD |
| `campuses` | Campuslocaties van de organisatie |
| `locations` | Specifieke locaties binnen een campus |
| `categories` | Categorieen voor aanvragen en taken |
| `work_requests` | Werkaanvragen van medewerkers |
| `tasks` | Taken voor technische dienst |
| `task_logs` | Werkregistratie / logboek per taak |
| `projects` | Projecten met budget en voortgang |
| `purchase_requests` | Aankoopaanvragen met goedkeuringsflow |
| `purchase_approvals` | Goedkeuringen per aankoopverzoek |
| `notifications` | In-app notificaties |
| `comments` | Opmerkingen bij aanvragen/taken/projecten |
| `attachments` | Bijlagen (foto's, documenten) |
| `audit_logs` | Audit trail van alle wijzigingen |
| `system_config` | Systeemconfiguratie (grensbedragen etc.) |

---

## API Design

### Endpoints Overzicht

#### Authenticatie (`/api/auth`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/auth/login` | Start Microsoft OAuth flow |
| GET | `/auth/callback` | OAuth callback handler |
| GET | `/auth/me` | Haal huidig gebruikersprofiel op |

#### Gebruikers (`/api/users`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/users` | Lijst alle gebruikers |
| GET | `/users/technical-staff` | Lijst technisch personeel |
| GET | `/users/:id` | Gebruiker op ID |
| PATCH | `/users/:id/role` | Wijzig gebruikersrol |

#### Werkaanvragen (`/api/work-requests`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/work-requests` | Nieuwe aanvraag |
| GET | `/work-requests` | Lijst aanvragen (met filters) |
| GET | `/work-requests/:id` | Aanvraag details |
| PATCH | `/work-requests/:id` | Update aanvraag (triage) |
| POST | `/work-requests/:id/convert-to-task` | Omzetten naar taak |
| POST | `/work-requests/:id/reject` | Afwijzen met reden |

#### Taken (`/api/tasks`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/tasks` | Nieuwe taak |
| GET | `/tasks` | Lijst taken (met filters) |
| GET | `/tasks/:id` | Taak details |
| PATCH | `/tasks/:id` | Update taak |
| POST | `/tasks/:id/logs` | Werkregistratie toevoegen |

#### Projecten (`/api/projects`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/projects` | Nieuw project |
| GET | `/projects` | Lijst projecten |
| GET | `/projects/:id` | Project details met budget metrics |
| PATCH | `/projects/:id` | Update project |

#### Aankopen (`/api/purchases`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/purchases` | Nieuwe aankoopaanvraag |
| GET | `/purchases` | Lijst aankopen |
| GET | `/purchases/:id` | Aankoop details |
| POST | `/purchases/:id/approve` | Goedkeuren/afwijzen |
| PATCH | `/purchases/:id/ordered` | Markeer als besteld |
| PATCH | `/purchases/:id/delivered` | Markeer als geleverd |

#### Dashboard (`/api/dashboard`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/dashboard/overview` | Algemene statistieken |
| GET | `/dashboard/workload` | Werklast per medewerker |
| GET | `/dashboard/campus-stats` | Statistieken per campus |
| GET | `/dashboard/resolution-time` | Gemiddelde doorlooptijd |
| GET | `/dashboard/budget-summary` | Budget overzicht projecten |
| GET | `/dashboard/trends` | Maandelijkse trends |

#### Notificaties (`/api/notifications`)
| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/notifications` | Gebruiker notificaties |
| GET | `/notifications/count` | Ongelezen aantal |
| PATCH | `/notifications/:id/read` | Markeer als gelezen |
| PATCH | `/notifications/read-all` | Alles gelezen markeren |

---

## Authenticatie Flow

```
┌─────────┐    ┌─────────────┐    ┌──────────┐    ┌───────────┐
│ Browser  │───▶│  HandyMan   │───▶│ Azure AD │───▶│ Microsoft │
│          │    │  Backend    │    │ / Entra  │    │ Graph API │
│          │◀───│             │◀───│          │    │           │
└─────────┘    └─────────────┘    └──────────┘    └───────────┘

1. Gebruiker klikt "Inloggen met Microsoft 365"
2. Redirect naar Azure AD login pagina
3. Gebruiker logt in met werkaccount
4. Azure AD stuurt auth code terug
5. Backend wisselt code in voor access token
6. Backend haalt gebruikersprofiel op via Graph API
7. Backend maakt/update gebruiker in database
8. Backend genereert JWT token
9. Frontend ontvangt JWT en slaat op in localStorage
10. Alle API calls gebruiken JWT Bearer token
```

---

## Rollen & Rechten Model (RBAC)

| Functie | Medewerker | Technische Dienst | Diensthoofd | Facilitair Manager | Admin |
|---------|:----------:|:-----------------:|:-----------:|:------------------:|:-----:|
| Aanvraag indienen | V | V | V | V | V |
| Eigen aanvragen zien | V | V | V | V | V |
| Alle aanvragen zien | | V | V | V | V |
| Triage / dispatching | | V | V | V | V |
| Taken beheren | | V | V | V | V |
| Taken toegewezen krijgen | | V | | | |
| Projecten aanmaken | | | V | V | V |
| Projecten beheren | | | V | V | V |
| Aankopen aanvragen | | V | V | V | V |
| Aankopen goedkeuren | | | V | V | V |
| Grote aankopen goedkeuren | | | | V | V |
| Rapportering bekijken | | V | V | V | V |
| Gebruikers beheren | | | | V | V |
| Systeeminstellingen | | | | | V |

---

## Notificatie Architectuur

### Triggers

| Event | Ontvangers | Kanaal |
|-------|-----------|--------|
| Nieuwe werkaanvraag | Technische dienst | In-app + Email |
| Status wijziging aanvraag | Aanvrager | In-app + Email |
| Taak toegewezen | Toegewezen medewerker | In-app + Email |
| Taak status gewijzigd | Betrokken gebruikers | In-app |
| Deadline nadert (3 dagen) | Toegewezen medewerker | In-app + Email |
| Aankoop wacht op goedkeuring | Diensthoofd / FM | In-app + Email |
| Aankoop goedgekeurd/afgewezen | Aanvrager | In-app + Email |
| Budget alert (>90%) | Diensthoofd + FM | In-app + Email |

### Email Delivery

Emails worden verzonden via **Microsoft Graph API** met een service account of application permissions. De `NotificationScheduler` controleert dagelijks om 08:00 op naderende deadlines.

---

## UX/UI Schermen

### 1. Login Pagina
- Microsoft 365 SSO button
- Clean design, branding consistent

### 2. Dashboard
- 4x statistiek kaarten (KPIs)
- Maandelijkse trend grafiek
- Werklast per teamlid
- Budget overzicht projecten (alleen managers)

### 3. Werkaanvragen
- **Lijst**: filterable tabel met status, prioriteit, campus
- **Nieuw formulier**: titel, omschrijving, campus, categorie, prioriteit, foto
- **Detail**: volledige aanvraag met comments, bijlagen, statushistorie

### 4. Taken
- **Lijst**: tabel met toewijzing, deadline, status
- **Detail**: taakinfo, werklogboek, comments, gekoppelde aanvraag/project

### 5. Projecten
- **Overzicht**: kaarten met budgetvoortgang
- **Detail**: taken, aankopen, budget metrics, voortgangsvisualisatie

### 6. Aankopen
- **Lijst**: tabel met bedrag, type, goedkeuringsstatus
- **Goedkeuringsflow**: approve/reject met commentaar

### 7. Beheer
- Gebruikersbeheer met rolletoewijzing
- Campus/locatie configuratie
- Categoriebeheer
- Systeeminstellingen

---

## Security Maatregelen

1. **Authenticatie**: Azure AD SSO via OAuth 2.0 / OpenID Connect
2. **Autorisatie**: JWT tokens met RBAC guards op elk endpoint
3. **API Security**: Helmet middleware, CORS configuratie
4. **Input Validatie**: class-validator op alle DTOs
5. **SQL Injection**: Prisma ORM (parameterized queries)
6. **XSS**: Next.js automatic escaping + Content Security Policy
7. **Audit Logging**: Alle wijzigingen worden gelogd met gebruiker, actie en tijdstip
8. **Data Isolatie**: Medewerkers zien alleen eigen aanvragen

---

## Deployment Architectuur (Azure)

```
                    ┌─────────────────┐
                    │  Azure Front    │
                    │  Door / CDN     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Azure Container │
                    │ Apps Environment│
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Frontend    │ │
                    │ │ (Next.js)   │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ Backend     │ │
                    │ │ (NestJS)    │ │
                    │ └──────┬──────┘ │
                    └────────┼────────┘
                             │
                    ┌────────▼────────┐
                    │ Azure Database  │
                    │ for PostgreSQL  │
                    │ Flexible Server │
                    └─────────────────┘
```

### Azure Resources Nodig:
- Azure Container Apps (frontend + backend)
- Azure Container Registry (ACR)
- Azure Database for PostgreSQL Flexible Server
- Azure Entra ID App Registration
- Azure Key Vault (secrets)
- Azure Monitor (logging)
