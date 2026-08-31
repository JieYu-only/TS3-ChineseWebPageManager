import io from "socket.io-client";
import store from "./store";
import router from "./router";
import notify from "@/notify";

let connectErrorShown = false;
let teamSpeakReady = false;

// Socket connection to the backend
const socket = io(process.env.VUE_APP_WEBSOCKET_URI, {
  withCredentials: true,
  autoConnect: false,
});

// Go to login screen and set connection state to false
const handleLogout = () => {
  store.commit("isConnected", false);

  if (router.currentRoute.value.name !== "login") {
    router.push({ name: "login" });
  }
};

socket.on("connect_error", (err) => {
  if (!connectErrorShown) {
    notify.error(err.message);

    connectErrorShown = true;

    handleLogout();
  }
});

socket.on("connect", () => {
  if (connectErrorShown) {
    notify.success("已重新连接服务器");

    connectErrorShown = false;
  }
});

socket.on("teamspeak-connected", () => {
  teamSpeakReady = true;
});

socket.on("disconnect", () => {
  teamSpeakReady = false;
  handleLogout();
});

/**
 * Open Socket.IO and resolve only after the backend has restored the
 * underlying ServerQuery connection for the authenticated session.
 */
export function connectToSession(timeoutMs = 15000) {
  if (socket.connected && teamSpeakReady) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("teamspeak-connected", onReady);
      socket.off("teamspeak-error", onTeamSpeakError);
      socket.off("connect_error", onConnectError);
    };
    const onReady = () => {
      teamSpeakReady = true;
      cleanup();
      resolve();
    };
    const fail = (error) => {
      teamSpeakReady = false;
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error(error.message || String(error))
      );
    };
    const onTeamSpeakError = (error) => fail(error);
    const onConnectError = (error) => fail(error);
    const timer = setTimeout(
      () => fail(new Error("连接 TeamSpeak 服务器超时")),
      timeoutMs
    );

    socket.on("teamspeak-connected", onReady);
    socket.on("teamspeak-error", onTeamSpeakError);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) socket.open();
  });
}

export default socket;
