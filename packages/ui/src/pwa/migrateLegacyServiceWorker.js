function registrationScriptUrls(registration) {
  return [
    registration.active?.scriptURL,
    registration.waiting?.scriptURL,
    registration.installing?.scriptURL,
  ].filter(Boolean);
}

export function isLegacyServiceWorkerRegistration(registration) {
  return registrationScriptUrls(registration).some((scriptUrl) =>
    /\/service-worker\.js(?:[?#].*)?$/.test(scriptUrl)
  );
}

/**
 * Remove the Vue CLI service worker and its caches exactly once. The cache
 * cleanup is intentionally conditional on finding the legacy registration:
 * both generations used a `ts3-manager` prefix, so deleting by prefix on every
 * boot would also erase the active Vite PWA precache.
 */
export async function migrateLegacyServiceWorker({
  serviceWorker = globalThis.navigator?.serviceWorker,
  cacheStorage = globalThis.caches,
  logger = console,
} = {}) {
  if (!serviceWorker) return;

  try {
    const registrations = await serviceWorker.getRegistrations();
    const legacyRegistrations = registrations.filter(
      isLegacyServiceWorkerRegistration
    );

    if (legacyRegistrations.length === 0) return;

    await Promise.all(
      legacyRegistrations.map((registration) => registration.unregister())
    );

    if (cacheStorage) {
      const keys = await cacheStorage.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("workbox-precache") ||
              key.startsWith("ts3-manager")
          )
          .map((key) => cacheStorage.delete(key))
      );
    }
  } catch (err) {
    // Best-effort: a failure to clean legacy caches must not block the app.
    logger.error("Legacy service worker migration failed:", err);
  }
}
