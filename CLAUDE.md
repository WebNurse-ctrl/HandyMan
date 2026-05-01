# HandyMan — instructies voor Claude

Mono-repo voor HandyMan (facility-management platform). De applicatie
bestaat uit een Next.js frontend (in `frontend/`) en een verzameling
docs/scripts.

## Direct lezen vóór elke wijziging

1. **`HANDOVER.md`** (root) — actuele projectstatus, deploy-branch, v1.x
   highlights, bekende beperkingen. Het versienummer bovenaan moet
   overeenkomen met de laatste sectie onder "Wat is geïmplementeerd in v1.x".
2. **`docs/UI_INVARIANTS.md`** — UI-beslissingen die NIET teruggerold
   mogen worden. De eindgebruiker is geen developer; regressies in
   layout, iconen, theming of indicator-gedrag zijn niet acceptabel.
3. **`frontend/CLAUDE.md`** — frontend-specifieke richtlijnen
   (themasysteem, locked layouts, build-commando's).

De `.claude/settings.json` SessionStart-hook toont de UI-invariants
automatisch bij het begin van elke Claude-sessie. Negeer die output
niet — het is contextueel relevant voor élke UI-wijziging.

## Werkstroom — branch-keuze is kritisch

- **Vercel deploy-branch (Production)**: `claude/modernize-handyman-ui-EEzjx`.
  Élke push hierheen triggert een productie-deploy op
  https://handyman-eta-mocha.vercel.app. **Werk standaard op deze branch**
  tenzij de gebruiker uitdrukkelijk een andere noemt.
- **`main` is GEEN deploy-bron** en loopt achter. Niet checkouten zonder
  reden — daar mis je de v1.5 fixes (één voortgangsindicator,
  eigenaarschap-gating, locatiehiërarchie).
- **Begin elke sessie met `git fetch --all`** zodat álle remote branches
  zichtbaar zijn (er zijn er tien+). Zonder fetch lijkt het alsof minder
  werk gedaan is dan in werkelijkheid.
- Vóór elke commit: `cd frontend && npx tsc --noEmit && npm run build`
  (beide groen).
- Push: `git push -u origin claude/modernize-handyman-ui-EEzjx`.
- Bij grootschalige refactors (multi-file UI overhaul) altijd eerst
  expliciet bevestigen dat bestaande UX-keuzes (plaatsing
  voortgangsindicator, één-indicator-regel, eigenaarschap-gating,
  iconen in details, locatiehiërarchie) behouden moeten blijven.

## Onboarding-prompt voor nieuwe sessies

Plak de prompt uit `docs/SESSION_PROMPT.md` aan het begin van élke nieuwe
Claude-sessie. Die zorgt dat ik direct de juiste branch oppak en de
invariants ken voordat ik iets aanraak.
