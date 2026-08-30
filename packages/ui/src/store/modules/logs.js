import TeamSpeak from "@/api/TeamSpeak";
import localForage from "localforage";

const db = localForage.createInstance({
  driver: localForage.INDEXEDDB,
  name: "cache",
  storeName: "logs",
});

const state = {
  logView: [],
  fileSize: 0,
  lastPosition: undefined,
};

const mutations = {
  addLogView(state, logView) {
    state.logView.push(...logView);
  },
  setLogView(state, data) {
    state.logView = data;
  },
  setLastPosition(state, position) {
    state.lastPosition = position;
  },
};

const getLocaleDate = (timestamp) => {
  let localeDate = new Date(timestamp);
  let milliseconds =
    localeDate.getTime() + -localeDate.getTimezoneOffset() * 60 * 1000;

  localeDate.setTime(milliseconds);

  return localeDate;
};

const getParsedLogs = (logs) => {
  return logs.map(({ l }) => {
    let [timestamp, level, channel, sid, ...msg] = l.split("|");

    return {
      timestamp: getLocaleDate(timestamp),
      level: level.trim(),
      channel: channel.trim(),
      sid: parseInt(sid),
      msg: msg.join("|"),
    };
  });
};

const saveLogView = async (logView) => {
  for (let line of logView) {
    await db.setItem(line.timestamp.getTime().toString(), line);
  }
};

const actions = {
  async getLogView() {
    let stop = false;
    let lastPosition = 0;

    while (!stop) {
      let logs = await TeamSpeak.execute("logview", {
        instance: 0,
        reverse: 1,
        lines: 100,
        beginPos: lastPosition,
      });

      lastPosition = logs[0].lastPos;

      let parsedLogs = getParsedLogs(logs);

      await saveLogView(parsedLogs);

      if (lastPosition === 0) stop = true;
    }
  },
};

export default {
  state,
  mutations,
  actions,
};
