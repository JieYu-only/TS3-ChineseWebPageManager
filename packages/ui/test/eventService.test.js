import { describe, it, expect, vi, beforeEach } from "vitest";

// eventService imports the TeamSpeak event bus; mock it so the test needs no
// Vue/store/router/socket and can assert subscribe/unsubscribe behaviour.
vi.mock("@/api/TeamSpeak", () => ({
  default: { on: vi.fn(), off: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import eventService from "@/services/eventService";

beforeEach(() => {
  // Clear any leftover subscriptions first, then reset the spies so the
  // cleanup itself does not pollute the next test's call counts.
  eventService.clear();
  vi.clearAllMocks();
});

describe("eventService", () => {
  it("registers a listener through TeamSpeak.on", () => {
    const handler = () => {};
    eventService.subscribe("client-connected", handler);
    expect(TeamSpeak.on).toHaveBeenCalledWith("client-connected", handler);
  });

  it("does not register the same handler twice (no double listen)", () => {
    const handler = () => {};
    eventService.subscribe("client-connected", handler);
    eventService.subscribe("client-connected", handler);
    expect(TeamSpeak.on).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe() releases the listener once", () => {
    const handler = () => {};
    const sub = eventService.subscribe("client-connected", handler);
    sub.unsubscribe();
    sub.unsubscribe();
    expect(TeamSpeak.off).toHaveBeenCalledTimes(1);
    expect(TeamSpeak.off).toHaveBeenCalledWith("client-connected", handler);
  });

  it("allows the same handler on different events", () => {
    const handler = () => {};
    eventService.subscribe("client-connected", handler);
    eventService.subscribe("client-disconnected", handler);
    expect(TeamSpeak.on).toHaveBeenCalledTimes(2);
  });

  it("clear() releases every subscription (used on logout)", () => {
    const a = () => {};
    const b = () => {};
    eventService.subscribe("event-a", a);
    eventService.subscribe("event-b", b);
    eventService.clear();
    expect(TeamSpeak.off).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe(s) helper handles a subscription handle", () => {
    const handler = () => {};
    const sub = eventService.subscribe("event-a", handler);
    eventService.unsubscribe(sub);
    expect(TeamSpeak.off).toHaveBeenCalledWith("event-a", handler);
  });
});
