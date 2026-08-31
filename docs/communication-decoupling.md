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
- Raw TeamSpeak command/event strings exist only in the protocol layer.
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

Legend: ✔ done, ◻ pending. Raw `$TeamSpeak.execute` calls remain in **25 component
files** (50 calls); **33 src files** still use some `$TeamSpeak` method.

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
  (listOnline/listDatabase/info/dbInfo/remove/edit/moveToChannel/kick/poke/ban
  plus a client's server-group memberships: defaultServerGroupId/listServerGroups/
  addToServerGroup/removeFromServerGroup).

### Per-domain remaining migration
| Domain service | Components to migrate |
|---|---|
| serverService | ServerEdit, ServerLogs (list/create/start/stop/select done) |
| channelService | (ChannelAdd/Edit/SpacerAdd/ServerViewerChannel/ChannelForm done); TextMessages (chat) |
| clientService | (Clients, ClientEdit, ClientBan, ServerViewerClient done); TextMessages (chat + move) |
| permissionService | PermissionTable, ClientPermissions, ChannelPermissions, ChannelClientPermissions, ChannelGroupPermissions, ServerGroupPermissions |
| groupService | ServerGroups, ServerGroupEdit, ChannelGroups, ChannelGroupEdit |
| tokenService | Tokens, TokenAdd |
| banService | Bans, BanAdd, BanEdit, ClientBan |
| complaintService | Complaints |
| fileService | FileBrowserFolder, FileDeleteButton, FileDeleteDialog, FileRenameDialog, (FileBrowser, FileUploadIcon, FileUpload) |
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
  permission-denied propagation, and the server-group membership helpers
  (defaultServerGroupId/listServerGroups/addToServerGroup/removeFromServerGroup).

vitest was added as a UI devDependency because the transport/protocol modules are
ESM, which the server's CommonJS `node --test` runner cannot import directly.
The existing webpack build is unaffected.
