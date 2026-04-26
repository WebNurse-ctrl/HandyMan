# HandyMan — instructies voor Claude

Mono-repo voor HandyMan (facility-management platform). De applicatie
bestaat uit een Next.js frontend (in `frontend/`) en een verzameling
docs/scripts.

## Direct lezen vóór elke wijziging

1. **`docs/UI_INVARIANTS.md`** — UI-beslissingen die NIET teruggerold
   mogen worden. De eindgebruiker is geen developer; regressies in
   layout, iconen of theming zijn niet acceptabel.
2. **`frontend/CLAUDE.md`** — frontend-specifieke richtlijnen
   (themasysteem, locked layouts, build-commando's).

De `.claude/settings.json` SessionStart-hook toont de UI-invariants
automatisch bij het begin van elke Claude-sessie. Negeer die output
niet — het is contextueel relevant voor élke UI-wijziging.

## Werkstroom

- Standaard branch: `claude/modernize-handyman-ui-EEzjx` tenzij anders
  gevraagd.
- Vóór commit: `cd frontend && npx tsc --noEmit && npm run build`.
- Bij grootschalige refactors (multi-file UI overhaul) altijd eerst
  expliciet bevestigen dat bestaande UX-keuzes (bv. plaatsing van
  voortgangsindicator, iconen in details, etc.) behouden moeten blijven.
