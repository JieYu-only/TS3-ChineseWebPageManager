# 发布验收记录 (Release Readiness Record)

> 针对近期发布的验收检查结果。本文件记录**在本环境实际验证**的项，以及**需要外部真实环境执行**的项（Docker、真实反向代理/HTTPS、真实 TeamSpeak）。
> 验收日期：2026-08-30。Node 22 基线来自提交 `81b23cf`；当前候选基线为 `72ef2fa`，尚待推送后取得同提交 CI 证据。

---

## 1. 版本与提交

| 项 | 值 |
|----|----|
| 应用版本 | v2.2.6 |
| 当前候选基线 | `72ef2fa8c8404144c4bd3291a3a9cd8bce85bd31`（本次 CI/文档改动提交后须替换为最终提交 SHA） |
| 已验证 Node 22 基线 | `81b23cf3c4338df75cb71bb07128033bc57aff41` |
| 相关提交 | `72ef2fa` docs(security): fulfil P0 dependency risk governance and Node 22 revalidation · `81b23cf` docs: update security deployment and release validation |
| 验收时 Node / npm | **v22.23.2** / **10.9.8**（Node.js 官方 portable 运行时，`D:\node22\node-v22.23.2-win-x64`） |
| 分支 / 上游 | `master`，与 `origin/master` 同步（`git status -sb` 无 ahead/behind） |
| 本地产物 EXE（server.exe）SHA256 | `97C64BEC5011E3A8F91C74B6DB748BA86A37D7839CD4561F47E68AD7BC4B42B9`（Node 22 干净依赖环境构建） |
| 本地产物 EXE（server.exe）SHA1 | `DE9FD2F4CB05DFDCAF49C91109654A334AC19F00` |
| 本地产物 EXE 大小 | 74,952,183 字节（≈71.5 MiB） |
| Node 22 基线 CI（提交 `81b23cf`） | **成功** https://github.com/JieYu-only/TS3-ChineseWebPageManager/actions/runs/33246561158 |
| 当前候选 CI | **待执行**：推送最终候选提交后回填，旧提交的成功运行不得替代 |
| CI 审计报告 artifact | `npm-audit-report`（id `9713028087`），digest `sha256:b984276476d89cf26a2ce19015e01ceabffee02442690301fee16d65783040ea` |
| **当前候选 CI 制品 EXE SHA256** | **待执行**：CI 已配置上传 `server.exe`、`server.exe.sha256` 和构建元数据；推送最终候选后下载并回填 |
| Docker 版本 | **不可用**（本环境未安装 Docker） |

> **证据边界**：`81b23cf` 的 Node 22 与 CI 结果只作为历史基线。当前候选包含其后的安全治理和 CI 改动，必须由最终提交自身的 CI 运行重新证明，不得沿用旧运行冒充当前证据。

---

## 2. 构建/测试门禁结果（Node v22.23.2 / npm 10.9.8、`npm ci` 干净依赖、pkg 目标 Node 22）

| 命令 | 结果 |
|------|------|
| `npm ci` | ✅ **通过**（Node v22.23.2 / npm 10.9.8，`added 1266 packages`，exit 0；干净安装） |
| `npm test`（= server:test） | ✅ **87/87 通过**（`# tests 87 / # pass 87 / # fail 0`，exit 0） |
| `npm run lint --workspace=@ts3-manager/ui` | ✅ **通过（0 问题，eslint v8，exit 0）** |
| `npm run ui:build` | ✅ **Build complete**（`runtimeCompiler: false` 生效；连续两次构建成功，哈希一致） |
| `npm run server:build`（`pkg . --target node22`） | ✅ **成功生成 node22 EXE**（下载 node22 基础二进制并打包，exit 0） |
| EXE 烟雾测试（随机端口 + 测试密钥启动） | ✅ `/api/health` 返回 **200** `{"status":"ok","uptime":...}`，stderr 为空，停止后端口监听计数为 **0**、`server.exe` 进程残留为 **0** |
| `npm audit --omit=dev` | ⚠️ **非零（已知/已接受）**：`5 vulnerabilities (4 low, 1 high, 0 critical)`，与 `docs/security-advisory-assessment.md` / `docs/security-tracker.md` 一致，**无既有清单之外的新 High/Critical**（见 §4） |

> Node 22 历史基线已在官方 Node.js v22.23.2 portable 运行时中完成；对应 CI 与审计 artifact 仅适用于提交 `81b23cf`。当前候选仍须取得同提交 CI 证据。

### 2.1 当前候选本地复验（2026-08-30）

- 宿主运行时为 Node v24.19.0 / npm 11.17.0，因此本节不能替代 Node 22 CI。
- `npm test`：87/87 通过；UI lint：通过；UI 生产构建连续两次成功，先前 Windows `EPERM` 未复现。
- `pkg --target node22` 成功；本地产物大小 74,952,199 字节，SHA-256 `59636A66E8BEFFA5B74BE602A1F130D8B15DA4A3A6307B9202959752E87C8BF7`。
- `npm audit --omit=dev`：4 low + 1 high + 0 critical，与 §4 已接受清单一致。
- 工作区在验收结束后保持干净。

---

## 3. 部署/安全行为验证

### 3.1 已通过测试验证（自动化覆盖）
- ✅ `/api/health` 无鉴权返回 200 `status: ok`（`server.test.js`、`security-headers.test.js`）。
- ✅ 生产模式 session cookie 含 **Secure、HttpOnly、SameSite=Strict**、Path=/（`security-headers.test.js`）。
- ✅ 非信任 Origin 的状态变更请求返回 **403**（`security-headers.test.js`）；同源放行。
- ✅ 未登录不能初始化/使用文件传输 ticket；ticket 过期/复用/跨会话/方向不匹配均被拒绝（`file-transfer.test.js`、`ticket-store.test.js`）。
- ✅ 上传超限 413、慢速超总时限被终止、失败后释放并发名额且健康检查正常。
- ✅ Socket 客户端 IP：未启用 TRUST_PROXY 时伪造 XFF 仍共享限流；启用后取可信链客户端地址；畸形回退（`ip.test.js`、`trust-proxy.test.js`）。
- ✅ remembered session 不重复计数（`session.test.js`）。

### 3.2 需要真实环境执行（本环境无法验证）
- ❌ HTTP→HTTPS 跳转：需真实反向代理（Nginx/Caddy）。
- ❌ 真实 `wss://` Socket.IO 建立：需真实 HTTPS 页面 + 代理。
- ❌ 日志客户端 IP 与真实地址一致：需真实代理 + `TRUSTED_PROXY_HOPS` 匹配一层/多层代理复核。
- ❌ 不直接暴露 Node 服务端口：属部署拓扑要求。
- ❌ Docker 镜像构建/运行：**本环境无 Docker**（`docker` 命令不可用）。
- ❌ 真实 TeamSpeak 端到端（SSH/raw 登录、保持登录、页面刷新/服务重启恢复、切换虚拟服务器、上传零字节/小文件/近上限文件、下载校验哈希、暂停/取消/断网/目标关闭、ticket 各种拒绝、413、总时限终止、失败后重试、功能回归）：需真实 TeamSpeak 服务器 + 测试账号。

> 这些项在 `docs/production-deployment.md`（第 4/5 节）给出配置与检查清单，需部署/运维在真实环境执行。

---

## 4. 已知风险与风险接受

| 风险 | 严重度 | 状态 | 截止 |
|------|--------|------|------|
| Vuetify 原型污染（CVE-2025-8083 / GHSA-3jp5-5f8r-q2wg） | High / CVSS 8.6 | 已接受（暂未发现触发路径，保留升级要求），登记为 `docs/security-tracker.md` 具名负责人 **jieyu** / 复核人 **jieyu**（确认 2026-08-30） | **2026-11-27** |
| Vue ReDoS（CVE-2024-9506 / GHSA-5j4c-8p2g-v4jx） | Low / CVSS 3.7 | 已接受；`runtimeCompiler: false` 缓解 | 随 Vue 3 迁移 |
| Vuetify VDatePicker XSS（CVE-2025-8082 / GHSA-9w3x-85mw-4fwm） | Moderate | 已接受；当前未使用 `VDatePicker`，迁移前禁止引入 | 随 Vue 3 迁移 |
| Node 22 本地门禁 + CI | — | **已完成**；CI 运行链接、运行编号、审计报告 artifact 已回填（§1） | 发布前 |
| `npm audit --omit=dev` 非零 | — | 已接受，属已知/已接受风险；CI `dependency-audit` 上传报告并对照风险接受文档 | 迁移完成前 |

- `npm audit --omit=dev` 结果：**5 项（4 low + 1 high，0 critical）**。其中 **1 high = vuetify**（原型污染 GHSA-3jp5-5f8r-q2wg，并含 VDatePicker XSS GHSA-9w3x-85mw-4fwm 与依赖 `vue` 的传递说明）；**4 low = vue**（ReDoS GHSA-5j4c-8p2g-v4jx）**、vue-toast-notification、vuex、vuex-persistedstate**。与 `docs/security-advisory-assessment.md` §1 清单一一对应。
- **无既有清单之外的新 High/Critical**：本次审计未触发 `docs/security-tracker.md` §7 的“新增跟踪任务/停止发布”规则。
- 该非零**不视为“干净”**：其中 High（Vuetify 原型污染）按 `docs/security-tracker.md` 的负责人/截止日期跟踪，不允许误报为“没有 High”。
- **不执行 `npm audit fix --force`**（破坏性 Vue 3 迁移）。

---

## 5. 环境级验收状态（本批 P0 任务）

> Node 22 独立环境门禁已在本机完成，且 CI 运行与审计报告 artifact 已回填；Docker、真实 HTTPS 反向代理和真实 TeamSpeak 仍依赖外部基础设施。下表为**真实状态**，未做任何虚构。

| 任务 | 验收项 | 状态 | 原因 / 需在何处执行 |
|------|--------|------|--------------------|
| 1 | Node 22 门禁（`npm ci`/`test`/`lint`/`ui:build`/`server:build` + Windows EXE） | **历史基线通过；当前候选 CI 待执行** | `81b23cf` 的 Node 22 基线通过；当前候选本地复验通过，但必须由最终提交自身的 Node 22 CI、审计报告和 Windows artifact 重新证明 |
| 2 | Docker 构建/运行/重启/持久化 | **未执行** | 本环境未安装 Docker（`docker` 命令不可用）；需在 Docker Engine/Desktop 测试主机执行 |
| 3 | 真实 HTTPS 反向代理（Nginx/Caddy）+ WSS + Origin + 代理 IP | **未执行** | 无真实管理域名/反向代理；仅 Cookie 属性与 Origin 403 有自动化测试覆盖（§3.1） |
| 4 | 真实 TeamSpeak 管理与文件传输端到端 | **未执行** | 无真实 TeamSpeak 实例/测试账号 |

> 上述各项必须按 `docs/external-environment-validation.md` 在真实基础设施上执行、附证据并签名确认，本记录才能“红转绿”；部署参数说明见 `docs/production-deployment.md`。

---

## 6. 验收结论

**历史 Node 22 基线通过，当前候选本地门禁通过但 CI 待重跑**：提交 `81b23cf` 已有 Node 22 与 CI 证据；当前候选本地复验为服务端测试 **87/87**、前端 lint **0 问题**、UI 连续两次构建成功、Node 22 目标 EXE 成功生成，审计结果仍为已知/已接受。最终候选提交必须取得自身的 Node 22 CI、审计报告和 Windows EXE artifact 后，才能关闭当前候选 CI 项。

**发布验收状态：`NOT RELEASE READY`（红色）**。当前候选 CI 尚待推送后执行；Docker、真实 HTTPS/代理、真实 TeamSpeak 也仍未执行。须取得最终提交自身的 CI artifact，并在真实基础设施上完成和回填环境验收，才能改为可发布。

- Vuetify High 风险：负责人/复核人已具名登记为 **jieyu**（`docs/security-tracker.md` §1.1，确认日期 **2026-08-30**），截止 **2026-11-27**；迁移已拆为 6 个带负责人与截止日期的独立任务（见 tracker §6）。
- **未创建版本标签 / 发布**（按指引，在环境级验收完成前不创建正式发布）。
- 验收人：**jieyu（本环境 Node 22 复验执行人）**，日期：2026-08-30。**最终结论：本地/CI 门禁通过；环境级验收未完成（真实基础设施项待执行），暂不建议发布。**
