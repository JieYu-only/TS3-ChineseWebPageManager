/****************************************************
  The TeamSpeak instance is imported by the domain
  services directly; no global instance property is
  exposed on Vue (the legacy prototype injection was
  removed during the communication-layer decoupling).
 ****************************************************/
import "./assets/css/style.css";

import Vue from "vue";
import App from "./App.vue";
import PageHeader from "@/components/PageHeader";
import vuetify from "./plugins/vuetify";
import "nprogress/nprogress.css";
import NProgress from "nprogress";

import sessionService from "./services/sessionService";
import "./registerServiceWorker";

import store from "./store";
import router from "./router";

(async () => {
  NProgress.configure({
    showSpinner: false,
  });

  Vue.component("PageHeader", PageHeader);

  Vue.config.productionTip = false;

  // Restore a server-side session (if any) before mounting so the router guard
  // and components see the correct connection state immediately. Credentials
  // are never present on the browser; the socket is connected and the server
  // re-establishes the TeamSpeak connection from the stored session.
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

  // Render app
  new Vue({
    render: (h) => h(App),
    router,
    store,
    vuetify,
  }).$mount("#app");
})();
