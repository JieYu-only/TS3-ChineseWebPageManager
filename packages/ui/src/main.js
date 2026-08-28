/****************************************************
  !!! THE ORDER OF THE IMPORTED MODULES MATTERS !!! *
      The TeamSpeak instance needs to be imported   *
      before the store, router and socket.          *
 ****************************************************/
import "./assets/css/style.css";

import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueToast from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import "nprogress/nprogress.css";
import NProgress from "nprogress";
import Clipboard from "v-clipboard";

import TeamSpeak from "./api/TeamSpeak";
import "./registerServiceWorker";

import store from "./store";
import router from "./router";
import socket from "./socket";

(async () => {
  NProgress.configure({
    showSpinner: false,
  });

  Vue.use(Clipboard);

  Vue.use(VueToast, {
    position: "top",
    duration: 4000,
  });

  // Translate common browser and connection errors before displaying them.
  // Unknown TeamSpeak errors are kept intact so administrators can still
  // search the original server response when troubleshooting.
  const originalToastError = Vue.prototype.$toast.error.bind(
    Vue.prototype.$toast
  );
  const errorTranslations = [
    [/^Failed to fetch$/i, "网络请求失败，请检查管理服务是否正常运行"],
    [/^Network ?Error/i, "网络连接失败，请检查网络或服务地址"],
    [/^Load failed$/i, "请求加载失败，请检查网络连接"],
    [/timeout|timed out/i, "请求超时，请稍后重试"],
    [/unauthorized|not authorized|401/i, "登录状态已失效，请重新登录"],
    [/forbidden|403/i, "当前账号没有执行此操作的权限"],
    [/not found|404/i, "请求的资源不存在"],
    [/internal server error|500/i, "服务器内部错误，请查看服务日志"],
    [/ECONNREFUSED/i, "无法连接到目标服务，请检查地址和端口"],
    [/ENOTFOUND/i, "无法解析服务器地址，请检查主机名"],
    [/socket.*disconnect|disconnected/i, "与服务器的连接已断开"],
  ];
  Vue.prototype.$toast.error = (message, options) => {
    const rawMessage =
      message && message.message ? message.message : String(message || "未知错误");
    const translated = errorTranslations.find(([pattern]) =>
      pattern.test(rawMessage)
    );
    return originalToastError(translated ? translated[1] : rawMessage, options);
  };

  Vue.config.productionTip = false;

  // Connect to websocket server
  socket.open();

  if (!store.state.query.loggedOut) {
    try {
      await TeamSpeak.reconnect();
    } catch (err) {
      console.log(err);
    }
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
