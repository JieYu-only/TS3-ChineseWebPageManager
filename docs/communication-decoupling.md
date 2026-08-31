# Frontend Communication Decoupling

Status: in progress. Goal: isolate Vue components from TeamSpeak, HTTP and
Socket.IO so a Vue 3 / Vite / Vuetify 3 migration only needs to adjust service
injection, not page behaviour.

## Architecture (target)

```
components / Vuex modules   (page state + view only)
        ↓  call
domain services             packages/ui/src/services/*   (serverService, channelService, ...)
        ↓  call
protocol clients            packages/ui/src/api/*        (teamspeakClient, teamspeakCommands, fileTransferClient, sessionClient)
        ↓  use             (raw command/event names live ONLY here)
transport                   packages/ui/src/transport/*  (socketRequest, httpClient, socketClient, transportError)
        ↓  use
Socket.IO / axios
```

Rules:
- Components never call `$TeamSpeak.execute("command", ...)` or touch the socket.
- Raw TeamSpeak command/event strings exist only in the protocol layer.
- Errors surface as `ServiceError` (see `transportError.js`) with stable codes.
- Realtime subscriptions go through `eventService.subscribe` (idempotent,
  disposable handle) — never `TeamSpeak.on/off` directly.

## Unified error structure

```js
{
  name: "ServiceError",
  code,          // ERROR_CODES.* e.g. PERMISSION_DENIED
  message,       // default user-facing message
  operation,     // e.g. "client.moveToChannel"
  retryable,     // boolean
  cause,         // original error (diagnostics only)
  details,       // context; never credentials/tokens
}
```

Codes: AUTH_REQUIRED, SESSION_EXPIRED, PERMISSION_DENIED, NOT_CONNECTED,
CONNECTION_LOST, REQUEST_TIMEOUT, REQUEST_CANCELLED, INVALID_ARGUMENT,
RESOURCE_NOT_FOUND, RESOURCE_CONFLICT, FILE_TOO_LARGE, TRANSFER_FAILED,
SERVER_UNAVAILABLE, PROTOCOL_ERROR, UNKNOWN_ERROR.

## Migration checklist

Legend: ✔ done, ◻ pending (migrate to a domain service / remove raw call).

| Component | Socket/event decoupled | `$TeamSpeak.execute` removed | Notes |
|---|---|---|---|
| Login.vue | ✔ (sessionService.login) | n/a | |
| Logout.vue | ✔ (sessionService.logout) | n/a | |
| main.js | ✔ (sessionService.restore) | n/a | |
| ServerViewer.vue | ✔ (eventService) | ◻ | still uses `$TeamSpeak.*` for data |
| TextMessages.vue | ✔ (eventService) | ◻ | |
| Servers.vue | ◻ | ◻ | selectServer → sessionService |
| ServerCreate.vue | ◻ | ◻ | |
| FileBrowser*.vue | ◻ | ◻ | fileService |
| ... (all remaining management components) | ◻ | ◻ | see $TeamSpeak inventory |

## Current unit-test baseline

- `packages/ui/test/transportError.test.js` — error model + TeamSpeak -> code mapping.
- `packages/ui/test/socketRequest.test.js` — ACK success, error, timeout, cancel, disconnect.
- `packages/ui/test/eventService.test.js` — subscribe/duplicate/unsubscribe/clear.

Run with `npm run test:unit --workspace=@ts3-manager/ui` (vitest).

Note: vitest was added as a UI devDependency because the transport/protocol
modules are ESM, which the CommonJS `node --test` runner used by the server
cannot import directly. The existing webpack build is unaffected.
