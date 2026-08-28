<template lang="html">
  <v-container>
    <v-layout>
      <v-flex xs12>
        <v-card>
          <v-card-title>
            <v-row align="center">
              <v-col cols="3" xl="1">
                <v-checkbox
                  v-model="level.debug"
                  label="调试"
                  color="primary"
                ></v-checkbox>
              </v-col>
              <v-col cols="3" xl="1">
                <v-checkbox
                  v-model="level.error"
                  label="错误"
                  color="error"
                ></v-checkbox>
              </v-col>
              <v-col cols="3" xl="1">
                <v-checkbox
                  v-model="level.warning"
                  label="警告"
                  color="warning"
                ></v-checkbox>
              </v-col>
              <v-col cols="3" xl="1">
                <v-checkbox
                  v-model="level.info"
                  label="信息"
                  color="info"
                ></v-checkbox>
              </v-col>
              <v-col cols="12" sm="6" xl="3">
                <v-select
                  :items="timezones"
                  v-model="selectedTimezone"
                  label="时间显示"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6" xl="4">
                <v-text-field label="筛选日志" v-model="filter"></v-text-field>
              </v-col>
              <v-col cols="12" xl="1">
                <v-btn color="primary" @click="reloadLogView">重新加载</v-btn>
              </v-col>
            </v-row>
          </v-card-title>

          <v-card-text>
            <v-data-table
              :items="parsedLogView"
              :headers="headers"
              :no-data-text="
                $store.state.query.loading ? '正在加载...' : '暂无日志记录'
              "
              hide-default-footer
              :search="filter"
              :items-per-page="itemsPerPage"
            >
              <template #item.level="{ item }">
                <v-chip :color="levelColors[item.level.toLowerCase()]">{{
                  levelLabels[item.level.toLowerCase()] || item.level
                }}</v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      logView: [],
      lastPosition: undefined,
      itemsPerPage: -1,
      filter: "",
      headers: [
        {
          text: "时间",
          value: "timestamp",
          sortable: false,
        },
        {
          text: "级别",
          value: "level",
          sortable: false,
        },
        {
          text: "日志模块",
          value: "channel",
          sortable: false,
        },
        {
          text: "日志内容",
          value: "msg",
          sortable: false,
        },
      ],
      level: {
        debug: true,
        error: true,
        warning: true,
        info: true,
      },
      levelColors: {
        debug: "primary",
        error: "error",
        warning: "warning",
        info: "info",
      },
      levelLabels: {
        debug: "调试",
        error: "错误",
        warning: "警告",
        info: "信息",
      },
      selectedTimezone: "local",
      timezones: [
        {
          text: "UTC 时间",
          value: "utc",
        },
        {
          text: "本地时间",
          value: "local",
        },
      ],
      scrolledBottom: false,
    };
  },
  computed: {
    /**
     * Parse original log string into a javascript object.
     * @return {Array}
     */
    parsedLogView() {
      let parsedLogView = this.logView.map(({ l }) => {
        let [timestamp, level, channel, sid, ...msg] = l.split("|");

        return {
          timestamp:
            this.selectedTimezone === "utc"
              ? this.getUTCDateString(timestamp)
              : this.getLocaleDateString(timestamp),
          level: level.trim(),
          channel: channel.trim(),
          sid: parseInt(sid),
          /** @see {@link https://github.com/joni1802/ts3-manager/issues/26} */
          msg: msg.join("|"),
        };
      });

      // Filter array by level#
      return parsedLogView.filter((log) => {
        switch (log.level.toLowerCase()) {
          case "debug":
            return this.level.debug;
          case "error":
            return this.level.error;
          case "warning":
            return this.level.warning;
          case "info":
            return this.level.info;
        }
      });
    },
  },
  methods: {
    /**
     * Get max. 100 lines from the log. Start at the last returned position.
     * @return {Array} 100 log lines
     */
    async getLogView(beginPosition) {
      return this.$TeamSpeak.execute("logview", {
        instance: 0,
        reverse: 1,
        lines: 100,
        beginPos: beginPosition,
      });
    },

    /**
     * Load the next 100 logs lines.
     */
    async loadMoreLogs() {
      try {
        let moreLogs = await this.getLogView(this.lastPosition);

        this.logView.push(...moreLogs);
      } catch (err) {
        throw err;
      }
    },

    async reloadLogView() {
      try {
        this.logView = await this.getLogView();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },

    /**
     * Add the local timezone offset to the Javascript date object.
     * The TeamSpeak timestamp is always the UTC time.
     * The problem is that the constructor of the Javascript date object always creates date in the locale time.
     * This method adds the timezone offset to the date object and returns it.
     * @param  {string} timestamp UTC timestamp from TeamSpeak
     * @return {Object}           Javascript Date object
     */
    getLocaleDate(timestamp) {
      let localeDate = new Date(timestamp);
      let milliseconds =
        localeDate.getTime() + -localeDate.getTimezoneOffset() * 60 * 1000;

      localeDate.setTime(milliseconds);

      return localeDate;
    },
    getUTCDateString(timestamp) {
      let date = this.getLocaleDate(timestamp);

      let year = date.getUTCFullYear();
      let month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
      let day = date.getUTCDate().toString().padStart(2, "0");

      let hours = date.getUTCHours().toString().padStart(2, "0");
      let minutes = date.getUTCMinutes().toString().padStart(2, "0");
      let seconds = date.getUTCSeconds().toString().padStart(2, "0");

      return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
    },
    getLocaleDateString(timestamp) {
      let date = this.getLocaleDate(timestamp);

      let year = date.getFullYear();
      let month = (date.getMonth() + 1).toString().padStart(2, "0");
      let day = date.getDate().toString().padStart(2, "0");

      let hours = date.getHours().toString().padStart(2, "0");
      let minutes = date.getMinutes().toString().padStart(2, "0");
      let seconds = date.getSeconds().toString().padStart(2, "0");

      return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
    },
    checkScrolledBottom() {
      let documentHeight = document.body.offsetHeight;
      let documentScrolled = window.innerHeight + window.pageYOffset;

      return documentScrolled >= documentHeight - 100;
    },
    async loadMoreLogsOnScroll() {
      try {
        this.scrolledBottom = this.checkScrolledBottom();

        if (this.scrolledBottom && this.lastPosition > 0) {
          await this.loadMoreLogs();
        }

        this.addScrollEventListener();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    addScrollEventListener() {
      document.addEventListener("scroll", this.loadMoreLogsOnScroll, {
        once: true,
      });
    },
    removeScrollEventListener() {
      document.removeEventListener("scroll", this.loadMoreLogsOnScroll);
    },
  },
  async created() {
    try {
      this.logView = await this.getLogView();

      this.addScrollEventListener();
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
  watch: {
    /**
     * Save the last returned log position.
     */
    logView(logView) {
      this.lastPosition = logView[logView.length - 1].lastPos;
    },
  },
  beforeRouteLeave(from, to, next) {
    this.removeScrollEventListener();

    next();
  },
};
</script>

<style lang="css" scoped></style>
