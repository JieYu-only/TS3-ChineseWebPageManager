import { describe, it, expect } from "vitest";
import {
  ServiceError,
  ERROR_CODES,
  fromTeamSpeakError,
  socketError,
} from "@/transport/transportError";

describe("ServiceError", () => {
  it("builds with the given fields", () => {
    const err = new ServiceError({
      code: ERROR_CODES.PERMISSION_DENIED,
      message: "没有执行该操作的权限",
      operation: "client.move",
      retryable: false,
      cause: new Error("boom"),
      details: { clientId: "7" },
    });
    expect(err.name).toBe("ServiceError");
    expect(err.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(err.message).toBe("没有执行该操作的权限");
    expect(err.operation).toBe("client.move");
    expect(err.retryable).toBe(false);
    expect(err.cause).toBeInstanceOf(Error);
    expect(err.details).toEqual({ clientId: "7" });
  });

  it("defaults code to UNKNOWN_ERROR", () => {
    const err = new ServiceError();
    expect(err.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
  });

  it("falls back message to the code", () => {
    const err = new ServiceError({ code: ERROR_CODES.REQUEST_TIMEOUT });
    expect(err.message).toBe(ERROR_CODES.REQUEST_TIMEOUT);
  });
});

describe("fromTeamSpeakError", () => {
  it("maps empty-result error 1281 to RESOURCE_NOT_FOUND", () => {
    const err = fromTeamSpeakError({ id: "1281", message: "empty result set" }, "ban.list");
    expect(err.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    expect(err.operation).toBe("ban.list");
  });

  it("maps unknown TeamSpeak errors to PROTOCOL_ERROR", () => {
    const err = fromTeamSpeakError({ id: "520", message: "syntax error" }, "channel.move");
    expect(err.code).toBe(ERROR_CODES.PROTOCOL_ERROR);
  });
});

describe("socketError", () => {
  it("keeps code, operation and defaults retryable to false", () => {
    const err = socketError(ERROR_CODES.REQUEST_TIMEOUT, "server.list", new Error("timeout"));
    expect(err.code).toBe(ERROR_CODES.REQUEST_TIMEOUT);
    expect(err.operation).toBe("server.list");
    expect(err.retryable).toBe(false);
    expect(err.cause).toBeInstanceOf(Error);
  });
});
