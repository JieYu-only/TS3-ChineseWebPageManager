/****************************************************
  !!! THE ORDER OF THE IMPORTED MODULES MATTERS !!! *
      The TeamSpeak instance needs to be imported   *
      before the store, router and socket.          *
 ****************************************************/
import "./assets/css/style.css";

import Vue from "vue";
import App from "./App.vue";
import PageHeader from "@/components/PageHeader";
import vuetify from "./plugins/vuetify";
import "nprogress/nprogress.css";
import NProgress from "nprogress";

import TeamSpeak from "./api/TeamSpeak";
import { status as sessionStatus } from "./api/session";
import "./registerServiceWorker";

import store from "./store";
import router from "./router";
import socket, { connectToSession } from "./socket";

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
    const sessionStatusResp = await sessionStatus();

    if (sessionStatusResp.connected) {
      await connectToSession();
      await store.dispatch("saveConnection", {
        serverId: sessionStatusResp.serverId,
      });
    } else {
      store.dispatch("clearConnection");
    }
  } catch (err) {
    store.dispatch("clearConnection");
  }

  // Adding instance properties which are often used in components
  Vue.prototype.$socket = socket;
  Vue.prototype.$TeamSpeak = TeamSpeak;

  // Render app
  new Vue({
    render: (h) => h(App),
    router,
    store,
    vuetify,
  }).$mount("#app");
})();
