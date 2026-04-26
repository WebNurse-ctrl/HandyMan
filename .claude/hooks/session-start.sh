#!/bin/sh
# SessionStart hook — surfaces UI invariants to Claude's context.
# Triggered on: startup, resume, clear (configured in .claude/settings.json).
#
# This is intentionally read-only: it just prints text. Claude Code captures
# stdout from SessionStart hooks and adds it to the conversation context.

set -eu

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INVARIANTS="$ROOT/docs/UI_INVARIANTS.md"
FRONTEND_GUIDE="$ROOT/frontend/CLAUDE.md"

printf '\n=============================================================\n'
printf '  HandyMan — UI invariants (auto-loaded each session)\n'
printf '=============================================================\n'
printf '  Lees dit voor je iets aanpast onder frontend/. Deze\n'
printf '  beslissingen zijn eerder bewust gemaakt door de eindgebruiker\n'
printf '  en mogen NIET teruggerold worden tijdens een refactor.\n'
printf '=============================================================\n\n'

if [ -f "$INVARIANTS" ]; then
  cat "$INVARIANTS"
else
  printf '(docs/UI_INVARIANTS.md ontbreekt — controleer of het bestand\n'
  printf 'verplaatst of verwijderd is. Vraag de gebruiker hier eerst over\n'
  printf 'voor je grote UI-wijzigingen doet.)\n'
fi

printf '\n\n-------------------------------------------------------------\n'
if [ -f "$FRONTEND_GUIDE" ]; then
  printf 'Zie ook: frontend/CLAUDE.md (frontend-specifieke richtlijnen,\n'
  printf 'design tokens en build-commandos).\n'
else
  printf '(frontend/CLAUDE.md ontbreekt.)\n'
fi
printf -- '-------------------------------------------------------------\n'

exit 0
