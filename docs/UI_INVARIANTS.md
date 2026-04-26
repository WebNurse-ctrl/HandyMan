# UI Invariants — must NOT be regressed

Dit document beschrijft UI-beslissingen die de eindgebruiker eerder expliciet
heeft gevraagd. Deze beslissingen mogen niet teruggerold worden — ook niet
tijdens een grootschalige redesign of refactor — tenzij de eindgebruiker er
in deze sessie expliciet om vraagt.

**Voor Claude / AI assistenten:** lees dit bestand vóór je iets wijzigt aan
bestanden onder `frontend/src/app/` of `frontend/src/components/`. De
SessionStart hook (`.claude/settings.json`) toont deze inhoud automatisch bij
het begin van elke sessie.

---

## 1. Werkaanvraag detailpagina (`frontend/src/app/work-requests/[id]/page.tsx`)

### Layout (2-koloms grid op `lg:` breakpoint)

```
┌──────────────────────────────────┬─────────────────────┐
│ Hoofdkolom (lg:col-span-2)       │ Rechterzijbalk      │
│                                  │ (lg:col-span-1)     │
│ ┌──────────────────────────────┐ │ ┌─────────────────┐ │
│ │ Omschrijving                 │ │ │ Werkvooruitgang │ │
│ │  + reden weigering           │ │ │  (slider 0–100) │ │
│ └──────────────────────────────┘ │ └─────────────────┘ │
│                                  │                     │
│ ┌──────────────────────────────┐ │ ┌─────────────────┐ │
│ │ Feedback (comments)          │ │ │ Details         │ │
│ │  + nieuwe feedback formulier │ │ │  (met iconen)   │ │
│ └──────────────────────────────┘ │ └─────────────────┘ │
└──────────────────────────────────┴─────────────────────┘
```

### Niet-onderhandelbare regels

1. **Voortgangsindicator (`Werkvooruitgang`-kaart) staat in de RECHTER
   zijbalk**, bovenaan. Niet in de hoofdkolom, niet onder de omschrijving.
2. **Details-kaart bevat een icoon per veld** (`User`, `Building2`,
   `MapPin`, `Tag`, `Clock`, `CheckCircle2`). De icoon staat in een 36×36
   afgeronde tegel met `bg-muted text-muted-foreground` links van label+waarde.
3. **Hoofdkolom** bevat enkel: Omschrijving + Feedback (comments).
4. De `<aside>` met de zijbalk gebruikt `space-y-6` zodat de twee kaarten
   netjes onder elkaar staan met dezelfde gap als de hoofdkolom.

### Waarom

De gebruiker heeft deze layout in een eerdere sessie expliciet zo
ingericht. Tijdens de grote UI-overhaul (commit `a9e2039`) werd deze
indeling per ongeluk teruggerold; in de fix zijn de blokken hersteld
plus een lock-comment in de pagina-source geplaatst.

---

## 2. Theme & branding

- Brand-preset: **Emerald** (primary `#10b981`) + **Cyan** accent (`#06b6d4`).
- CSS variables in `frontend/src/app/globals.css` (`:root` voor licht,
  `.dark` voor donker). Niet hardcoden in componenten — gebruik altijd
  semantic tokens (`bg-card`, `text-foreground`, `border-border`, …).
- Theme toggle: `next-themes` met storage key `handyman-theme`,
  bediening via `frontend/src/components/ui/ThemeToggle.tsx`. Toegankelijk
  vanuit de navbar (icon-toggle) en `/profile` (segmented control).

---

## 3. Iconen-bibliotheek

- **Lucide-react** is de standaard iconenbibliotheek. Geen eigen inline
  SVG's introduceren in nieuwe pagina's.
- Brand-mark in `Sidebar` en `Login` mag wel een Wrench gradient zijn.

---

## 4. Layout-componenten

- `AppLayout`, `Sidebar`, `Navbar` → niet vervangen of zonder reden
  herschrijven. Sidebar is collapsible op mobiel via een overlay.
- Sidebar heeft secties (`Workspace`, `Beheer`) met een
  active-indicator-strip aan de linkerrand.

---

## Werkwijze bij twijfel

Als je niet zeker weet of een aanpassing een invariant breekt:

1. Vraag de gebruiker eerst expliciet of de bestaande layout intentioneel is.
2. Ga er bij grote refactors (multi-file UI overhaul) standaard van uit dat
   bestaande componentstructuur intentioneel is, en kopieer die structuur
   1-op-1 mee in de nieuwe styling.
3. Als een file een lock-comment heeft (zoals
   `LOCKED LAYOUT — see UI_INVARIANTS.md`), respecteer die comment.
