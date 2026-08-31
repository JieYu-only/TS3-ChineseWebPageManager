<template lang="html">
  <v-container fluid class="console-page">
    <page-header title="查询终端" description="直接执行 ServerQuery 命令并查看返回结果" :breadcrumbs="['控制台', '查询终端']" />
    <v-row justify="center">
      <v-col lg="8" md="10" sm="10" cols="12">
        <v-card>
          <v-card-text>
            <v-switch v-model="prettyPrint" label="格式化显示"></v-switch>
            <div ref="terminal" v-resize="resizeTerminal"></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import LocalEchoController from "local-echo";
import consoleService from "@/services/consoleService";

export default {
  data() {
    return {
      terminal: null,
      localEcho: null,
      prettyPrint: true,
      fitAddon: null,
    };
  },
  methods: {
    resizeTerminal() {
      this.$nextTick(() => {
        this.fitAddon.fit();
      });
    },
    renderTerminal() {
      this.terminal = new Terminal({
        cursorBlink: true,
      });
      this.fitAddon = new FitAddon();

      this.terminal.loadAddon(this.fitAddon);

      this.localEcho = new LocalEchoController(this.terminal);

      this.terminal.open(this.$refs.terminal);

      this.fitAddon.fit();

      this.terminal.focus();
    },
    async registerKeyEvents() {
      try {
        let input = await this.localEcho.read("~$");

        let response = await this.sendData(input);

        this.terminal.writeln(this.stringifyQueryResponse(response));

        this.registerKeyEvents();
      } catch (err) {
        this.terminal.writeln(this.stringifyQueryResponse(err));

        this.registerKeyEvents();
      }
    },
    stringifyQueryResponse(response) {
      // adds "carriage return" character
      // otherwise new line is not printed correctly by xterm
      return JSON.stringify(response, null, this.prettyPrint ? 2 : 0).replace(
        /\n/g,
        "\n\r"
      );
    },
    sendData(input) {
      let { command, parameters, options } = this.parseQueryRequest(input);

      return consoleService.execute(command, parameters, options);
    },
    parseQueryRequest(input) {
      let command = input.split(" ")[0];
      let parameters = {};
      let options = [];

      input.split(" ").forEach((val) => {
        if (/\=/.test(val)) {
          // If it contains an equal sign
          parameters[val.split(/=(.+)/)[0]] = val.split(/=(.+)/)[1];
        } else if (/^-/.test(val)) {
          // If the first character is a hyphen
          options.push(val);
        }
      });

      return { command, parameters, options };
    },
    init() {
      this.renderTerminal();
      this.registerKeyEvents();
    },
  },
  created() {
    // nextTick waits till the DOM Element is renderd.
    // Otherwise this.$refs.terminal would be undefined on created and the terminal would not render correctly
    this.$nextTick(() => {
      this.init();
    });
  },
};
</script>

<style lang="css">
@import "xterm/css/xterm.css";
</style>
