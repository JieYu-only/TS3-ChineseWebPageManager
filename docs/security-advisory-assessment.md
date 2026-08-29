# 依赖安全公告评估 (Dependency Security Advisory Assessment)

> 评估范围：前端生产依赖 (`npm audit --omit=dev`) 报出的 Vue / Vuetify 相关安全公告。
> 评估日期：2026-08-29
> 结论：本仓库**未发现可利用的触发路径**。唯一的高危公告（Vue 2 `parseHTML` ReDoS）在本项目当前的构建与运行方式下不可达；其余 4 条为依赖树的低危传递项。因此**不需要**执行 `npm audit fix --force`（那是破坏性的 Vue 3 迁移）。长期方案是整体迁移到 Vue 3 / Vuetify 3。

---

## 1. 审计命令与结果

```console
$ npm audit --omit=dev
# vue  2.0.0-alpha.1 - 2.7.16
# ReDoS vulnerability in vue package exploitable through inefficient regex evaluation in the parseHTML function
#   https://github.com/advisories/GHSA-5j4c-8p2g-v4jx
# fix available via `npm audit fix --force`
# Will install vue@3.5.42, which is a breaking change
# node_modules/vue
#   vue-toast-notification  <=1.0.1
#   vuetify  <=0.2.0 || ... || 3.0.0-beta.15
#   vuex  3.1.3 - 3.6.2
#   vuex-persistedstate  1.0.0 - 3.2.1
# 5 vulnerabilities (4 low, 1 high)
```

| # | 包 | 当前版本 | 公告 | 严重度 | 修复 |
|---|----|---------|------|--------|------|
| 1 | `vue` | 2.7.16 | GHSA-5j4c-8p2g-v4jx（`parseHTML` 正则 ReDoS） | **High** | `npm audit fix --force` → vue@3.5.42（破坏性） |
| 2 | `vuetify` | 2.7.2 | 依赖受影响版本的 `vue` | Low | 同上（Vue 3 迁移） |
| 3 | `vuex` | 3.1.1 | 依赖受影响版本的 `vue` | Low | 同上（Vue 3 迁移） |
| 4 | `vuex-persistedstate` | 2.7.1 | 依赖受影响版本的 `vue` | Low | 同上（Vue 3 迁移） |
| 5 | `vue-toast-notification` | 0.6.2 | 依赖受影响版本的 `vue` | Low | 同上（Vue 3 迁移） |

---

## 2. 触发路径分析

### 2.1 是否使用 `VDatePicker`？

**未使用。** 全仓库（`packages/ui/src`）检索 `VDatePicker` / `v-date-picker` / `date-picker` 均无命中。没有把日期字符串交给 `parseHTML`/模板编译的入口。

### 2.2 是否把用户可控对象传入 Vuetify 配置、主题或深度合并路径？

**否。** `packages/ui/src/plugins/vuetify.js` 中 `theme.themes`（light/dark）全部为编译期硬编码的颜色变量；唯一的动态字段是 `theme.dark`，来自 `store.state.settings.darkMode`（`DarkModeSwitch.vue` 只写入布尔值）。没有任何用户可控的**对象**进入 Vuetify 的配置/主题/深度合并路径，也没有 `deepmerge`/`Vue.use(config)` 式合并用户输入。

### 2.3 是否存在“运行期模板编译”路径，使恶意字符串进入 `parseHTML`？

**否。** 该项目对 `parseHTML` 的唯一调用来源是 Vue 2 **完整版**中的运行时模板编译器。本项目：

- 所有组件为 SFC（`.vue` 的 `<template>` 在构建期由 `vue-loader` 预编译为 render 函数）。
- 应用入口使用 `new Vue({ render: (h) => h(App), ... })`（`main.js`），不使用 `template` 字符串。
- 全仓库 `template:` 字符串选项、`Vue.compile`、`new Function`、动态模板编译均无命中。

因此运行期不会把用户提供的字符串交给 `parseHTML`，该 ReDoS 代码路径在本项目不可达。

### 2.4 已实施的小范围兼容缓解

`packages/ui/vue.config.js` 将 `runtimeCompiler: true` 改为 `runtimeCompiler: false`，使生产包使用 **Vue runtime 构建**（`vue/dist/vue.runtime.*`），不再打包完整版编译器（包含 `parseHTML`）。这样即使未来出现新的、意外把字符串注入编译器的路径，受影响代码也不在产物中。该改动与现有的“全部组件为预编译 SFC + render 函数挂载”的用法兼容。

---

## 3. 每条公告的记录（受影响依赖 / 项目内可触发路径 / 风险等级 / 缓解 / 长期方案）

### GHSA-5j4c-8p2g-v4jx —— `vue@2.7.16`（High）

- **受影响依赖与版本**：`vue@2.7.16`（范围 `2.0.0-alpha.1 - 2.7.16`）。
- **项目内可触发路径**：不可达。无 `VDatePicker`；无用户可控对象进入主题/配置深度合并；模板在构建期预编译，运行期不调用编译器。
- **当前风险等级**：**低（实际不可利用）**，尽管公告标准严重度为 High。
- **已实施缓解**：`runtimeCompiler: false`（移除编译器和 `parseHTML`）。CSP 限制 `script-src 'self'`。
- **长期升级方案**：迁移至 Vue 3（见第 4 节）。Vue 2.7 无已发布的补丁版本，唯一消除面是 Vue 3。

### `vuetify@2.7.2`、`vuex@3.1.1`、`vuex-persistedstate@2.7.1`、`vue-toast-notification@0.6.2`（Low）

- **受影响依赖与版本**：见上；均为依赖受影响 `vue` 的传递项。
- **项目内可触发路径**：无独立漏洞；风险完全继承自 `vue` 版本。
- **当前风险等级**：**低**。
- **已实施缓解**：同上（移除运行时编译器；CSP 收紧）。
- **长期升级方案**：Vue 3 迁移时同步升级为对应「Vue 3 版本」：
  - `vuetify@2` → `vuetify@3`
  - `vuex@3` → `vuex@4`
  - `vuex-persistedstate@2/3` → 兼容 Vue 3 的版本（或改由服务端会话替代前端持久化）
  - `vue-toast-notification` → 可选替换为 Vue 3 兼容的 toast 库

---

## 4. Vue 3 / Vuetify 3 迁移计划（本任务不执行）

> 说明：以下是规划，**本次不实施**整体迁移。

### 4.1 目标版本
| 依赖 | 当前 | 目标 |
|------|------|------|
| vue | 2.7.16 | 3.5.x |
| vuetify | 2.7.2 | 3.x |
| vue-router | 3.6.5 | 4.x |
| vuex | 3.1.1 | 4.x |
| @vue/cli-service | 5.0.9 | Vite（`@vitejs/plugin-vue`）或继续 CLI 5 的 Vue3 模版 |
| vue-template-compiler | 2.7.16 | （由 Vue3 SFC 编译器替代） |

### 4.2 分阶段步骤
1. **建基线**：确认 UI/服务端在 Node 22 下可 `npm ci` + `npm run ui:build` + `server:test` 全绿。
2. **构建链**：引入 Vite（或 Vue 3 CLI 模版），替换 `vue-cli-service`；把 `eslint` 升级到 8+/9+ 并修复当前 5.x 配置（`ecmaVersion` 兼容）。
3. **`main.js`**：`new Vue(...)` → `createApp(App)`；`Vue.use(Vuetify)` → `app.use(vuetify)`；`Vue.prototype.$X` → `app.config.globalProperties.$X`。
4. **组件**：Vuetify 2 组件用法迁移到 Vuetify 3；`v-data-table`、`v-file-input`、弹窗/菜单 API 等差异较大，需逐项替换；检查 `.sync` 修饰符 → `v-model:prop`。
5. **路由/状态**：`vue-router@4`（`createRouter`/`createWebHistory`）、`vuex@4`（`createStore`）。
6. **类型/响应式**：`Vue.observable`、`this.$set`/`$delete` 等废弃 API 替换；`defineComponent` 重构（可选）。
7. **PWA/构建**：`@vue/cli-plugin-pwa` → `vite-plugin-pwa`；核对 `public/manifest.json` 与 `service-worker.js`。
8. **回归**：逐页回归（登录、服务器列表、文件管理、快照、用户/权限、日志、控制台），并在 Node 22 跑 `server:test`、`ui:build`、`server:build` 与 Docker 构建。
9. **依赖审计**：迁移后重跑 `npm audit --omit=dev`，应消除低危传递项；升级前逐项确认不破坏 Node 22 兼容性，**不要盲目 `npm audit fix --force`**。

### 4.3 风险与注意
- Vuetify 2 → 3 为破坏性变更，UI 组件迁移工作量最大，需按业务页面分批过渡。
- 保持服务端会话/票据架构不变（服务端不依赖 Vue 版本）。
- 迁移期间不建议启用 `npm audit fix --force`（会整体替换为 Vue 3，无法回退）。

---

## 5. 结论

- 未发现可利用的触发路径：无 `VDatePicker`、无用户对象进主题/深度合并、无运行期模板编译。
- 已通过 `runtimeCompiler: false` 移除运行时编译器，作为对 GHSA-5j4c-8p2g-v4jx 的纵深防御。
- 不执行 `npm audit fix --force`；长期按第 4 节迁移到 Vue 3 / Vuetify 3。
