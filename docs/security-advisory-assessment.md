# 依赖安全公告评估 (Dependency Security Advisory Assessment)

> 评估范围：前端生产依赖 (`npm audit --omit=dev`) 暴露的 Vue / Vuetify 相关安全公告。
> 评估日期：2026-08-29

**重要**：`npm audit --omit=dev` 的汇总（当前输出为 `1 high, 4 low`）是**按包聚合**的结果，并不代表“只有一条公告”。实际需要跟踪的公告包含下列多条，其中 `High` 并非只有 Vue 的一条。

---

## 1. 需要跟踪的公告清单

| 公告 | 受影响包与范围 | 严重度 | CVSS | npm 是否已标记 |
|------|---------------|--------|------|---------------|
| Vue ReDoS（`parseHTML`） | `vue` 2.0.0-alpha.1–2.7.16（当前 2.7.16） | **Low** | **3.7** | 是（作为 `vue` 包的聚合项） |
| Vuetify 原型污染 | `vuetify` 2.x（当前 2.7.2） | **High** | **8.6** | 本地 DB 暂未单独列出 |
| Vuetify VDatePicker XSS | `vuetify` 2.x（当前 2.7.2） | **Moderate** | — | （VDatePicker 相关） |

公告标识（供核对）：
- Vue ReDoS: [CVE-2024-9506](https://dependabot.ecosyste.ms/advisories/CVE-2024-9506) / GHSA-5j4c-8p2g-v4jx
- Vuetify 原型污染: [CVE-2025-8083](https://dependabot.ecosyste.ms/advisories/CVE-2025-8083?state=merged) / GHSA-3jp5-5f8r-q2wg
- Vuetify VDatePicker XSS: [CVE-2025-8082](https://dependabot.ecosyste.ms/advisories/CVE-2025-8082?state=closed) / GHSA-9w3x-85mw-4fwm

> 说明：本机 `npm audit --omit=dev`（其内置公告数据库）目前仅直接列出 Vue ReDoS 及其 4 条低危传递项（`vuetify`、`vuex`、`vuex-persistedstate`、`vue-toast-notification`）。Vuetify 原型污染与 VDatePicker XSS 是较新的公告，未能在本机 audit 输出中单独列出，因此需要人工以本清单为准进行跟踪与生效管理。

---

## 2. 逐条分析

### 2.1 Vue ReDoS（`parseHTML`）—— Low / CVSS 3.7

- **受影响依赖和版本**：`vue@2.7.16`（范围 2.0.0-alpha.1–2.7.16）。
- **项目内可触发路径**：不可达。
  - 全部组件为 `.vue` SFC，`<template>` 在构建期由 `vue-loader` 预编译为 render 函数。
  - 应用入口 `new Vue({ render: (h) => h(App), ... })`，不使用 `template` 字符串。
  - 全仓库无 `template:` 字符串选项、`Vue.compile`、`new Function`。
  - 结论：运行期不会把用户提供的字符串交给 `parseHTML`。
- **当前风险等级**：**低**（公告标准严重度为 Low / CVSS 3.7；项目内不可达，进一步降低）。
- **已实施缓解**：`runtimeCompiler: false`（`vue.config.js`）改用 Vue runtime 构建，把含 `parseHTML` 的完整版编译器从产物中移除——这是**有效**缓解。此外 CSP 限制 `script-src 'self'`。
- **长期升级方案**：随 Vue 3 迁移消除（Vue 2.7 无已发布补丁，唯一面是 Vue 3）。

### 2.2 Vuetify 原型污染 —— High / CVSS 8.6

- **受影响依赖和版本**：`vuetify@2.7.2`（Vuetify 2.x）。
- **是否受 `runtimeCompiler: false` 缓解**：**否**。该缓解只移除 Vue 的运行时模板编译器，与 Vuetify 内部的对象/选项深合并无关。
- **检索范围（评审已覆盖）**：`packages/ui/src/plugins/vuetify.js`、`packages/ui/src/store/modules/settings.js`、所有 `Vue.use(...)` / `new Vuetify(...)` 调用、所有把**对象**作为 props 传给 Vuetify 组件的调用、以及任何 `deepmerge`/`merge` 用户对象的代码。
- **可能触发 API**：`Vue.use(Vuetify, config)` / `new Vuetify(config)` 中对 `theme`/`options` 的深合并；Vuetify 内部对组件 options 或全局配置做 `deepmerge` 的路径。
- **当前是否存在用户可控对象流入**：**未发现**。
  - `plugins/vuetify.js` 中 `theme.themes` 全部为编译期硬编码颜色；唯一动态字段是 `theme.dark`（`DarkModeSwitch.vue` 只写入布尔值）。
  - 无任何 `Vue.use(Vuetify, <用户对象>)` 或把用户对象作为 Vuetify 全局配置传入的代码。
  - 组件仅向 Vuetify 组件传入数据值（字符串/数字/布尔/数组），未发现把用户可控**对象**传给可深合并配置的路径。
- **风险接受结论**：由于**无法完全证明** Vuetify 内部不会对某个组件 prop 或选项做对象深合并，本项结论记为 **“暂未发现触发路径，保留升级要求”**，**不**写为“实际不可利用”。
- **风险接受期限**：本公告为 High / CVSS 8.6。在**不超过 90 天**（或下一个发布周期）内完成 Vuetify 3 / Vue 3 迁移或升级到已修复的 Vuetify 版本；在该期限前，**不接受**任何把用户可控对象传入 Vuetify 配置/主题/options 的改动，并在代码评审中把“新增 Vuetify 全局配置”列为禁止项。

### 2.3 Vuetify VDatePicker XSS —— Moderate

- **受影响依赖和版本**：`vuetify@2.7.2`（Vuetify 2.x 的 `VDatePicker` 组件）。
- **项目内可触发路径**：**不可达**。全仓库检索 `VDatePicker` / `v-date-picker` / `date-picker` 均无命中，未使用该组件。
- **当前风险等级**：**低**（公告标准严重度为 Moderate；项目内组件未使用，不可达）。
- **已实施缓解**：未使用该组件即为缓解；不引入 `VDatePicker`，或迁移期直接采用 Vue 3/Vuetify 3 中已修复的版本。
- **长期升级方案**：随 Vue 3/Vuetify 3 迁移一并消除；若临时确需日期选择器，改用无公告依赖或独立实现。

### 2.4 其它

- `vuex@3.1.1`、`vuex-persistedstate@2.7.1`、`vue-toast-notification@0.6.2`：这些是“依赖受影响 `vue` 版本”的**低危传递项**，无独立漏洞；风险完全继承自 `vue`。长期随 Vue 3 迁移升级为对应 Vue 3 版本（`vuex@4`、兼容 Vue 3 的 persisted-state、Vue 3 兼容 toast 库）。

---

## 3. `runtimeCompiler: false` 的作用边界

- **有效**：移除 Vue 完整版编译器（含 `parseHTML`），对 **Vue ReDoS（Low / CVSS 3.7）** 形成有效缓解。
- **无效**：对 **Vuetify 原型污染（High / CVSS 8.6）** 与 **Vuetify VDatePicker XSS（Moderate）** 无效——这些公告来自 Vuetify 内部，与本项构建配置无关。

---

## 4. 依赖审计状态与风险接受

- `npm audit --omit=dev` 仍会因没有一个“非破坏性”修复而返回**非零**（Vuetify 2 公告无兼容修复；`npm audit fix --force` 会整体替换为 Vue 3，属破坏性）。
- 不对该非零结果执行 `npm audit fix --force`。
- 该非零结果**通过书面风险接受处理**，但**不能**被表述为“没有 High”——其中 **Vuetify 原型污染为 High / CVSS 8.6**，且尚未完全证明不可达，需按第 2.2 节的风险接受期限与升级要求执行。
- **既有风险接受仅覆盖 §1 已列条目**：上述“已接受”表述只对本文档 §1 已登记的公告（Vue ReDoS、Vuetify 原型污染、Vuetify VDatePicker XSS、4 条低危传递项）生效。**任何新出现的 High/Critical**（即使与既有项同包同根因）**不在既有风险接受范围内**，必须按 `docs/security-tracker.md` §7 新增跟踪任务、登记负责人/截止日期并升级为 P0，不得被本节“已接受”表述自动覆盖。

---

## 5. Vue 3 / Vuetify 3 迁移计划（本任务不执行）

| 依赖 | 当前 | 目标 |
|------|------|------|
| vue | 2.7.16 | 3.5.x |
| vuetify | 2.7.2 | 3.x（修复 2.x 公告 + VDatePicker XSS） |
| vue-router | 3.6.5 | 4.x |
| vuex | 3.1.1 | 4.x |
| @vue/cli-service | 5.0.9 | Vite（或 Vue 3 构建链路） |
| vue-template-compiler | 2.7.16 | Vue 3 SFC 编译器替代 |

分阶段：
1. 在 Node 22 下建立 `npm ci` + `ui:build` + `server:test` 全绿基线（当前本机本地依赖树存在 `to-regex`/eslint 版本问题，需在干净 CI 验证）。
2. 构建链：Vite 化，升级 eslint，修复当前 `ecmaVersion`/版本冲突。
3. `main.js`：`createApp`/`app.use`/`app.config.globalProperties` 迁移。
4. 组件：Vuetify 2 → 3 逐项迁移（`v-data-table`、`v-file-input`、弹窗/菜单等差异较大）。
5. 路由/状态：`vue-router@4`、`vuex@4`。
6. PWA/构建：`vite-plugin-pwa`，核对 `manifest.json`/`service-worker.js`。
7. 回归：逐页回归 + `server:test` + `ui:build` + `server:build` + Docker。
8. 迁移后重跑 `npm audit --omit=dev`，应消除低危传递项与 Vuetify 2 公告；升级前逐项确认不破坏 Node 22 兼容性，**不要盲目 `npm audit fix --force`**。

风险与注意：Vuetify 2 → 3 为破坏性变更；服务端会话/票据架构不依赖 Vue 版本，可保持不变；迁移期间不接受把用户对象传入 Vuetify 配置（见 2.2 风险接受期限）。

---

## 6. 结论

- **Vue ReDoS**：Low / CVSS 3.7，项目内不可达；`runtimeCompiler: false` 为有效缓解。
- **Vuetify 原型污染**：High / CVSS 8.6，**暂未发现触发路径，保留升级要求**；按 90 天风险接受期限与逐条保护措施执行，未写为“实际不可利用”。
- **Vuetify VDatePicker XSS**：Moderate，当前未使用 VDatePicker，路径不可达。
- **npm 汇总**：“1 high、4 low”是按包聚合结果，不代表只有一条公告；High 中包含 Vuetify 原型污染。
- **不执行** `npm audit fix --force`；非零 audit 结果以书面风险接受处理，不误报为“没有 High”。
