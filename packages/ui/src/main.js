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
import VueToast from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";
import "nprogress/nprogress.css";
import NProgress from "nprogress";
import Clipboard from "v-clipboard";

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

  Vue.use(Clipboard);
  Vue.component("PageHeader", PageHeader);

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
    [/invalid loginname or password|invalid password/i, "用户名或密码错误"],
    [/insufficient client permissions/i, "当前账号权限不足，无法完成此操作"],
    [/invalid parameter/i, "提交的参数无效，请检查输入内容"],
    [/database empty result set/i, "没有找到符合条件的数据"],
    [/connection failed|could not connect/i, "连接 TeamSpeak 服务器失败"],
    [/server.*offline/i, "目标服务器当前未运行"],
    [/file not found/i, "未找到指定文件"],
    [/already member of group/i, "该用户已经属于此用户组"],
    [/not a member of group/i, "该用户不属于此用户组"],
    [/channel name is already in use/i, "频道名称已被使用"],
    [/nickname is already in use/i, "昵称已被使用"],
    [/invalid uid/i, "用户唯一标识（UID）无效"],
  ];
  Vue.prototype.$toast.error = (message, options) => {
    const rawMessage =
      message && message.message ? message.message : String(message || "未知错误");
    const translated = errorTranslations.find(([pattern]) =>
      pattern.test(rawMessage)
    );
    const errorCode = rawMessage.match(/(?:error\s*)?(?:id|code)\D*(\d+)/i);
    const localizedMessage = translated
      ? translated[1]
      : /[\u4e00-\u9fff]/.test(rawMessage)
      ? rawMessage
      : `操作失败，请检查输入和服务器状态${
          errorCode ? `（错误码：${errorCode[1]}）` : ""
        }`;
    return originalToastError(localizedMessage, options);
  };

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
