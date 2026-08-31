# Stage 3 independent acceptance

## Decision

**ACCEPTED — 2026-09-01.** The Vue 3 migration is accepted at the current
`codex/vue3-migration` working-tree baseline. This is a logical acceptance boundary rather
than a Git commit boundary; no commit, merge, push or release was created.

## Reviewed scope

- Vue 3, Vite, Vuetify 3, vue-router 4 and Pinia application bootstrap.
- Migrated high-risk tables, autocomplete/select controls, trees, list selection,
  expansion panels, theme/icon wiring and PWA build.
- Communication boundary preservation and removal of Vue 2/Vuetify 2 production dependencies.

## Independent evidence

- Node `v22.23.2` / npm `10.9.8` clean `npm ci` in an isolated copy of the candidate.
- Communication-decoupling gate and UI lint passed.
- UI unit tests `177/177`, persistence tests `4/4`, server tests `88/88`.
- Production UI/PWA and Windows x64 EXE builds passed.
- Playwright serial gate `30/30`, exit 0; port 4173 had no listener afterward.
- Desktop 1280×720 and mobile 390×844 checks covered servers, live view, files,
  permissions, messages, bans and server settings. No document-level horizontal overflow
  remained; narrow data tables use an internal horizontal scroller.
- Vue 3 theme/data-table selectors and the duplicated login version prefix found during the
  visual review were corrected and reverified.

## Boundary note

Stage 4 real-TeamSpeak, authenticated Socket.IO, live-host Service Worker/offline-update and
release operations are not part of this Stage 3 acceptance. They remain tracked separately
and cannot be inferred from this decision.
