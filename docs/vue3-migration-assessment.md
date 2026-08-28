# Vue 2 / Vuetify 2 → Vue 3 / Vuetify 3 迁移评估

> 本文档是对现有前端技术栈的一次静态盘点，用于评估升级到 Vue 3 + Vuetify 3 的可行性与工作量。
> **结论：当前不建议整体升级。** 建议先做低风险准备，等关键路径的依赖生态与组件改造成熟后再启动迁移。

- 评估时间：随本次提交
- 适用范围：`packages/ui`（Vue 2.7 + Vuetify 2 + Vue CLI 5）
- 评估方式：源码静态扫描 + 依赖清单核对

---

## 1. 当前技术栈

| 层 | 现状 | 版本 | Vue 3 对应 |
| --- | --- | --- | --- |
| 框架 | Vue | `^2.7.16` | Vue `^3.x` |
| UI 库 | Vuetify | `^2.7.2` | Vuetify `^3.x` |
| 路由 | vue-router | `^3.6.5` | vue-router `^4.x` |
| 状态管理 | Vuex | `^3.1.1` | Pinia（推荐）或 Vuex `^4.x` |
| 模板编译器 | vue-template-compiler | `2.7.16` | `@vue/compiler-sfc` |
| 构建 | Vue CLI（Webpack 5） | `@vue/cli-service ~5.0.9` | Vite（推荐）或 Vue CLI |
| PWA | `@vue/cli-plugin-pwa` + Workbox | `~5.0.9` | `vite-plugin-pwa` 或 `@vue/cli-plugin-pwa` |
| 图标字体 | `@mdi/font` | `^4.5.95` | `@mdi/font` v7（或 `@mdi/js`） |
| Vuetify 插件 | `vue-cli-plugin-vuetify` | `^2.0.7` | `vite-plugin-vuetify` |

### 规模

- 前端组件 `.vue` 文件：**71 个**（含若干调试/占位组件 `Test.vue`、`Test copy.vue`、`Spacer*.vue`）
- Vuex 模块：5 个（`settings` / `query` / `chat` / `avatars` / `uploads`）
- Vue Router 路由：38 条（`routes.js`，含 `*` 通配与调试路由 `/test`），`mode: "history"`
- 图表：基于 `chart.js` v3 直接操作 Chart 实例（非 vue-chartjs）
- 终端：`xterm` v4 + `xterm-addon-fit`（直接基于 `$refs` 挂载）

---

## 2. Vue 2 特有用法盘点（迁移断点）

| 位置 | 用法 | 现状 | Vue 3 处理 |
| --- | --- | --- | --- |
| `src/main.js:102` | `new Vue({...}).$mount("#app")` | 挂载入口 | `createApp(App).mount("#app")` |
| `src/main.js:29,31` | `Vue.use(...)` | 插件注册 | `app.use(...)` |
| `src/main.js:67,98,99` | `Vue.prototype.$toast / $socket / $TeamSpeak` | 实例属性 | `app.config.globalProperties.$toast = ...` |
| `src/main.js:84` | `Vue.config.productionTip = false` | 全局配置 | `app.config.productionTip`（Vue 3 默认已关） |
| `src/components/BanEdit.vue:55` | `this.$set(this.ban, "time", ...)` | 响应式赋值 | 直接赋值或 `reactive`（Vue 3 已移除 `$set`） |
| `src/components/FileBrowser.vue:27` | `:open.sync="openFolders"` | `.sync` 修饰符 | `v-model:open` |
| `src/components/FileUploadIcon.vue:205` | `beforeDestroy()` | 生命周期 | `beforeUnmount()` |
| 多处 `mixins: [chart]` / `mixins: [fileTransfer]` | Options API mixin | 复用逻辑 | Options API 仍兼容，可用 `composables` 重构 |
| 多处 `this.$refs` | 模板引用 | 直接访问 | 仍可用（注意 `<Teleport>`/`<component :is>` 差异） |
| `src/router/index.js` | `router.beforeEach((to, from, next) => ...)` + `mode: "history"` | 路由守卫 | `beforeEach` 改为返回式，`createWebHistory()` |

> 未发现 `Vue.filter`、`$scopedSlots`、`functional: true`、`.native` 修饰符等 Vue 2 深度依赖，这些方面迁移成本较低。

---

## 3. Vuetify 2 特有用法盘点（最大工作量）

全项目共扫描到 **82 处**较敏感用法，主要集中在以下组件，Vuetify 3 对这些组件的 API 有较大改动：

| 组件 / 用法 | 出现 | Vuetify 3 变化 | 说明 |
| --- | --- | --- | --- |
| `v-data-table` | ~10 个文件 | 大面积重写（`headers-items`、`v-slot` 结构、`item-*` props 变化） | 表格是最大改造点 |
| `v-autocomplete` | ~14 处 | 基本可用，`item-text/item-value`、`multiple`、`chips` 等属性调整 | 中等改动 |
| `v-list-item-group` | ~6 处 `GroupClientList/TextMessages/Test*` | 结构重命名（`v-list-group`），`input-value`/`active` 插槽变化 | 需逐处调整 |
| `v-checkbox :input-value="active"` | 多处 | `input-value` 已移除，改用 `model-value` / `@update:model-value` | 批量替换 |
| `v-radio-group` | ~3 处 | 基本可用，事件名/cprops 有调整 | 中等 |
| `v-treeview` | 2 处 `FileBrowser/ServerViewer` | Vuetify 3 中迁到 `vuetify/labs`（实验组件，需额外引入） | 需评估替代 |
| 主题 | `src/plugins/vuetify.js` | `new Vuetify({ theme })` 结构改变 | 改为 `createVuetify({ theme: { defaultTheme } })` |
| 图标 | `@mdi/font` v4 + `vue.config.js` 自定义 `string-replace-loader` | Vuetify 3 用 `@mdi/font` v7 | 该 loader 需重写/移除 |
| `:open.sync`（`FileBrowser.vue`） | 1 处 | 改为 `v-model:open` | 单独处理 |

---

## 4. 依赖 / 插件兼容性对照

### 运行时依赖

| 依赖 | 当前 | Vue 3 兼容 | 备注 |
| --- | --- | --- | --- |
| `vue` `^2.7.16` | 使用中 | 需 `^3.x` | 本体升级 |
| `vue-router` `^3.6.5` | 使用中 | 需 `^4.x` | API 重写（`createRouter`/`createWebHistory`） |
| `vuex` `^3.1.1` | 使用中 | Vuex `^4.x` 或 Pinia | 建议评估 Pinia 重写 5 个模块 |
| `vuex-persistedstate` `^2.7.1` | 使用中 | 需 `^4.x` | Vue 2 版不与 Vuex 4 兼容 |
| `v-clipboard` `^2.2.2` | 使用中 | **不兼容**（Vue 2 only） | 换 `vue-clipboard-next` 或自写 |
| `vue-toast-notification` `^0.6.2` | 使用中 | **不兼容**（Vue 2 only） | 换 Vuetify 3 原生或 `vue3-toastify` |
| `chart.js` `^3.2.1` | 使用中 | 兼容 | 直接操作实例，无框架耦合 |
| `xterm` `v4.9.0` + `xterm-addon-fit` `^0.4.0` | 使用中 | 兼容（仍是 v4） | 基于 `$refs`，Vue 3 需确认 ref 时序 |
| `socket.io-client` `^4.8.3` | 使用中 | 兼容 | 与后端一致 |
| `axios` / `js-cookie` / `localforage` / `nprogress` / `file-saver` / `path-browserify` / `secure-ls` / `local-echo` | 使用中 | 兼容 | 无框架绑定 |

### 开发依赖

| 依赖 | Vue 3 对应 | 备注 |
| --- | --- | --- |
| `vue-template-compiler` `2.7.16` | `@vue/compiler-sfc` | 需替换 |
| `vue-cli-plugin-vuetify` `^2.0.7` | `vite-plugin-vuetify` 或 Webpack 插件 | 需替换 |
| `@vue/cli-plugin-babel`/`@vue/cli-service`/`@vue/cli-plugin-pwa` `~5.0.9` | Vite 生态或仍可用 | Webpack 5 + Vue 3 可行但官方转向 Vite |
| `@mdi/font` `^4.5.95` | `@mdi/font` v7 / `@mdi/js` | 需升级 |
| `sass` / `sass-loader` / `stylus` / `stylus-loader` | 基本兼容 | Sass 弃用警告仍会存在 |
| `string-replace-loader` | 需移除 | 用于 Vuetify 2 图标字体收敛，Vuetify 3 不需要 |

> 说明：根 `package.json` 的 `overrides` 中对 `@vue/compiler-sfc` 的 `postcss` 覆盖（`^8.5.26`）是**第三方依赖引入的 Vue 3 编译器**，并非本项目直接使用，迁移时需一并核查其来源。

---

## 5. 构建工具与 PWA

- 当前构建为 **Vue CLI 5 + Webpack 5**，`vue.config.js` 中有：
  - `runtimeCompiler: true`
  - `productionSourceMap: false`
  - `css.extract.ignoreOrder: true`
  - Vuetify 2 Sass 弃用静默配置（`quietDeps` / `silenceDeprecations`）
  - 自定义 `mdi-woff2-only` 的 `string-replace-loader`（针对 `@mdi/font` v4）
  - `pwa` 段（Workbox `cacheId: ts3-manager-v3`，runtimeCaching 排除 `/api` 与 `/socket.io`）
- 迁移到 Vue 3 后，构建工具若沿用 Webpack 需重写上述 Vue2 相关配置；**建议顺势切到 Vite**（`@vitejs/plugin-vue`），PWA 用 `vite-plugin-pwa` 替代 `@vue/cli-plugin-pwa`。
- PWA/Service Worker 的缓存策略（`/api`、`/socket.io` 走网络、静态缓存版本化）可基本沿用 Workbox 逻辑，但需要迁移插件。

---

## 6. 迁移成本评估与建议

### 主要风险点（按影响排序）

1. **Vuetify 2 → 3**：`v-data-table`（10 处）、`v-autocomplete`（14 处）、`v-list-item-group`/`input-value`（多处）、`v-treeview`（迁到 labs）。UI 层重写量最大。
2. **状态管理**：Vuex 3 → Pinia，需重构 5 个模块及 `vuex-persistedstate` 持久化逻辑（`secure-ls` 加密）。这是逻辑层核心，回归风险高。
3. **路由**：vue-router 3 → 4，路由守卫 `next()` 写法需全部重写。
4. **插件替换**：`v-clipboard`、`vue-toast-notification`、`vuex-persistedstate` 三个 Vue 2-only 插件需寻找/实现替代。
5. **模板/挂载兼容**：`new Vue`、`Vue.prototype`、`$set`、`.sync`、`beforeDestroy` 等少量点，属机械改动，成本低。

### 分阶段迁移路线（建议）

**阶段 0（可立即做，零风险，本期已具备部分基础）**
- 移除/隔离调试与占位组件（`Test.vue`、`Test copy.vue`、`Spacer*.vue`）。
- 补齐 PWA 标准图标（已在本项目第 4 项完成）。
- 建立自动化测试与 CI 基线（已在本项目第 5 项完成），防止迁移期回归。

**阶段 1（做准备，不改整体架构）**
- 将 `src/api` 与 socket 通信层从组件中解耦，便于迁移时少动业务逻辑。
- 用 Vue 3 兼容的替代方案替换三个 Vue 2 only 插件（`v-clipboard`/`vue-toast-notification`/`vuex-persistedstate`），使插件层先接近 Vue 3 生态。

**阶段 2（真正升级，建议在独立分支/里程碑进行）**
- 引入 Vue 3 + Vuetify 3 + Vite 构建，`createApp`/`createVuetify`/`createRouter` 入口改造。
- 状态迁移到 Pinia，持久化改用 Pinia 插件。
- 逐组件改造 Vuetify 3 用法，优先 `v-data-table` 与 `v-autocomplete`。

**阶段 3（收尾）**
- 清理残留 Vue 2 写法，重写 `vue.config.js` 相关配置，用 `vite-plugin-pwa` 承接 Workbox 缓存策略。
- 全量回归：登录、服务器列表、实时在线、频道树、文件/日志/密钥/黑名单/快照、权限组、投诉、API 密钥。

### 决策

- **近期**：不做整体升级。理由：Vuetify 2 → 3 的组件 API 变化大、Vuex → Pinia 属逻辑层重构，在无测试基线、无人值守的情况下整体升级回归风险高，与项目“长期稳健”目标不符。
- **中期**：先完成阶段 0/1 的低风险准备（清理占位代码、插件替代、通信解耦）。
- **长期**：在具备上述基础并有 CI 覆盖后，再评估以“独立分支 + 里程碑”方式启动阶段 2 的正式迁移。

---

## 7. 结论

- 技术路线：**维持 Vue 2 + Vuetify 2，暂不整体升级**。
- 工作重心：用阶段 0/1 的增量、低风险改造为未来迁移铺路，而不是立即重写框架层。
- 最大拦路虎：Vuetify 2 → 3 的表格/下拉/树等组件 API 变化，以及 Vuex → Pinia 的状态层重构。
