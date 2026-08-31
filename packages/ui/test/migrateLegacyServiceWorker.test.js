import { describe, expect, it, vi } from "vitest";

import {
  isLegacyServiceWorkerRegistration,
  migrateLegacyServiceWorker,
} from "../src/pwa/migrateLegacyServiceWorker";

function registration(scriptURL, state = "active") {
  return {
    [state]: { scriptURL },
    unregister: vi.fn().mockResolvedValue(true),
  };
}

describe("legacy service worker migration", () => {
  it("recognizes the old worker in any registration state", () => {
    expect(
      isLegacyServiceWorkerRegistration(
        registration("http://localhost/service-worker.js?v=2", "waiting")
      )
    ).toBe(true);
    expect(
      isLegacyServiceWorkerRegistration(registration("http://localhost/sw.js"))
    ).toBe(false);
  });

  it("preserves the current PWA caches when no legacy worker exists", async () => {
    const current = registration("http://localhost/sw.js");
    const cacheStorage = {
      keys: vi.fn().mockResolvedValue(["ts3-manager-v3-precache"]),
      delete: vi.fn(),
    };

    await migrateLegacyServiceWorker({
      serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([current]) },
      cacheStorage,
    });

    expect(current.unregister).not.toHaveBeenCalled();
    expect(cacheStorage.keys).not.toHaveBeenCalled();
    expect(cacheStorage.delete).not.toHaveBeenCalled();
  });

  it("unregisters the legacy worker and removes only its cache families", async () => {
    const legacy = registration("http://localhost/service-worker.js");
    const current = registration("http://localhost/sw.js");
    const cacheStorage = {
      keys: vi
        .fn()
        .mockResolvedValue([
          "workbox-precache-v2",
          "ts3-manager-v3-precache",
          "unrelated-cache",
        ]),
      delete: vi.fn().mockResolvedValue(true),
    };

    await migrateLegacyServiceWorker({
      serviceWorker: {
        getRegistrations: vi.fn().mockResolvedValue([legacy, current]),
      },
      cacheStorage,
    });

    expect(legacy.unregister).toHaveBeenCalledOnce();
    expect(current.unregister).not.toHaveBeenCalled();
    expect(cacheStorage.delete).toHaveBeenCalledTimes(2);
    expect(cacheStorage.delete).not.toHaveBeenCalledWith("unrelated-cache");
  });

  it("does not block startup when browser migration APIs fail", async () => {
    const logger = { error: vi.fn() };

    await expect(
      migrateLegacyServiceWorker({
        serviceWorker: {
          getRegistrations: vi.fn().mockRejectedValue(new Error("denied")),
        },
        cacheStorage: null,
        logger,
      })
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
