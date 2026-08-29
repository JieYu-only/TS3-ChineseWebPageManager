# 依赖安全跟踪 (Dependency Security Tracker)

> 用于跟踪无法立即修复、需按风险接受管理的高危依赖公告。审计命令与风险评估见
> `docs/security-advisory-assessment.md`；生产配置见 `docs/production-deployment.md`。
> 当前跟踪基线：Vuetify 2 高危公告。

---

## 1. 跟踪任务

| 任务 | 负责人 | 复核人 | 截止日期 | 状态 | 处理计划 |
|------|--------|--------|---------|------|---------|
| Vuetify 原型污染（CVE-2025-8083 / GHSA-3jp5-5f8r-q2wg，High / CVSS 8.6） | 前端维护负责人（Frontend Maintenance Owner） | 安全负责人（Security Owner） | **2026-11-27**（≤90 天，不晚于风险评估期限） | **Open / In progress** | ① 出现可兼容修复版本时**提前升级**（不等待截止）；② 完成 Vuetify 3 / Vue 3 迁移里程碑（见 §5）；③ 迁移完成前，按 §2 代码评审规范禁止用户可控对象进入 Vuetify 配置/主题/options；④ 每次 CI/定期 `npm audit --omit=dev` 后更新本表状态（§3） |

> **负责人接受确认**：发布审批前，上述“负责人/复核人”必须由**具体具名成员**确认接受任务（在下方登记姓名 + 确认日期）。截止日期不得晚于 `docs/security-advisory-assessment.md` 记录的风险接受期限（90 天）。

### 1.1 接受确认登记（由具名成员填写）

| 角色 | 具名成员 | 确认日期 | 签名/备注 |
|------|---------|---------|----------|
| 负责人 | （待填写） | （待填写） | （待填写） |
| 复核人 | （待填写） | （待填写） | （待填写） |

> 说明：本文档同时提供角色/团队标识作为兜底。**正式发布前必须把“待填写”替换为具名成员并完成确认**；在此之前不得进入发布。

---

## 5. 里程碑与到期提醒

- **里程碑**：在 **2026-11-27** 前完成以下之一：
  - 升级到已修复 Vuetify 版本（优先，出现即升，不等待截止）；**或**
  - 完成 Vue 3 / Vuetify 3 迁移，并重跑 `npm audit --omit=dev` 确认 Vuetify 2 公告消除。
- **到期提醒**：为负责人设置日历/提醒（建议在 2026-10-27 前进行一次中期复核）；每次 `dependency-audit` 运行后由负责人更新状态；临近截止自动升级为 P0 优先项。
- **升级优先**：出现**可兼容修复版本**时立即升级并更新本表，不等截止日期。

---

## 2. 代码评审规范（Review Rule）

**禁止**用户可控对象进入以下路径，除非已经过原型污染专项审查：

1. `Vue.use(Vuetify, <config>)` / `new Vuetify(<config>)` 的第二个参数；
2. Vuetify 的 `theme` / `themes` / `options`（`plugins/vuetify.js`）；
3. 任何会在 Vuetify 内部被深度合并（`deepmerge`）的配置对象 prop；
4. 把用户提交的对象直接作为 `$vuetify` 全局配置、主题或样式数据源。

评审扣分项 / 拦截条件：新增或修改 `plugins/vuetify.js`、`store/modules/settings.js`，或向 Vuetify 组件传入可能触发深合并的对象时，必须进行原型污染复核（确认对象字段为固定白名单、无 `__proto__` / `constructor` / `prototype` 键、无原型污染注入面）。

> 说明：`runtimeCompiler: false` 仅缓解 Vue ReDoS（Low / CVSS 3.7），**对 Vuetify 原型污染无效**。

---

## 3. CI / 定期审计

- 仓库 CI 已在 `.github/workflows/ci.yml` 新增 `dependency-audit` 任务：每次运行 `npm audit --omit=dev` 并把报告作为 artifact 上传。
- **非零结果不得被隐藏**：CI 会完整打印审计输出并生成 `npm-audit-report.json` 工件；该结果必须与 `docs/security-advisory-assessment.md` 的风险接受对照审核，在迁移完成前视为**已接受的已知风险**对待，而不是“干净”。
- 出现**可兼容修复版本**时优先升级，并同步更新本跟踪表。

---

## 4. Vue 3 / Vuetify 3 迁移评估

- 已启动迁移评估，分阶段方案见 `docs/security-advisory-assessment.md`（第 5 节）。
- 本批工作**不要求完成整体迁移**；迁移完成（或升级到修复版本）后应关闭本跟踪任务并重跑 `npm audit --omit=dev`。
