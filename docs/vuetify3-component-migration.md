# Vuetify 2 → 3 component migration guide (Milestone 4)

Read this before editing a component. Apply the rules below, in order, to each
`.vue` file under `packages/ui/src/components/`. Do **not** change TeamSpeak
behaviour, services, api, transport, or business logic. Keep the same routes,
v-model-ish bindings and user-visible operations.

## Group 1 — grid (ALREADY DONE)
`v-layout`→`v-row`, `v-flex`→`v-col` were already migrated by a script. Do not
touch grid again.

## Group 2 — v-data-table
- Header objects: rename `text:` → `title:` and `value:` → `key:`. Keep other
  keys (`align`, `sortable`, `width`, ...) as-is.
- Replace `:footer-props="{ 'items-per-page-options': rowsPerPage }"` with
  `:items-per-page-options="rowsPerPage"` on the `v-data-table` element.
- `rowsPerPage` data arrays: change a plain number array like
  `[25, 50, 75, -1]` into objects `[{ value: 25, title: '25' }, { value: 50,
  title: '50' }, { value: 75, title: '75' }, { value: -1, title: 'All' }]`.
- Item row slots `#item.{key}` are kept (Vuetify 3 supports them). Item slots
  receive `{ item, index, ... }` — keep the existing `{ item }` destructuring.
- Keep `:headers`, `:items`, `:search`, `:loading`, `v-model` (selected rows),
  `item-key`, `show-select`, `:no-data-text`, `:sort-by`, `:sort-desc`,
  `:item-class` props. Do not rewrite column logic.
- Inside `#item.xxx` templates, apply Group 6 menu/activator fixes.

## Group 3 — v-autocomplete / v-select / v-text-field / v-checkbox
- `item-text="X"` → `item-title="X"`. Keep `item-value`.
- `outlined` → `variant="outlined"`.
- `dense` → `density="compact"`.
- `hide-details="auto"` → `hide-details`.
- Keep `:items`, `v-model`, `:return-object`, `:disabled`, `:loading`,
  `:rules`, `:label`, `:placeholder`, `:append-icon`, `:prepend-inner-icon`,
  `clearable`, `multiple`, `@click:append`, `@change`.
- For `v-autocomplete` that used `:item-value` with an object/`return-object`,
  keep `:return-object` and bind `item-title` to the display field.
- `v-text-field` `type="number"` etc. unchanged.

## Group 4 — v-list-item-group (REMOVED in Vuetify 3)
- `v-list-item-group v-model="sel" multiple` → `<v-list v-model="sel" multiple
  activatable>` (or `<v-list v-model="sel">` for single). Keep the same `sel`
  v-model, which becomes the list's `v-model`.
- Inside, use `v-list-item :value="item"` (or value-bearing) for each item; keep
  the checkbox/behaviour.
- Any `v-list-item-group :value="x"` → `v-list v-model="x"` with
  `v-list-item :value="..."`.

## Group 5 — two-way bindings
- `:prop.sync="x"` → `v-model:prop="x"`.
- `:input-value="x"` → `:model-value="x"` (v-checkbox, v-switch).
- A child component that emitted `input`/`value` (Vue 2) should use
  `modelValue` prop + `update:modelValue` emit. Components already migrated use
  `v-model` (which maps to `modelValue`). Inspect any custom component
  (`FileDeleteDialog`, `FileRenameDialog`, `KeyTextField`, ...) — if it declares
  `props: ['value']` and emits `input`, add `modelValue`/`update:modelValue`
  aliasing.

## Group 6 — Vuetify 2 props / activator slots / dialogs
- `v-btn text` → `v-btn variant="text"`; `v-btn outlined` →
  `variant="outlined"`; `v-btn fab` → `v-btn icon` (or `size="small"`;
  `dark`/`color`/`:to`/`@click` kept).
- `v-btn small`/`large` → `size="small"`/`size="large"`.
- `v-icon left` → `start`, `right` → `end`; `small`/`x-small` → `size="small"`/
  `size="x-small"`; `large` → `size="large"`. Keep `color`/`class`.
- `v-chip small`/`x-small` → `size="small"`/`size="x-small"`; keep
  `color`/`text-color`.
- `v-card outlined` → `variant="outlined"`.
- `v-menu offset-y` → `v-menu :offset="true"` (keep `max-width`,
  `:close-on-content-click`, `@click`).
- Activator slot: `#activator="{ on, attrs }"` → `#activator="{ props }"`;
  inside, replace `v-bind="attrs" v-on="on"` with `v-bind="props"`. For a bare
  `#activator="{ on }"` → `#activator="{ props }"` + `v-bind="props"`.
- `v-tooltip bottom`/`left` → `location="bottom"`/`location="left"`; activator
  `{ on, attrs }` → `{ props }` + `v-bind="props"`.
- `v-snackbar` `app`/`multi-line`/`top` → drop, use `location="top"`; the
  `#action="{ attrs }"` slot → `#action="{ props }"` + `v-bind="props"`.
- `v-checkbox`/`v-switch` `inset`/`hide-details` kept; `dense` →
  `density="compact"`.
- `v-dialog`, `v-card`, `v-card-actions`, `v-spacer`, `v-card-title`,
  `v-card-text` unchanged. Keep `max-width`, `v-model`.
- `v-progress-circular` unchanged.

## Group 7 — theme / icons / visual
- Theme is already on Vuetify 3 (`useTheme()`, `settings.darkMode`). Do not
  reintroduce `$vuetify.theme.dark` (use `$store.state.settings.darkMode`).
- MDI icon names unchanged.

## Rules
- Do not remove functionality or hide entry points.
- Do not swallow business errors; keep `notify.error(...)`.
- Keep event-chain `@filerename`/`@filedelete`/`@subfoldercreate`/... intact.
- Preserve exact Chinese labels and route names.
- After editing, the file must still parse (no dangling tags).
