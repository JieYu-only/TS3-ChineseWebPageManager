import socket from "../socket";
import store from "../store";
import router from "../router";
import NProgress from "nprogress";
import { updateServer } from "./session";

// Polyfill for EventTarget because Safari has no constructor for it
import EventTarget from "@ungap/event-target";

/**
 * The TeamSpeak Object sends the request to the server and finally receives the response from the ServerQuery.
 * To keep things simple it uses the same naming as the TeamSpeak class from the TS3-NodeJS-Library which is used on the server side.
 * See: https://multivit4min.github.io/TS3-NodeJS-Library/classes/teamspeak.html
 * @type {Object}
 */

const TeamSpeak = Object.create(new EventTarget());

// A TeamSpeak / socket-level connection loss invalidates the current session.
// Clear the client session state and send the user back to the login screen.
const handleConnectionLost = () => {
  store.dispatch("clearStorage");

  if (router.currentRoute.name !== "login") {
    router.push({ name: "login" });
  }
};

const handleError = (error, resolve, reject) => {
  if (error.connected) {
    // Ignore empty result error e.g. an empty permissionlist
    if (error.id === "1281") {
      resolve([]);
    } else {
      reject(error);
    }
  } else {
    handleConnectionLost();

    reject(error);
  }
};

let handleResponse = (response, resolve, reject) => {
  // TeamSpeak Error or general Error
  if (
    (response.id && response.id !== 0) ||
    (!response.id && response.message)
  ) {
    handleError(response, resolve, reject);
  } else {
    resolve(response);
  }
};

// Emit a socket event and normalize the ack through handleResponse.
const emitAndHandle = (event, ...payload) => {
  return new Promise((resolve, reject) => {
    socket.emit(event, ...payload, (response) =>
      handleResponse(response, resolve, reject)
    );
  });
};

// Just for debugging the progress bar (NProgress)
const throttleSocketConnection = (time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

// Middleware that handles the progressbar
const setLoadingState = (methods) => {
  methods.forEach((method) => {
    let next = TeamSpeak[method];
    let timer = setTimeout(() => {
      store.commit("isLoading", false);

      NProgress.done();
    }, 0);

    TeamSpeak[method] = async (...args) => {
      try {
        clearTimeout(timer);
        store.commit("isLoading", true);
        NProgress.inc();

        if (process.env.NODE_ENV === "development")
          await throttleSocketConnection(0);

        let response = await next(...args);

        timer = setTimeout(() => {
          store.commit("isLoading", false);

          NProgress.done();
        }, 0);

        return response;
      } catch (error) {
        store.commit("isLoading", false);

        NProgress.done();

        throw error;
      }
    };
  });
};

TeamSpeak.execute = (...args) => {
  let command = args[0];
  let params = args[1] ? args[1] : {};
  let options = args[2] ? args[2] : [];

  return emitAndHandle("teamspeak-execute", { command, params, options });
};

TeamSpeak.createSnapshot = () => emitAndHandle("teamspeak-createsnapshot");

TeamSpeak.deploySnapshot = (snapshot) =>
  emitAndHandle("teamspeak-deploysnapshot", snapshot);

// The ServerQuery returns maximum 200 entries in the clientdblist.
// This function collects all available entries in the client database list.
TeamSpeak.fullClientDBList = async () => {
  let fullClientDbList = [];
  let start = 0;
  let duration = 200;

  while (
    (
      await TeamSpeak.execute("clientdblist", {
        start,
        duration,
      })
    ).length
  ) {
    fullClientDbList.push(
      ...(await TeamSpeak.execute("clientdblist", {
        start,
        duration,
      }))
    );

    start += 200;
    duration += 200;
  }

  return fullClientDbList;
};

TeamSpeak.getChannelList = () => TeamSpeak.execute("channellist");

TeamSpeak.getClientList = () =>
  TeamSpeak.execute("clientlist", {}, ["-voice", "-away"]);

TeamSpeak.getServerInfo = () => TeamSpeak.execute("serverinfo");

TeamSpeak.getServerList = () => TeamSpeak.execute("serverlist");

TeamSpeak.whoAmI = () => TeamSpeak.execute("whoami").then((list) => list[0]);

TeamSpeak.registerEvents = () => emitAndHandle("teamspeak-registerevents");

TeamSpeak.selectServer = (sid) => {
  return TeamSpeak.execute("use", { sid })
    .then(() => updateServer(sid))
    .then(() => store.dispatch("setServerIdAction", sid))
    .then(() => TeamSpeak.registerEvents())
    .then(() => TeamSpeak.whoAmI())
    .then((userInfo) => store.commit("saveUserInfo", userInfo));
};

TeamSpeak.downloadFile = (path, cid, cpw = "") =>
  emitAndHandle("teamspeak-downloadfile", { path, cid, cpw });

TeamSpeak.on = (name, fn) => {
  TeamSpeak.__proto__.addEventListener(name, fn);
};

TeamSpeak.off = (name, fn) => {
  TeamSpeak.__proto__.removeEventListener(name, fn);
};

socket.on("teamspeak-textmessage", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("textmessage", {
      detail: data,
    })
  );
});

socket.on("teamspeak-clientconnect", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("clientconnect", {
      detail: data,
    })
  );
});

socket.on("teamspeak-clientdisconnect", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("clientdisconnect", {
      detail: data,
    })
  );
});

socket.on("teamspeak-clientmoved", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("clientmoved", {
      detail: data,
    })
  );
});

socket.on("teamspeak-tokenused", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("tokenused", {
      detail: data,
    })
  );
});

socket.on("teamspeak-serveredit", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("serveredit", {
      detail: data,
    })
  );
});

socket.on("teamspeak-channeledit", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("channeledit", {
      detail: data,
    })
  );
});

socket.on("teamspeak-channelcreate", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("channelcreate", {
      detail: data,
    })
  );
});

socket.on("teamspeak-channelmoved", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("channelmoved", {
      detail: data,
    })
  );
});

socket.on("teamspeak-channeldelete", (data) => {
  TeamSpeak.__proto__.dispatchEvent(
    new CustomEvent("channeldelete", {
      detail: data,
    })
  );
});

// When the teamspeak connection is closed manually.
// E.g. writing "quit" in the console
socket.on("teamspeak-disconnect", () => {
  handleConnectionLost();
});

setLoadingState([
  "execute",
  "createSnapshot",
  "deploySnapshot",
  "selectServer",
]);

export default TeamSpeak;
