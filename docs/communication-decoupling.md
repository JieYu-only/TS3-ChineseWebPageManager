# Frontend Communication Decoupling

Status: completed (all domain services migrated, final cleanup and static gate in place).
Goal: isolate Vue components from TeamSpeak, HTTP and Socket.IO so a Vue 3 / Vite /
Vuetify 3 migration only needs to adjust service injection, not page behaviour.

## Architecture (target)

```
components / Vuex modules   (page state + view only)
        ↓  call
domain services             packages/ui/src/services/*   (serverService, channelService, ...)
        ↓  call
protocol clients            packages/ui/src/api/*        (teamspeakClient, fileTransferClient, sessionClient, TeamSpeak)
        ↓  use             (raw command/event names live ONLY here)
transport                   packages/ui/src/transport/*  (socketRequest, httpClient, socketClient, transportError)
```

Rules:
- Components never call `$TeamSpeak.execute("command", ...)` or touch the socket.
- Raw TeamSpeak command/event strings exist only in the protocol layer **and in
  the domain-service adapter layer** (`serverService`, `channelService`,
  `clientService`, ... current transitional services still name
  `execute("command")` directly). The long-term target is that these services
  delegate to dedicated protocol clients so the adapter layer only passes
  business-shaped arguments; until then the rule is enforced at the component
  boundary (no service call leaks a command string upward).
- Domain services expose business methods (`clientService.moveToChannel(...)`), not commands.
- Realtime subscriptions go through `eventService` domain helpers
  (`eventService.onClientConnected(handler)`), never raw event names or
  `TeamSpeak.on/off` directly.

## Unified error structure (in use)

```js
{
  name: "ServiceError",
  code,          // ERROR_CODES.* e.g. PERMISSION_DENIED
  message,       // default user-facing message
  operation,     // e.g. "teamspeak.execute" / "client.moveToChannel"
  retryable,     // boolean
  cause,         // original error (diagnostics only)
  details,       // context; never credentials/tokens
}
```

The protocol layer (`TeamSpeak.js`) already throws `ServiceError`: TeamSpeak
error messages are mapped to stable codes via `fromTeamSpeakError`
(`PERMISSION_DENIED`, `RESOURCE_NOT_FOUND`, `INVALID_ARGUMENT`,
`RESOURCE_CONFLICT`, `AUTH_REQUIRED`, `SESSION_EXPIRED`, `SERVER_UNAVAILABLE`,
`FILE_TOO_LARGE`, `TRANSFER_FAILED`, ...) and a lost connection raises
`SESSION_EXPIRED`. Components may branch on `err.code`; today most still let
`notify.error` translate the `message`.

Codes: AUTH_REQUIRED, SESSION_EXPIRED, PERMISSION_DENIED, NOT_CONNECTED,
CONNECTION_LOST, REQUEST_TIMEOUT, REQUEST_CANCELLED, INVALID_ARGUMENT,
RESOURCE_NOT_FOUND, RESOURCE_CONFLICT, FILE_TOO_LARGE, TRANSFER_FAILED,
SERVER_UNAVAILABLE, PROTOCOL_ERROR, UNKNOWN_ERROR.

## Migration checklist

Legend: ✔ done, ◻ pending. Raw `$TeamSpeak.execute` calls remain in **0 component
files** (0 calls); **0 src files** still use some `$TeamSpeak` method. The static
gate `npm run check:decoupling` enforces this (scans components for `$TeamSpeak`,
a direct `TeamSpeak` import/API call, `$socket`, `socket.js` and any `.execute`
other than the `consoleService` exception).

### Already decoupled
- Session: `Login.vue` (login), `Logout.vue` (logout+event clear), `main.js`
  (restore), virtual-server switch (`sessionService.selectServer`).
- Realtime events: `ServerViewer.vue`, `TextMessages.vue` now use
  `eventService.onClient*`/`onChannel*` domain helpers.
- Server domain: `Servers.vue`, `ServerCreate.vue`, `ServerSnapshot.vue`,
  `ServerEdit.vue`, `ServerViewer.vue` and `BellIcon.vue` use `serverService.*`
  (list/create/start/stop/remove/select/whoAmI/info/version/changeName).
- Channel domain: `ChannelAdd.vue`, `ChannelEdit.vue`, `ChannelSpacerAdd.vue`,
  `ServerViewerChannel.vue` and `ChannelForm.vue` use
  `channelService.*` (list/create/edit/remove/moveClient/info/serverInfo).
- Client domain: `ServerViewerClient.vue`, `Clients.vue`, `ClientEdit.vue` and
  `ClientBan.vue` use `clientService.*`
  (listOnline/listDatabase/info/dbInfo/remove/edit/moveToChannel/kick/poke;
  a client's server-group memberships live in `groupService`, and banning a
  client lives in `banService.createFromClient`).
- Permission domain: `PermissionTable.vue`, `ClientPermissions.vue`,
  `ChannelPermissions.vue`, `ChannelClientPermissions.vue`,
  `ChannelGroupPermissions.vue` and `ServerGroupPermissions.vue` use
  `permissionService.*` (listDefinitions/list*Permissions/add*Permission/
  remove*Permission). `PermissionTable` emits business-named payloads
  (`permissionId`/`value`/`skip`/`negated`).
- Group domain: `ServerGroups.vue`, `ServerGroupEdit.vue`, `ChannelGroups.vue`
  and `ChannelGroupEdit.vue` use `groupService.*`
  (list/create/rename/copy/remove for server+channel groups, plus client
  memberships `listServerGroupClients`/`listChannelGroupClients`/
  `addClientToServerGroup`/`removeClientFromServerGroup`/
  `assignClientChannelGroup` and the default-group helpers).
- File domain: `FileBrowser.vue`, `FileBrowserFolder.vue`,
  `FileRenameDialog.vue`, `FileDeleteDialog.vue`, `FileDeleteButton.vue`,
  `FileUploadIcon.vue` and `FileUpload.vue` use `fileService.*`
  (list/getInfo/createDirectory/rename/remove plus the HTTP transfer primitives
  initUpload/initDownload/upload/download/cancel that keep progress,
  cancellation, timeout, concurrency-slot and resource release).
- Token domain: `Tokens.vue` and `TokenAdd.vue` use `tokenService.*`
  (list/create/remove).
- Ban domain: `Bans.vue`, `BanAdd.vue`, `BanEdit.vue` and `ClientBan.vue` use
  `banService.*` (list/create/update/remove/createFromClient).
- Complaint domain: `Complaints.vue` uses `complaintService.*`
  (list/remove/removeAllForClient).
- API-key domain: `ApiKeys.vue` and `ApiKeyAdd.vue` use `apikeyService.*`
  (list/create/remove).
- Snapshot domain: `ServerSnapshot.vue` uses `snapshotService.*`
  (create/restore; restore re-selects the server via `serverService.select`).
- Log domain: `ServerLogs.vue` uses `logService.list` (instance/reverse/lines/
  beginPosition mapping and validation).
- Console domain (allowed exception): `Console.vue` uses
  `consoleService.execute(command, parameters, options)`. This is the only
  domain that lets a user type raw TeamSpeak commands, but the component still
  never calls `$TeamSpeak.execute` directly; the service validates the command
  string, rejects empty commands and invalid parameter/option structures, and
  does not log sensitive values.
- Message domain: `TextMessages.vue` uses `messageService.*`
  (sendToClient/sendToChannel/sendToServer/moveCurrentClient, plus
  listClients/listChannels/getCurrentClient/getServerInfo which delegate to the
  client/channel/server services). Realtime subscriptions stay in
  `eventService`.

### Migration state
All component domains are migrated to domain services, and the Vuex
`avatars` module now delegates to `clientService.dbInfo`/`fileService.getInfo`/
`fileService.downloadFileData` instead of importing `@/api/TeamSpeak` directly.
No component, `App.vue`, `main.js` or Vuex module uses `$TeamSpeak`, `$socket`,
`socket.js` or a direct `TeamSpeak` API call; the only allowed raw-command path is
the console exception (`consoleService.execute` in `Console.vue`).

The `npm run check:decoupling` gate scans the whole business layer
(`packages/ui/src` excluding the `services`/`api`/`transport` layers and
`socket.js`), flags `$TeamSpeak`, a direct `TeamSpeak` import/API call (including
alias imports by path), `$socket`, a `socket.js` import and any `.execute(` other
than the `consoleService` exception, and returns non-zero on a violation. It also
catches `Vue.prototype.$TeamSpeak`/`$socket` regression via the `$TeamSpeak`/
`$socket` patterns, so the removed global injection is guarded.

`Vue.prototype.$TeamSpeak` was removed from `main.js` (no remaining consumer);
the `TeamSpeak` singleton is imported only by the domain services, the protocol
layer and the transport layer.

## Current unit-test baseline (vitest, `npm run test:unit --workspace=@ts3-manager/ui`)

- `test/transportError.test.js` — ServiceError fields, TeamSpeak message/1281
  -> stable-code mapping.
- `test/socketRequest.test.js` — ACK success, no-payload, NOT_CONNECTED,
  REQUEST_TIMEOUT, **mid-flight CONNECTION_LOST**, REQUEST_CANCELLED
  (pre-abort + mid-flight), late-ACK no-op (via a FakeSocket).
- `test/eventService.test.js` — subscribe, duplicate add, unsubscribe,
  per-event split, `clear()`, `unsubscribe(handle)` (TeamSpeak mocked).
- `test/persist.test.cjs` — persisted-state payload validation (node:test).
- `test/clientService.test.js` — listOnline/listDatabase delegation, info/dbInfo
  first-row unwrap, remove/edit/moveToChannel/kick/poke argument mapping,
  permission-denied propagation.
- `test/serverService.test.js` — getServerList/whoAmI delegation, `info()` and
  `version()` unwrapping, create/start/stop/remove/select/changeName mapping,
  invalid `serverId` `INVALID_ARGUMENT` (nothing sent), and `PERMISSION_DENIED`
  propagation.
- `test/channelService.test.js` also covers **invalid-argument** handling: a
  missing `channelId` in `info`/`edit`/`remove`/`moveClient` rejects with
  `INVALID_ARGUMENT` before any command is sent.
- `test/permissionService.test.js` — listDefinitions delegation, all
  list/add/remove mapping for client/channel/channel-client/channel-group/
  server-group permissions, boolean skip/negated flag coercion, missing-ID and
  missing-permissionId `INVALID_ARGUMENT`, `PERMISSION_DENIED`/
  `SESSION_EXPIRED` propagation, empty permission lists.
- `test/groupService.test.js` — server/channel group list & CRUD mapping,
  default-group helpers, server/channel client memberships, name/ID
  `INVALID_ARGUMENT`, `PERMISSION_DENIED` and `RESOURCE_CONFLICT` (copy target)
  propagation.
- `test/fileService.test.js` — `ftgetfilelist`/`ftcreatedir`/`ftrenamefile`/
  `ftdeletefile`/`ftgetfileinfo` mapping and first-row unwrap, `INVALID_ARGUMENT`
  for missing paths, initUpload/initDownload delegation, upload streaming with
  progress, `FILE_TOO_LARGE` mapping, in-flight cancel -> `REQUEST_CANCELLED`, and
  `downloadFileData` delegation to the socket download.
- `test/avatars.test.js` — the Vuex `avatars` module delegates avatar
  `ftgetfileinfo`/`clientdbinfo`/download to `fileService.getInfo`/
  `clientService.dbInfo`/`fileService.downloadFileData` and never imports or
  calls `TeamSpeak`; also covers the serveradmin skip and save/remove flow.
- `test/tokenService.test.js` — tokenlist delegation, server-group vs
  channel-group token creation (`tokenid2`=0 vs channel id), description,
  invalid token type / missing groupId `INVALID_ARGUMENT`, remove mapping, and
  `PERMISSION_DENIED` propagation.
- `test/banService.test.js` — banlist delegation, banadd ip/name/uid/reason/time
  mapping, missing-target and missing-banId `INVALID_ARGUMENT`, update
  (create-then-remove) order, createFromClient delegation, and
  `RESOURCE_NOT_FOUND` propagation.
- `test/complaintService.test.js` — complainlist delegation, remove
  target/client id mapping, missing-target `INVALID_ARGUMENT`, and
  removeAllForClient filtering + batch removal.
- `test/apikeyService.test.js` — apikeylist default/`clientDbId`, create
  scope/`clientDbId`/lifetime mapping + key unwrap, omitted optional fields,
  missing scope / missing id `INVALID_ARGUMENT`, and `RESOURCE_CONFLICT`
  propagation.
- `test/snapshotService.test.js` — createSnapshot delegation, restore
  delegation, empty/missing content `INVALID_ARGUMENT` (nothing sent), and
  `PERMISSION_DENIED` propagation.
- `test/logService.test.js` — logview instance/reverse/lines/beginPosition
  mapping, beginPos omission, non-positive lines `INVALID_ARGUMENT`, and
  `PERMISSION_DENIED` propagation.
- `test/consoleService.test.js` — execute delegation with defaults, empty/non
  string command `INVALID_ARGUMENT`, invalid parameters/options structure, and
  `SESSION_EXPIRED` propagation.
- `test/messageService.test.js` — listClients/listChannels/getCurrentClient/
  getServerInfo delegation, moveCurrentClient delegation, sendToClient/
  sendToChannel/sendToServer targetmode mapping, empty message
  `INVALID_ARGUMENT`, and `PERMISSION_DENIED` propagation.

vitest was added as a UI devDependency because the transport/protocol modules are
ESM, which the server's CommonJS `node --test` runner cannot import directly.
The existing webpack build is unaffected.
