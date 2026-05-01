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
2. **De Werkvooruitgang-kaart toont exact ÉÉN indicator per state**:
   - Voor de **eigenaar van de werkaanvraag** (= de aanvrager,
     `workRequest.requestedBy.id === user.id`): alleen de slider (range 0–100,
     step 20) plus de stap-knoppen. Geen separate gevulde balk erboven.
   - Voor **alle anderen** (read-only kijkers): alleen een gevulde balk met
     het percentage. Geen slider, geen stap-knoppen.
   - Beide tegelijk tonen (statische balk + slider tegelijkertijd) is een
     regressie en mag NIET. De rol-gebaseerde gating (`canEdit` o.b.v.
     `user.role !== 'MEDEWERKER'`) is afgeschaft — gebruik eigenaarschap.
3. **Details-kaart bevat een icoon per veld** (`User`, `Building2`,
   `Building`, `LayoutGrid`, `DoorOpen`, `MapPin`, `Tag`, `Clock`,
   `CheckCircle2`). De icoon staat in een 36×36 afgeronde tegel met
   `bg-muted text-muted-foreground` links van label+waarde.
4. **Volledige locatiehiërarchie in Details**: naast Campus toont de kaart
   ook **Gebouw**, **Afdeling** en **Kamer** (elk alléén wanneer aan de
   aanvraag toegekend). Mapping: `Building` voor gebouw, `LayoutGrid` voor
   afdeling, `DoorOpen` voor kamer. De legacy `location` (tekstlocatie)
   blijft optioneel onderaan met `MapPin` voor backward compatibility.
5. **Hoofdkolom** bevat enkel: Omschrijving + Feedback (comments).
6. De `<aside>` met de zijbalk gebruikt `space-y-6` zodat de twee kaarten
   netjes onder elkaar staan met dezelfde gap als de hoofdkolom.

### Waarom

De gebruiker heeft deze layout in een eerdere sessie expliciet zo
ingericht. Tijdens de grote UI-overhaul (commit `a9e2039`) werd deze
indeling per ongeluk teruggerold; in de fix zijn de blokken hersteld
plus een lock-comment in de pagina-source geplaatst.

In v1.5 (commit `1092232`) is bovendien de dubbele voortgangsindicator
weggewerkt en is het bewerkrecht herrouteerd van rol naar eigenaarschap
op verzoek van de gebruiker. Deze keuzes zijn nu gelockt — niet
terugrollen naar rol-gating of dubbele indicator zonder expliciete
nieuwe vraag.

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
