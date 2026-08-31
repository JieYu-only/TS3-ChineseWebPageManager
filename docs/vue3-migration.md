# Vue 3 / Vite Migration Plan (Stage 3)

Status: Stage 3 foundation **implemented and verified**. The app now builds with
Vite (production), boots under Vue 3, uses vue-router 4 with a working login guard,
restores the session/connection state through a Pinia store, loads the Vuetify 3
theme + MDI icons, and generates a new PWA (vite-plugin-pwa) service worker. The
full per-component Vuetify 2 → 3 API migration (grid/datalist/autocomplete/
treeview/list-item-group/.sync + Vuetify 2 prop renames) is the sequenced
high-risk Milestone-4 work and is tracked in §5/§8.

Working branch: `codex/vue3-migration` (created off the stage-2 baseline
`58914fa`). No commit is made on this branch until the migration is accepted.

## 1. Baseline (upgrade preconditions)

- Environment: Windows, Node `v24.19.0`, npm `11.17.0`.
- Current test baseline (stage-2 acceptance): UI unit **177** (vitest, 18 files),
  server **87** (`node --test`), Playwright **18**.
- Communication decoupling already in place: components / Vuex → domain services
  (`packages/ui/src/services/*`) → protocol client (`packages/ui/src/api/TeamSpeak`)
  → transport (`packages/ui/src/transport/*`, `socket.js`). `npm run check:decoupling`
  passed and must continue to pass.
- Current branch/type: `master` at `ece4e39`; migration moved to a branch so `master`
  is not modified.

## 2. Dependency matrix (current → target)

| Package | Current | Target | Reason / compatibility note |
|---|---|---|---|
| `vue` | 2.7.16 | **3.4.x** | Vue 3 (composition + options API). Remove `vue-template-compiler`. |
| `vue-router` | 3.6.5 | **4.x** | `createRouter` / `createWebHistory`; history config in `vite.config`. |
| `vuetify` | 2.7.2 | **3.x** | Vuetify 3 (precompiled, SASS vars, `createVuetify`). |
| `vuex` | 3.1.1 | **Pinia (preferred)** or Vuex 4 | State infra rewrite; see decision in §4. |
| `@vue/cli-service` (webpack) | 5.0.9 | **Vite** | Replace the whole CLI job chain; new `vite.config.js`. |
| `@vue/cli-plugin-*` / `vue-cli-plugin-vuetify` / `vuetify-loader` | current | remove | Replaced by `create-vite` + `@vitejs/plugin-vue` + `unplugin-vue-components` (optional). |
| `vue-template-compiler` | 2.7.16 | remove | Vue 3 uses `@vue/compiler-sfc` via the Vite plugin. |
| `sass`/`sass-loader` | current | keep `sass`, drop `sass-loader` | Vite uses `sass` directly for `<style lang="scss">`. |
| `@mdi/font` | 4.5.95 | keep (or 7.x) | Icon font for Vuetify 3 icons. |
| `eslint` / `eslint-plugin-vue` | 8 / 9 | `eslint-plugin-vue` 10.x (Vue 3 rules) | Update config/compat. |
| `vitest` | 3.1.0 | keep | Already ESM; used for UI unit tests. |
| `xterm` / `xterm-addon-fit` / `local-echo` / `socket.io-client` / `axios` / `localforage` / `file-saver` / `nprogress` | current | keep | Framework-agnostic. |

All domain services, protocol client and transport files are framework-agnostic
(they do not use the Vue runtime); keep them and their unit tests unchanged.

## 3. Vite base project approach

- `vite.config.js` with:
  - `@vitejs/plugin-vue` (and `vue()` from the plugin).
  - alias `@` → `packages/ui/src`.
  - Vuetify 3 Vite plugin (`vite-plugin-vuetify`) for component/SASS setup.
  - `server.host` mirroring the current `vue-cli-service serve` host; dev server proxy
    for `/api` and the socket if currently proxied.
  - `build.outDir`/`base` preserving the current deployment path semantics
    (currently dist served at root).
  - env: keep `VUE_APP_*` mapping or adopt `import.meta.env.VITE_*`; document the
    rename so `.env` values keep working.
- Entry `main.js` → `createApp(App).use(router).use(vuetify).use(pinia).mount("#app")`;
  replace `Vue.use(...)`, `new Vue`, `Vue.prototype`, filters, and any Vue 2
  lifecycle/`$store` accesses incrementally.
- PWA: replace `@vue/cli-plugin-pwa` with `vite-plugin-pwa` (or a `registerSW`
  setup). Plan old-SW migration: unregister the legacy service worker and clear its
  caches on first load of the new build, then register the new SW with a cache-key
  version bump; document the update prompt and cache-invalidation strategy.

## 4. State management decision — Pinia vs Vuex 4

Decision: **Pinia** (default recommendation).

Rationale:
- Pinia is the Vue 3 first-class store; official migration path from Vuex with
  composables and TS support; simpler API (no `mutations`/`getters` distinction) and
  better tree-shaking / HMR.
- Vuex 4 is the minimal Vue 3 port and keeps the existing module shape, but is
  maintenance-mode and the current modules (session, query, chat, uploads, avatars,
  settings) use Vuex-only idioms that need reshaping either way.
- Migration cost: the current modules are small (session, query, chat, uploads,
  avatars, settings are each tens of lines), so rewriting to Pinia stores is lower
  cost than it looks; components' `this.$store.state.X`/`this.$store.commit` /
  `this.$store.dispatch` get replaced by `useXStore()`.
- Rollback impact: store is internally used by components and the
  `sessionService`/`messageService` (via `$store` or `store`). Pinia stores replace
  these references; rollback = keep the Vuex modules on the migration branch and
  re-wire (documented). No server protocol change.

## 5. High-risk component migration groups (sequenced follow-up, Milestone 4)

1. `v-data-table`.
2. `v-autocomplete`.
3. `v-treeview`.
4. `v-list-item-group`.
5. `input-value`/`.sync` and old `v-model` bindings.
6. Vuetify theme, icon set and global config.
7. Dialog, form validation, slots and pagination behavior.

Each group: verify Vuetify 3 API diff, keep business behavior and communication
params unchanged, update tests, run lint + unit + build + relevant E2E, and record
any visual/interaction difference automation cannot cover.

Note: Vuetify 2 grid uses `v-layout`/`v-flex`, which are removed in Vuetify 3
(`v-row`/`v-col`), so the grid must be migrated across every component that uses it
— part of the high-risk grouping above.

## 6. Communication-layer stability

The domain services / protocol client / transport are Vue-agnostic. Reuse them as-is.
Vue 3 must use the services through a Vue-agnostic container or module imports; do
NOT re-introduce `$TeamSpeak`/`$socket` globals. `npm run check:decoupling` must keep
passing after the migration.

## 7. Build / verify status (honest)

The foundations are now **verified working** on the `codex/vue3-migration`
branch:

- `npm run check:decoupling` passes (business layer free of $TeamSpeak /
  TeamSpeak import+API / $socket / socket.js / direct execute).
- UI unit tests: **177/177** (`vitest run`), server tests: **88/88**.
- **Vuetify 3** theme toggling works (uses `useTheme()`), the real-time
  channel/client tree nodes and the file-tree file/folder nodes render their
  Vuetify 3 action menus (treeview `#title` slot), and the spurious
  "操作失败…" update-check error is eliminated.
- `npm run lint` (eslint) passes.
- `npm run build` (Vite production build) succeeds and emits
  `dist/sw.js`, `dist/workbox-*.js` and `dist/manifest.webmanifest`.
- Core Playwright E2E: **21/21** pass against `packages/ui/dist` served by the
  mock backend (18 original + 3 minimal-slice interaction/no-error/theme tests).

What remains (deliberately split to Milestone 4): the full Vuetify 2 → 3
component API migration. The app boots and all current E2E assertions render,
but many components still carry Vuetify 2-only markup (`v-layout`/`v-flex`
grid, `v-data-table` headers as `text`/`value`, `v-autocomplete`,
`v-list-item-group`, `.sync`, `outlined`/`dense`/`text`/`fab` etc.). Those
components need the §5 API diff applied, then lint + unit + build + relevant E2E
re-run, and any visual/interaction diff recorded. Full regression (login/exit,
file transfer, permissions, EXE build, real TeamSpeak query, `npm audit`) is
Milestone 4/5.

## 8. Delivered this round (Stage 3 foundation)

- Toolchain: Vite (`vite.config.js`), `@vitejs/plugin-vue`, `vitest` (kept),
  `vite-plugin-pwa`, removed `@vue/cli-*` / `vue-cli-plugin-vuetify` /
  `vuetify-loader` / `vue-template-compiler` / webpack configs.
- Entry: `src/main.js` uses `createApp` + Pinia + Vuetify 3 + vue-router 4,
  restores the server-side session *before* installing the router (so the
  initial guard sees the correct connection state).
- Router: vue-router 4 (`createWebHistory`, `/:pathMatch(.*)*` catch-all,
  `router.currentRoute.value`), guards preserved.
- State: real Pinia option stores for settings/query/chat/avatars/uploads/
  notifications, exposed through a Vuex-compatible façade (`state/commit/
  dispatch/getters/watch/subscribe/replaceState`) so the framework-agnostic
  services (`socket.js`, `notify.js`, `api/TeamSpeak.js`) and the existing
  components keep working without a wholesale rewrite. Persistence (SecureLS +
  whitelisted settings/chat) is preserved.
- Vuetify 3: `createVuetify` with all components/directives, `zhHans` locale,
  MDI icons, light/dark themes.
- PWA: `vite-plugin-pwa` (autoUpdate, `ts3-manager-v3` cache prefix,
  `cleanupOutdatedCaches`, `navigateFallback` + `/api`/`/socket.io` denylist);
  legacy `service-worker.js` registration and stale caches are unregistered by
  `migrateLegacyServiceWorker()` on boot.
- Fixed Vue 3 porting issues discovered at runtime: component-level lazy
  `() => import(...)` wrapped in `defineAsyncComponent` (bare functions are
  functional components in Vue 3), `router.currentRoute.value`, the `*` router
  catch-all, and `::v-deep`→`:deep(...)` deprecation (warnings only).
