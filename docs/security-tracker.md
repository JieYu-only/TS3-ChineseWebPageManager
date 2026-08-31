# 依赖安全跟踪 (Dependency Security Tracker)

> 用于跟踪无法立即修复、需按风险接受管理的高危依赖公告。审计命令与风险评估见
> `docs/security-advisory-assessment.md`；生产配置见 `docs/production-deployment.md`。
> 当前跟踪基线：Vuetify 2 高危公告（**针对 `master` / Vue 2 基线**）。
> 本表具名负责人/复核人已确认接受（§1.1）；Vue 3 / Vuetify 3 迁移已拆为带负责人与截止日期的独立任务（§6）；期中/期末复核点见 §5。
>
> **迁移分支（当前候选 `58914fa`）状态：** 当前候选生产依赖树为 Vue `3.5.42` / Vuetify
> `3.13.2`，`npm audit --omit=dev` = **0 vulnerabilities**，已无 Vue 2/Vuetify 2 包。
> 因此本表 §1 所跟踪的 Vuetify 2 原型污染 High、Vue ReDoS（Vue 2）Low 与 VDatePicker
> XSS（Vuetify 2）等公告，**在迁移分支生产树中不再适用**（§7 的“已接受清单”随迁移
> 分支生产树消除，见下方 §8 说明）。`master`/Vue 2 基线仍须按原跟踪继续。
> **注意：此“消除”仅指依赖与生产树层面；当前候选的真实环境门禁仍未执行，发布结论以
> `docs/release-readiness.md` §6 为准（NOT RELEASE READY）。**

---

## 1. 跟踪任务

| 任务 | 负责人 | 复核人 | 确认日期 | 截止日期 | 状态 | 处理计划 |
|------|--------|--------|---------|---------|------|---------|
| Vuetify 原型污染（CVE-2025-8083 / GHSA-3jp5-5f8r-q2wg，High / CVSS 8.6） | **jieyu** | **jieyu** | **2026-08-30** | **2026-11-27**（≤90 天，不晚于风险评估期限） | **Open / In progress（已接受，跟进中）** | ① 出现可兼容修复版本时**提前升级**（不等待截止）；② 完成 Vuetify 3 / Vue 3 迁移里程碑（见 §5、§6）；③ 迁移完成前，按 §2 迁移前禁止项禁止用户可控对象进入 Vuetify 配置/主题/options、禁止引入 VDatePicker、禁止 `npm audit fix --force`；④ 每次 CI/定期 `npm audit --omit=dev` 后更新本表状态（§3） |

> **负责人接受确认**：本表“负责人/复核人”已由**具名成员**确认接受，并于 **2026-08-30** 登记（见 §1.1）。截止日期不晚于 `docs/security-advisory-assessment.md` 记录的风险接受期限（90 天）。

### 1.1 接受确认登记（已由具名成员填写）

| 角色 | 具名成员 | 确认日期 | 签名/备注 |
|------|---------|---------|----------|
| 负责人 | **jieyu** | **2026-08-30** | 已确认接受；负责在期限内完成迁移/升级（见 §6），并在每次审计后更新状态 |
| 复核人 | **jieyu** | **2026-08-30** | 已确认接受；负责在发布审批前复核状态、证据与“新 High/Critical 不被既有风险接受覆盖”的规则（§3、§7） |

> 说明：本文档同时提供角色/团队标识作为兜底，但**正式发布前必须以具名成员为准**（当前已登记为 jieyu，本表无“待填写”占位）。

---

## 3. CI / 定期审计（含“不符即新增跟踪任务”规则）

- 仓库 CI 已在 `.github/workflows/ci.yml` 新增 `dependency-audit` 任务：每次运行 `npm audit --omit=dev` 并把报告作为 artifact 上传。
- **审计报告与跟踪任务的关联**：`dependency-audit` 生成的 `npm-audit-report.json` artifact（名称 `npm-audit-report`）即本跟踪任务（§1 首行，Vuetify 原型污染）在 CI 侧的**审计证据**。每次运行后，负责人（jieyu）须对照报告更新 §1 状态，并把本次审计结果与 §6 迁移进度一并回填。
- **非零结果不得被隐藏**：CI 会完整打印审计输出并生成 `npm-audit-report.json` 工件；该结果必须与 `docs/security-advisory-assessment.md` 的风险接受对照审核。本表目前**已接受**的 High（Vuetify 原型污染）与 Low（Vue ReDoS 及 4 条低危传递项）以 §7 的“已接受清单”为准。
- **“不符即新增跟踪任务”**：每次审计若发现**既有已接受清单之外**的新 **High / Critical** 漏洞，**不得**沿用既有“已接受风险”的笼统表述自动覆盖；必须立即新增一条 §1 跟踪任务，登记负责人/复核人/截止日期/处理计划，并升级为 P0 优先项。只有经评估确认其与已接受项目符、且被明确纳入 §7 清单后，才算“已接受”。
- 出现**可兼容修复版本**时优先升级，并同步更新本跟踪表。

---

## 2. 迁移前禁止项（Review Rule / 代码评审规范）

迁移完成前，**禁止**以下做法，除非已经过原型污染专项审查 / 风险管理复核：

1. **禁止**把用户可控对象传入 Vuetify：
   - `Vue.use(Vuetify, <config>)` / `new Vuetify(<config>)` 的第二个参数；
   - Vuetify 的 `theme` / `themes` / `options`（`plugins/vuetify.js`）；
   - 任何会在 Vuetify 内部被深度合并（`deepmerge`）的配置对象 prop；
   - 把用户提交的对象直接作为 `$vuetify` 全局配置、主题或样式数据源。
2. **禁止引入 `VDatePicker`**（`VDatePicker` / `v-date-picker` / `date-picker`）：该组件在 Vuetify 2 存在 Moderate 的 XSS 公告（CVE-2025-8082 / GHSA-9w3x-85mw-4fwm）。当前项目未使用，迁移前**不得新增**；若临时确需日期选择器，改用无公告依赖或独立实现（见 `docs/security-advisory-assessment.md` §2.3）。
3. **禁止直接执行 `npm audit fix --force`**：该命令会整体替换为 Vue 3 生态，属破坏性迁移。任何依赖升级都必须走 §6 的迁移任务流程，先经分支/里程碑验证，不得用 `--force` 盲改。

评审扣分项 / 拦截条件：新增或修改 `plugins/vuetify.js`、`store/modules/settings.js`，向 Vuetify 组件传入可能触发深合并的**对象**，或引入任何日期选择器组件时，必须进行原型污染/XSS 复核（确认对象字段为固定白名单、无 `__proto__` / `constructor` / `prototype` 键、无原型污染注入面、无未审计的 VDatePicker）。

> 说明：`runtimeCompiler: false` 仅缓解 Vue ReDoS（Low / CVSS 3.7），**对 Vuetify 原型污染无效**，也与 VDatePicker XSS 无关。

---

## 5. 里程碑与复习（两个时间点）

本表设置两个强制的复核/交付时间点，用于对 §1 风险与 §6 迁移进度做**定期、可追溯**的复核：

| 时间点 | 动作 | 达成判定 |
|--------|------|---------|
| **2026-10-27** | **中期复核**：负责人（jieyu）与复核人（jieyu）对 §6 前 4 项任务（测试基线、插件替换、通信解耦、迁移分支）逐项核对产出；重跑 `npm audit --omit=dev` 并更新 §1 状态；若任一前 4 项任务未完成，须在跟踪表记录偏差与补救计划。 | §6 前 4 项任务全部 completed，§1 状态更新，审计报告与 §6 进度共同归档 |
| **2026-11-27** | **完成升级或正式重新评估风险**：完成 Vue 3 / Vuetify 3 迁移或升级到已修复 Vuetify 版本，并重跑 `npm audit --omit=dev` 确认 Vuetify 2 公告消除；若无法完成，则必须以此日期为准**正式重新评估**既有风险接受是否仍然成立，并形成书面结论。 | `npm audit --omit=dev` 不再暴露 Vuetify 2 公告，或重新评估结论已签名归档 |

- **到期提醒**：为负责人设置日历/提醒（建议由复核人在 **2026-10-27** 中期复核前主动提醒）；每次 `dependency-audit` 运行后由负责人更新状态；临近截止自动升级为 P0 优先项。
- **升级优先**：出现**可兼容修复版本**时立即升级并更新本表，不等截止日期。

---

## 6. Vue 3 / Vuetify 3 迁移——带负责人与截止日期的独立任务

> 说明：**整体迁移**仍按 `docs/vue3-migration-assessment.md` 的分阶段路线执行，但本表把 P0-1 要求的 6 个动作拆为**独立任务**，逐项登记负责人、截止日期、验收产出。默认负责人/复核人均为 **jieyu**（前端负责人 / 安全复核人）。

| # | 迁移阶段任务 | 负责人 | 复核人 | 截止日期 | 产出 / 验收 |
|---|-------------|--------|--------|---------|-------------|
| 1 | 建立前端关键路径测试（**completed 2026-08-31**） | jieyu | jieyu | **2026-09-18** | Playwright 已覆盖登录成功/失败、未登录拦截、会话恢复、服务器列表、频道树、文件入口、日志和移动端布局；已绑定 CI 并保留失败报告 artifact |
| 2 | 替换 Vue 2-only 插件 | jieyu | jieyu | **2026-09-30** | 替换 `v-clipboard` / `vue-toast-notification` / `vuex-persistedstate` 三个 Vue 2-only 插件为 Vue 3 兼容方案，插件层先接近 Vue 3 生态 |
| 3 | 将 API、Socket 通信从组件解耦 | jieyu | jieyu | **2026-10-10** | `src/api` 与 socket 通信层从组件解耦（见 `docs/vue3-migration-assessment.md` 阶段 1），迁移期少改业务逻辑 |
| 4 | 创建 Vue 3 / Vite / Vuetify 3 迁移分支 | jieyu | jieyu | **2026-10-20** | 在独立分支/里程碑引入 Vue 3 + Vuetify 3 + Vite 构建链（`createApp`/`createVuetify`/`createRouter`），守护 `master` 与生产稳定 |
| 5 | 迁移表格、树、下拉框等高风险组件 | jieyu | jieyu | **2026-11-10** | `v-data-table`（~10 处）、`v-autocomplete`（~14 处）、`v-treeview`（迁 labs）、`v-list-item-group`/`input-value` 等 Vuetify 2→3 API 差异组件逐项迁移 |
| 6 | 完成审计和功能回归 | jieyu | jieyu | **2026-11-27** | 全量回归（登录/服务器/频道/文件/日志/密钥/黑名单/快照/权限组/投诉/API 密钥）+ 重跑 `npm audit --omit=dev`（消除 Vuetify 2 公告）+ `server:test` / `ui:build` / `server:build` 全绿 |

> 迁移分支合并策略：任务 4–6 在独立分支进行，经 CI（`server:test` / `ui:build` / `server:build`）与关键路径测试后合入；**不接受**任何未经迁移分支验证的 `npm audit fix --force`（见 §2）。

---

## 4. Vue 3 / Vuetify 3 迁移评估

- 已启动迁移评估，静态盘点与分阶段方案见 `docs/vue3-migration-assessment.md` 与 `docs/security-advisory-assessment.md`（第 5 节）。
- 迁移分解任务（负责人 + 截止日期）见 §6。
- 本批工作**不要求完成整体迁移**；迁移完成（或升级到修复版本）后应关闭本跟踪任务（§1）并重跑 `npm audit --omit=dev`。

---

## 7. “新 High/Critical 不被既有风险接受自动覆盖”规则

为防止“既有风险接受”被误用于掩盖新的高危项，本表明确以下边界：

1. **既有风险接受仅覆盖 §1 已登记条目**：`docs/security-advisory-assessment.md` 与 `docs/release-readiness.md` 中“`npm audit --omit=dev` 非零 = 已接受风险”的表述，**只对 §1 已明确列出的条目生效**（当前为：Vuetify 原型污染 High、Vue ReDoS Low、VDatePicker XSS Moderate-未使用、4 条低危传递项）。除此之外的任何新 High/Critical **默认未接受**。
2. **不得自动覆盖**：任何新出现的 High/Critical，即使与既有接受项同包同根因，也要**新增一条 §1 跟踪任务**，登记负责人/复核人/截止日期/处理计划，并纳入 §5 复核与 §3 审计对照。
3. **不写“实际不可利用”**：沿用 `docs/security-advisory-assessment.md` §2.2 的严谨口径——未完全证明不可达的，一律记为“暂未发现触发路径，保留升级要求”，不得写成“实际不可利用”。
4. **发布门禁**：若发布前 `npm audit --omit=dev` 出现**既有清单之外的新 High/Critical**，视为发布阻塞项（见 `docs/release-readiness.md`），按 P0 处理；只有完成评审、登记并纳入 §7 清单后方可继续。

---

## 8. 迁移分支（当前候选）风险接受项关闭/替换记录

> 日期 2026-09-01。本记录仅针对迁移分支当前候选（`58914fa`，Vue 3 / Vuetify 3 /
> Vite），基于对本工作区生产依赖树与 `npm audit --omit=dev` 的**实际复核**，不沿用历史
> 通过/制品结论。`master` / Vue 2 基线的 §1 跟踪与 §7 已接受清单**不变**，仍须按其原
> 计划跟进。

| 原跟踪公告 | 原风险接受 | 迁移分支当前候选的实际证据 | 结论 |
|------------|------------|------------------------------|------|
| Vuetify 原型污染（CVE-2025-8083，Vuetify 2 / High） | 已接受，保留升级要求 | 生产树为 Vuetify **3.13.2**；`npm audit --omit=dev` = 0；`npm ls vue@2 vuetify@2` = empty | **已消除**（依赖层）；风险接受项记为**关闭**（原公告仅影响 Vuetify 2.x） |
| Vue ReDoS（CVE-2024-9506，Vue 2 / Low） | 已接受；`runtimeCompiler:false` 缓解 | 生产树为 Vue **3.5.42** | **已消除**（依赖层）；风险接受项记为**关闭** |
| Vuetify VDatePicker XSS（CVE-2025-8082，Vuetify 2 / Moderate） | 已接受；当前未用 `VDatePicker` | 生产树为 Vuetify **3.13.2**；未引入 `VDatePicker` | **已消除**（依赖层 + 未使用）；风险接受项记为**关闭** |
| 4 条低危传递项（vuex/vuex-persistedstate/vue-toast-notification） | 随 Vue 3 升级 | 生产树为 Pinia 2.3.1 / vue-router 4.6.4 / vue-demi；已无 vuex/Vue 2-only 插件 | **已消除**（依赖层）；随迁移完成 |

> **边界与依赖策略**：上述“关闭”指 §1 跟踪的 **Vuetify 2 / Vue 2 公告**在当前候选
> 生产树中不再适用。任何**新**出现的 High/Critical 仍按 §7“新增跟踪任务”规则处理，
> 不得因“已迁移到 Vue 3”而自动放宽。当前候选 `npm audit --omit=dev` = 0，
> **无既有清单之外的新 High/Critical**；但真实环境门禁仍未执行，发布结论以
> `docs/release-readiness.md` §6（NOT RELEASE READY）与 §7 为准。
