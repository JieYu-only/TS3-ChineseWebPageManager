import { describe, it, expect, vi } from "vitest";
import { createSocketRequest } from "@/transport/socketRequest";
import { ERROR_CODES } from "@/transport/transportError";

describe("createSocketRequest", () => {
  it("resolves with the raw ACK payload and sends event + args + ack", async () => {
    const socket = {
      connected: true,
      emit: vi.fn((event, payload, ack) => ack({ ok: 1 })),
    };
    const request = createSocketRequest(socket);
    const res = await request("teamspeak-execute", { command: "clientlist" });
    expect(res).toEqual({ ok: 1 });
    expect(socket.emit).toHaveBeenCalledWith(
      "teamspeak-execute",
      { command: "clientlist" },
      expect.any(Function)
    );
  });

  it("emits event + ack when there is no payload", async () => {
    const socket = { connected: true, emit: vi.fn((event, ack) => ack("ok")) };
    const request = createSocketRequest(socket);
    const res = await request("teamspeak-registerevents");
    expect(res).toBe("ok");
    expect(socket.emit).toHaveBeenCalledWith("teamspeak-registerevents", expect.any(Function));
  });

  it("rejects with NOT_CONNECTED and does not emit when disconnected", async () => {
    const socket = { connected: false, emit: vi.fn() };
    const request = createSocketRequest(socket);
    await expect(request("teamspeak-execute", {})).rejects.toMatchObject({
      code: ERROR_CODES.NOT_CONNECTED,
    });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("rejects with REQUEST_TIMEOUT when no ACK arrives in time", async () => {
    const socket = { connected: true, emit: vi.fn() };
    const request = createSocketRequest(socket);
    await expect(
      request("teamspeak-execute", {}, { timeoutMs: 15 })
    ).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_TIMEOUT });
  });

  it("rejects with REQUEST_CANCELLED when aborted mid-flight", async () => {
    const socket = { connected: true, emit: vi.fn() };
    const request = createSocketRequest(socket);
    const controller = new AbortController();
    const pending = request("teamspeak-execute", {}, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_CANCELLED });
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const socket = { connected: true, emit: vi.fn() };
    const request = createSocketRequest(socket);
    const controller = new AbortController();
    controller.abort();
    await expect(
      request("teamspeak-execute", {}, { signal: controller.signal })
    ).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_CANCELLED });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("ignores a late ACK after the request already settled", async () => {
    let ackRef;
    const socket = {
      connected: true,
      emit: vi.fn((event, args, ack) => {
        ackRef = ack;
      }),
    };
    const request = createSocketRequest(socket);
    const pending = request("teamspeak-execute", {}, { timeoutMs: 10 });
    await expect(pending).rejects.toMatchObject({ code: ERROR_CODES.REQUEST_TIMEOUT });
    // a late ack must not crash or change the outcome
    ackRef && ackRef({ ok: 1 });
  });
});
