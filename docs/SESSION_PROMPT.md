# Onboarding-prompt voor nieuwe Claude-sessies

Plak onderstaande prompt **als allereerste bericht** in elke nieuwe Claude
Code sessie op deze repo. Dat zorgt dat Claude:

1. de juiste deploy-branch oppakt (niet `main`),
2. de UI-invariants leest vóór er ook maar één regel code wordt gewijzigd,
3. de actuele projectstatus uit HANDOVER.md kent,
4. niets terugrolt naar oudere versies.

---

## Prompt om te kopiëren

```
Voor je iets doet in deze sessie, voer eerst deze onboarding uit en
vat kort samen wat je gevonden hebt:

1. Run `git fetch --all` zodat alle remote branches zichtbaar zijn.
2. Checkout en blijf op `claude/modernize-handyman-ui-EEzjx` — dat is
   de Vercel Production deploy-branch. NIET op `main` werken (die loopt
   achter en is geen deploy-bron). Als je per ongeluk op een andere
   branch staat, switchen.
3. Lees in deze volgorde, volledig:
   - `HANDOVER.md` (root) — actuele versie en deploy-info (nu v1.6
     met fase A → B → C → C-2 → D: pickup-flow, scope-RBAC,
     invitation-flow, multi-campus scope, deadline-alarmen)
   - `docs/UI_INVARIANTS.md` — niet-onderhandelbare UI-regels
   - `CLAUDE.md` (root) en `frontend/CLAUDE.md`
4. Bevestig in je eerste antwoord:
   - Op welke branch je staat en welke commit (`git log -1 --oneline`).
   - De versie die in HANDOVER.md vermeld staat.
   - De negen kern-invariants voor de werkaanvraag detailpagina (v1.6):
     1) Werkvooruitgang-kaart staat in de RECHTER zijbalk.
     2) Werkvooruitgang toont exact ÉÉN indicator per state
        (slider voor de eigenaar = TOEGEWEZEN BEHANDELAAR,
        gevulde balk voor read-only kijkers — nooit beide tegelijk).
     3) Details-kaart heeft iconen per veld (`User`, `UserCheck`,
        `Building2/Building/LayoutGrid/DoorOpen/MapPin`, `Tag`,
        `AlarmClock/Calendar/CalendarCheck2`, `Clock/CheckCircle2`)
        + optionele `Pencil` "Planning"-knop in de header.
     4) Volledige locatiehiërarchie (Campus / Gebouw / Afdeling /
        Kamer) zichtbaar in Details met eigen lucide-iconen.
     5) Aanvrager (`User`-icoon) én Toegewezen-aan (`UserCheck`-icoon)
        staan beide in Details. Aanvrager blijft volledig zichtbaar
        als oorspronkelijke indiener; toewijzing wijzigt via
        Oppikken/Loslaten/Anders-toewijzen-knoppen onder de
        slider/balk.
     6) Hoofdkolom bevat enkel: Omschrijving + Feedback (comments).
     7) `<aside>` met de zijbalk gebruikt `space-y-6`.
     8) Pickup-knoppen leven in de Werkvooruitgang-kaart (rolafhankelijk).
     9) Deadline-alarm-banner verschijnt tussen header en grid bij
        `'overdue'` (rood) of `'approaching'` (oranje); niet
        zichtbaar bij AFGEWERKT/GEWEIGERD of zonder deadline.
   - De server-side gating: `requireAuth`/`requireRole` uit
     `lib/auth.ts`, eigenaarschap via `assignedTo`, multi-campus
     scope via `users.scopeCampusIds` (lege array = volledige
     organisatie).
5. Roll niets terug naar:
   - rol-gebaseerde gating (`user.role !== 'MEDEWERKER'`)
   - aanvrager-gating (`requestedBy.id === user.id`) op de slider
   - dubbele indicator (statische balk + slider tegelijk)
   - Details-kaart zonder gebouw/afdeling/kamer of zonder Toegewezen-aan
   - single-campus scope-kolom (was vervangen door M2M in fase C-2)
   - base64-token (was vervangen door HS256 JWT in fase A)
   Als een refactor of redesign per ongeluk een invariant zou breken,
   stop en vraag eerst om bevestiging.
6. MEDEWERKER-restrictie (v1.6 fase C): MEDEWERKERs zien alléén
   werkaanvragen die ze zelf hebben ingediend, en kunnen alleen nieuwe
   aanvragen indienen. Niets anders. Sidebar verbergt Dashboard/Taken/
   Projecten/Aankopen/Beheer; AppLayout redirect harde-poging-tot-
   andere-paden. Server-side guards via `requireAuth`/`requireRole`.
7. Vóór elke commit: `cd frontend && npx tsc --noEmit && npm run build`
   beide groen. Push met
   `git push -u origin claude/modernize-handyman-ui-EEzjx`.

Als je dat alles bevestigd hebt, wacht je op mijn vraag.
```

---

## Achtergrond — waarom deze prompt nodig is

- Op de repo bestaan tien+ feature branches (`claude/...`). Zonder
  `git fetch --all` ziet een verse sessie er maar twee, en mist hij
  belangrijk werk.
- De originele HANDOVER.md (v1.0) wees naar een andere deploy-branch;
  dat klopt niet meer. Vercel deployt vanuit
  `claude/modernize-handyman-ui-EEzjx`.
- In **v1.5** zijn UX-beslissingen vastgelegd (één indicator,
  eigenaarschap-gating, locatiehiërarchie zichtbaar).
- In **v1.6 fase A** is de auth-stack vernieuwd: bcrypt-passwords +
  HS256 JWT vervangen het oude base64-UUID-token. `AUTH_SECRET`
  env-var is vereist.
- In **v1.6 fase B** is eigenaarschap losgekoppeld van aanvragerschap:
  TD/Diensthoofd "pikken aanvragen op". Slider-rechten verschuiven
  van `requestedBy` naar `assignedTo`. Aanvrager blijft zichtbaar.
- In **v1.6 fase C** is gebruikersbeheer afgerond: invitations met
  Resend-mail, password-login naast SSO, scope-RBAC per campus, en
  strikte MEDEWERKER-restrictie.
- In **v1.6 fase C-2** is single-campus scope vervangen door
  multi-campus scope (M2M-tabel `user_campus_scopes`). Lege selectie
  = volledige organisatie. UI gebruikt een portal-popover met
  checkboxes en optimistische updates.
- In **v1.6 fase D** zijn drie planning-velden (`deadline`,
  `start_date`, `end_date`) toegevoegd aan werkaanvragen, met
  alarm-banner + lijst-chip + automatische notificaties (idempotent,
  24 u-throttle) naar de toegewezen behandelaar.

Deze keuzes zijn al meermaals per ongeluk teruggerold tijdens een
refactor — vandaar de expliciete lock-comment in de pagina-source én
in `docs/UI_INVARIANTS.md`.

## Volgende sessie — v1.7 focus

De volgende grote release zal de **taken** (`/tasks`) en **projecten**
(`/projects`) pagina's uitwerken tot het niveau dat werkaanvragen nu
hebben. Zie HANDOVER.md sectie "Roadmap — voorzien voor v1.7+" voor de
detail-checklist (detailpagina's, status-flow, werkregistratie,
budget-tracking, conversie vanuit werkaanvraag, server-side RBAC, …).
