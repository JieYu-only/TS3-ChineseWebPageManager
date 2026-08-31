# Frontend Communication Decoupling

Status: in progress (foundation + first core-path migrations accepted conditionally).
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

Legend: ✔ done, ◻ pending. Raw `$TeamSpeak.execute` calls remain in **6 component
files** (9 calls); **12 src files** still use some `$TeamSpeak` method (of which
the component files are 11, the remaining one being `App.vue`).

### Already decoupled
- Session: `Login.vue` (login), `Logout.vue` (logout+event clear), `main.js`
  (restore), virtual-server switch (`sessionService.selectServer`).
- Realtime events: `ServerViewer.vue`, `TextMessages.vue` now use
  `eventService.onClient*`/`onChannel*` domain helpers.
- Server domain: `Servers.vue`, `ServerCreate.vue`, `ServerSnapshot.vue` use
  `serverService.*` (list/create/start/stop/remove/select/whoAmI).
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

### Per-domain remaining migration
| Domain service | Components to migrate |
|---|---|
| serverService | ServerEdit, ServerLogs (list/create/start/stop/select done) |
| channelService | (ChannelAdd/Edit/SpacerAdd/ServerViewerChannel/ChannelForm done); TextMessages (chat) |
| clientService | (Clients, ClientEdit, ClientBan, ServerViewerClient done); TextMessages (chat + move) |
| complaintService | Complaints |
| apikeyService | ApiKeys, ApiKeyAdd |
| consoleService | Console |
| snapshotService | (ServerSnapshot select done via serverService; create/restore remain) |

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
  first-row unwrap, remove/edit/moveToChannel/kick/poke/ban argument mapping,
  permission-denied propagation.
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
  progress, `FILE_TOO_LARGE` mapping, and in-flight cancel -> `REQUEST_CANCELLED`.
- `test/tokenService.test.js` — tokenlist delegation, server-group vs
  channel-group token creation (`tokenid2`=0 vs channel id), description,
  invalid token type / missing groupId `INVALID_ARGUMENT`, remove mapping, and
  `PERMISSION_DENIED` propagation.
- `test/banService.test.js` — banlist delegation, banadd ip/name/uid/reason/time
  mapping, missing-target and missing-banId `INVALID_ARGUMENT`, update
  (create-then-remove) order, createFromClient delegation, and
  `RESOURCE_NOT_FOUND` propagation.

vitest was added as a UI devDependency because the transport/protocol modules are
ESM, which the server's CommonJS `node --test` runner cannot import directly.
The existing webpack build is unaffected.
