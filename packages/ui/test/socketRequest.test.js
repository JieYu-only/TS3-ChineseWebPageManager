import { describe, it, expect, vi } from "vitest";
import { createSocketRequest } from "@/transport/socketRequest";
import { ERROR_CODES } from "@/transport/transportError";

/**
 * A minimal Socket.IO stand-in: `emit` stores the ack so a test can resolve,
 * time out or never resolve it; `on`/`off`/`_fire` drive the "disconnect" event.
 */
function makeFakeSocket({ connected = true } = {}) {
  const listeners = new Map();
  let ackRef;
  const socket = {
    connected,
    emit: vi.fn((event, ...rest) => {
      const ack = rest[rest.length - 1];
      ackRef = typeof ack === "function" ? ack : null;
    }),
    on: vi.fn((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    }),
    off: vi.fn((event, handler) => {
      listeners.get(event)?.delete(handler);
    }),
    ack(value) {
      ackRef && ackRef(value);
    },
    fire(event) {
      (listeners.get(event) || []).forEach((handler) => handler());
    },
  };
  return socket;
}

describe("createSocketRequest", () => {
  it("resolves with the raw ACK payload and sends event + args + ack", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const pending = request("teamspeak-execute", { command: "clientlist" });
    socket.ack({ ok: 1 });
    await expect(pending).resolves.toEqual({ ok: 1 });
    expect(socket.emit).toHaveBeenCalledWith(
      "teamspeak-execute",
      { command: "clientlist" },
      expect.any(Function)
    );
  });

  it("emits event + ack when there is no payload", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const pending = request("teamspeak-registerevents");
    socket.ack("ok");
    await expect(pending).resolves.toBe("ok");
    expect(socket.emit).toHaveBeenCalledWith(
      "teamspeak-registerevents",
      expect.any(Function)
    );
  });

  it("rejects with NOT_CONNECTED when the request is issued while disconnected", async () => {
    const socket = makeFakeSocket({ connected: false });
    const request = createSocketRequest(socket);
    await expect(request("teamspeak-execute", {})).rejects.toMatchObject({
      code: ERROR_CODES.NOT_CONNECTED,
    });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("rejects with REQUEST_TIMEOUT when no ACK arrives in time", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    await expect(
      request("teamspeak-execute", {}, { timeoutMs: 15 })
    ).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_TIMEOUT });
  });

  it("rejects with CONNECTION_LOST when the socket disconnects mid-flight", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const pending = request("teamspeak-execute", {}, { timeoutMs: 1000 });
    socket.fire("disconnect");
    await expect(pending).rejects.toMatchObject({ code: ERROR_CODES.CONNECTION_LOST });
  });

  it("rejects with REQUEST_CANCELLED when aborted mid-flight", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const controller = new AbortController();
    const pending = request("teamspeak-execute", {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_CANCELLED });
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const controller = new AbortController();
    controller.abort();
    await expect(
      request("teamspeak-execute", {}, { signal: controller.signal })
    ).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_CANCELLED });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("ignores a late ACK after the request already settled", async () => {
    const socket = makeFakeSocket();
    const request = createSocketRequest(socket);
    const pending = request("teamspeak-execute", {}, { timeoutMs: 10 });
    await expect(pending).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_TIMEOUT });
    // a late ack must not crash or change the outcome
    socket.ack({ ok: 1 });
  });
});
