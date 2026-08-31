/****************************************************
  The TeamSpeak instance is imported by the domain
  services directly; no global instance property is
  exposed on Vue (the legacy prototype injection was
  removed during the communication-layer decoupling).
 ****************************************************/
import "./assets/css/style.css";

import { createApp } from "vue";
import App from "./App.vue";
import PageHeader from "@/components/PageHeader";
import "nprogress/nprogress.css";
import NProgress from "nprogress";

import sessionService from "./services/sessionService";
import { registerSW } from "virtual:pwa-register";
import { migrateLegacyServiceWorker } from "./pwa/migrateLegacyServiceWorker";

import store, { pinia } from "./store";
import vuetify from "./plugins/vuetify";
import router from "./router";

(async () => {
  NProgress.configure({ showSpinner: false });

  const app = createApp(App);

  // Install state, the $store compatibility façade, the shared PageHeader
  // component and Vuetify. The router is installed *after* the session restore
  // below so its guard sees the correct connection state during the very first
  // navigation (Vue Router 4 starts the initial navigation on install).
  app.use(pinia);
  app.config.globalProperties.$store = store;
  app.component("PageHeader", PageHeader);
  app.use(vuetify);

  // Restore a server-side session (if any) before the router's first navigation
  // so the router guard and components see the correct connection state
  // immediately. Credentials are never present on the browser; the socket is
  // connected and the server re-establishes the TeamSpeak connection from the
  // stored session.
  try {
    const sessionStatusResp = await sessionService.restore();

    if (sessionStatusResp.connected) {
      await store.dispatch("saveConnection", {
        serverId: sessionStatusResp.serverId,
      });
    } else {
      store.dispatch("clearConnection");
    }
  } catch (err) {
    store.dispatch("clearConnection");
  }

  // Install the router now that the connection state is restored.
  app.use(router);

  // Replace the legacy service worker, then register the Vite PWA worker.
  await migrateLegacyServiceWorker();
  registerSW({ immediate: true });

  app.mount("#app");
})();
