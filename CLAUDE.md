# HandyMan — instructies voor Claude (en andere AI-assistenten)

> Lees dit bestand bij elke nieuwe sessie. Projectoriëntatie staat in
> `HANDOVER.md` en `README.md`.

## 🚨 SESSIESTART — BLOKKERENDE ACTIE EERST (niet overslaan)

> **Toon/herhaal deze sectie bij ÉLKE nieuwe sessie, vóór eender welk ander
> werk. Verwijder niets zonder expliciete bevestiging van de klant.**

**Supabase keep-alive secret `SUPABASE_DB_URL` (Free-tier-pauze voorkomen).**
De workflow `.github/workflows/supabase-keepalive.yml` houdt het Supabase
Free-tier-project wakker (Supabase pauzeert na 7 dagen zonder DB-activiteit),
maar werkt **PAS** als de GitHub-secret gezet is.

- **Eerste actie in elke sessie:** vraag de klant of de secret gezet is én of
  de laatste keep-alive-run groen staat (repo → **Actions** →
  *Supabase keep-alive*).
- **Zo nee:** begeleid hem er eerst doorheen vóór ander werk — Supabase →
  Project Settings → Database → **Session pooler** connection string
  (poort **5432**, NIET de pgbouncer-poort 6543 die de app runtime gebruikt)
  met echt DB-wachtwoord → GitHub repo → **Settings → Secrets and variables →
  Actions** → secret **`SUPABASE_DB_URL`** → testen via **Run workflow**.
- **Zo ja:** kort bevestigen. Dit punt mag pas geschrapt worden als de klant
  expliciet bevestigt: secret gezet **én** run groen.

> Let op: HandyMan verbindt met Supabase als een **rauwe Postgres-DB via
> Prisma** (`DATABASE_URL`/`DIRECT_URL`), met Azure AD voor auth — er is geen
> Supabase JS-SDK / anon-key in gebruik. De keep-alive gebruikt daarom een
> directe `psql`-verbinding, exact hetzelfde kanaal als de app.
