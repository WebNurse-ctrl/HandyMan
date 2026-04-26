# HandyMan frontend — instructies voor Claude

Dit is de Next.js 14 frontend van HandyMan, een facility-management
platform. Voor je iets aanpast: lees `docs/UI_INVARIANTS.md` (in de
repo-root). De eindgebruiker is geen developer — wijzigingen die
bestaande functionaliteit verbreken of UX-keuzes terugrollen zijn
**niet acceptabel**.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript 5
- Tailwind CSS 3.4 met **CSS variables** voor light/dark theme
- shadcn-stijl componenten (custom, geen `shadcn/ui` CLI)
- next-themes (storage key `handyman-theme`)
- lucide-react voor iconen
- recharts voor charts
- @tanstack/react-query · zustand · prisma

## Themasysteem

Gebruik altijd semantic tokens:

| Doel | Class |
|------|-------|
| Achtergrond | `bg-background` |
| Tekst | `text-foreground` |
| Kaart | `bg-card text-card-foreground` |
| Subtiele tekst | `text-muted-foreground` |
| Lijn / border | `border-border` |
| Brand | `bg-primary text-primary-foreground` |
| Accent | `bg-accent` |
| Succes / Waarschuwing / Fout | `bg-success` / `bg-warning` / `bg-destructive` |

Vermijd `bg-gray-xxx`, `text-blue-xxx`, etc. in nieuwe code — die werken
niet in dark mode en zorgen voor kleurmismatches.

## Locked layouts

Sommige pagina's hebben een vaste layout die de gebruiker eerder bewust
heeft gekozen. Die zijn aangegeven met een `LOCKED LAYOUT` comment
bovenaan het bestand. Verplaats die blokken niet zonder expliciete
nieuwe vraag.

Op dit moment gelockt:

- `src/app/work-requests/[id]/page.tsx` — voortgangsindicator hoort in
  de rechterzijbalk, details-kaart heeft iconen per veld. Zie
  `docs/UI_INVARIANTS.md` §1.

## Testen vóór je commit

Run altijd vanuit de `frontend/` map:

```bash
npx tsc --noEmit   # TypeScript check
npm run build      # Next.js build (incl. prisma generate)
```

Als beide groen zijn mag je committen.

## Branch

Werk standaard op `claude/modernize-handyman-ui-EEzjx` tenzij anders
gevraagd.
