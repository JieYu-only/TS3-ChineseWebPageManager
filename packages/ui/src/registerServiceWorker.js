/* eslint-disable no-console */

const UPDATE_INTERVAL = 60 * 60 * 1000;

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  let hasActiveController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Reload only when replacing an existing worker. This keeps the running
    // HTML and lazy-loaded chunks on the same application version.
    if (hasActiveController && !reloading) {
      reloading = true;
      window.location.reload();
    }
    hasActiveController = true;
  });

  try {
    const registration = await navigator.serviceWorker.register(
      `${process.env.BASE_URL}service-worker.js`
    );

    const checkForUpdate = () =>
      registration
        .update()
        .catch((error) => console.error("Service worker update failed:", error));

    window.setInterval(checkForUpdate, UPDATE_INTERVAL);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

if (process.env.NODE_ENV === "production") {
  window.addEventListener("load", registerServiceWorker);
}
