<template>
  <div
    class="login-page"
    :class="{ 'login-page--dark': $vuetify.theme.dark }"
  >
    <div class="login-brand">
      <img :src="logo" alt="TS3 Manager" />
      <div><strong>teamspeak</strong><span>SERVER CONSOLE</span></div>
    </div>
    <v-card class="login-card" elevation="0">
      <div class="login-heading">
        <span class="eyebrow">SERVERQUERY 登录</span>
        <h1>连接服务器</h1>
        <p>使用 ServerQuery 凭据进入管理控制台</p>
      </div>
      <v-form v-model="valid" @submit.prevent="connect">
        <div class="field-row">
          <div class="field-grow"><label>服务器地址</label><v-text-field v-model="form.host" placeholder="IP 地址或域名" :rules="[rules.required]" outlined dense hide-details="auto" /></div>
          <div class="port-field"><label>端口</label><v-text-field v-model="form.queryport" type="number" :rules="[rules.required]" outlined dense hide-details="auto" /></div>
        </div>
        <label>ServerQuery 用户名</label>
        <v-text-field v-model="form.username" placeholder="例如 serveradmin" name="username" autocomplete="username" :rules="[rules.required]" outlined dense hide-details="auto" prepend-inner-icon="mdi-account-outline" />
        <label>密码</label>
        <v-text-field v-model="form.password" :type="showPassword ? 'text' : 'password'" name="password" autocomplete="current-password" :rules="[rules.required]" outlined dense hide-details="auto" prepend-inner-icon="mdi-lock-outline" :append-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" @click:append="showPassword = !showPassword" />
        <div class="login-options">
          <v-checkbox v-model="rememberLogin" label="记住连接信息" dense hide-details />
          <v-switch v-model="form.ssh" label="SSH 加密" dense hide-details inset />
        </div>
        <v-btn class="connect-btn" type="submit" :disabled="!valid" :loading="loading" block elevation="0">连接控制台<v-icon right small>mdi-arrow-right</v-icon><template #loader><span>正在连接...</span></template></v-btn>
      </v-form>
      <div class="login-footer"><v-icon size="15">mdi-shield-check-outline</v-icon>凭据将加密保存在当前浏览器 · v{{ appVersion }}</div>
    </v-card>
    <p class="page-footer">TS3 Manager · TeamSpeak 服务器管理控制台</p>
  </div>
</template>

<script>
import packageInfo from "../../../../package.json";
import logo from "@/assets/ts3_manager_logo.svg";

export default {
  beforeRouteEnter(to, from, next) {
    next(async (vm) => {
      let token = vm.$store.state.query.token;
      vm.$store.commit("isLoggedOut", true);
      if (!token) return;
      vm.$socket.emit("autofillform", token, (response) => {
        if (response.host) {
          vm.form.host = response.host; vm.form.queryport = response.queryport;
          vm.form.ssh = response.protocol === "ssh"; vm.form.username = response.username; vm.form.password = response.password;
        } else { vm.$store.dispatch("removeToken"); vm.$toast.error(response); }
      });
    });
  },
  data() { return { valid: false, loading: false, showPassword: false, rules: { required: (value) => !!value || "此项为必填项" }, form: { host: "", queryport: 10022, ssh: true, username: "", password: "" }, appVersion: packageInfo.version }; },
  computed: { rememberLogin: { set(value) { this.$store.commit("setRememberLogin", value); }, get() { return this.$store.state.settings.rememberLogin; } } },
  methods: {
    async connect() {
      this.loading = true;
      try {
        let { token } = await this.$TeamSpeak.connect({ host: this.form.host, queryport: this.form.queryport, protocol: this.form.ssh ? "ssh" : "raw", username: this.form.username, password: this.form.password });
        this.$store.dispatch("saveToken", token); this.$store.commit("isConnected", true); this.$store.commit("isLoggedOut", false); this.$router.push({ name: "servers" });
      } catch (err) { this.$toast.error(err.message); }
      this.loading = false;
    },
  },
  watch: { "form.ssh"(ssh) { this.form.queryport = ssh ? 10022 : 10011; } },
};
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 42px 20px; background: #f4f6f9; }
.login-brand { display: flex; align-items: center; gap: 13px; margin-bottom: 30px; color: #10233e; }
.login-brand img { width: 52px; height: 52px; }
.login-brand strong { display: block; font-size: 29px; line-height: 1; letter-spacing: -1px; }
.login-brand span { display: block; margin-top: 6px; color: #7b8798; font-size: 10px; letter-spacing: 2.5px; }
.login-card { width: 100%; max-width: 474px; padding: 38px 32px 27px; border: 1px solid #edf0f4; border-radius: 12px !important; box-shadow: 0 12px 35px rgba(24, 39, 66, .09) !important; }
.login-heading { text-align: center; margin-bottom: 29px; }
.eyebrow { color: #6268df; font-size: 11px; font-weight: 700; letter-spacing: 1.8px; }
.login-heading h1 { margin: 8px 0 5px; color: #172033; font-size: 28px; font-weight: 700; }
.login-heading p { margin: 0; color: #8992a3; font-size: 13px; }
label { display: block; margin: 18px 0 7px; color: #394255; font-size: 13px; }
.field-row { display: flex; gap: 14px; }.field-grow { flex: 1; }.port-field { width: 105px; }
.login-options { display: flex; align-items: center; justify-content: space-between; margin: 14px 0 24px; }
.connect-btn { height: 46px !important; color: white !important; background: #17243a !important; border-radius: 6px !important; text-transform: none; font-weight: 600; letter-spacing: .5px; }
.login-footer { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 23px; padding-top: 21px; border-top: 1px solid #edf0f4; color: #a0a8b5; font-size: 11px; }
.page-footer { margin: 22px 0 0; color: #a4acb8; font-size: 11px; }
.login-page--dark { background: #282a36; }
.login-page--dark .login-brand { color: #f3f4f8; }
.login-page--dark .login-brand span,
.login-page--dark .login-heading p,
.login-page--dark .login-footer,
.login-page--dark .page-footer { color: #aeb3c3; }
.login-page--dark .login-card { border-color: #3b3e50; background: #343746; }
.login-page--dark .login-heading h1,
.login-page--dark label { color: #f3f4f8; }
.login-page--dark .login-footer { border-top-color: #454858; }
@media (max-width: 520px) { .login-card { padding: 30px 22px 24px; }.field-row { gap: 10px; }.port-field { width: 92px; } }
</style>
