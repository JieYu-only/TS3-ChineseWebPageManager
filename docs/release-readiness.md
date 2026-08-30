# 发布验收记录 (Release Readiness Record)

> 针对近期发布的验收检查结果。本文件记录**在本环境实际验证**的项，以及**需要外部真实环境执行**的项。当前确定采用 **Windows 原生 EXE 部署**，Docker 不属于本次发布路径。
> 验收日期：2026-08-31。当前已验证发布候选为提交 `c857e29`，Node 22 CI、Windows artifact 与本地真实 TeamSpeak 核心链路均已有可追溯证据。

---

## 1. 版本与提交

| 项 | 值 |
|----|----|
| 应用版本 | v2.2.6 |
| 已验证发布候选 | `c857e298075738b9f937b0e05ed8b2eecf0d6e36` |
| 已验证 Node 22 基线 | `81b23cf3c4338df75cb71bb07128033bc57aff41` |
| 相关提交 | `c857e29` ci: add release artifact provenance gate · `72ef2fa` docs(security): fulfil P0 dependency risk governance and Node 22 revalidation |
| 验收时 Node / npm | **v22.23.2** / **10.9.8**（Node.js 官方 portable 运行时，`D:\node22\node-v22.23.2-win-x64`） |
| 分支 / 上游 | `master`，与 `origin/master` 同步（`git status -sb` 无 ahead/behind） |
| 本地产物 EXE（server.exe）SHA256 | `97C64BEC5011E3A8F91C74B6DB748BA86A37D7839CD4561F47E68AD7BC4B42B9`（Node 22 干净依赖环境构建） |
| 本地产物 EXE（server.exe）SHA1 | `DE9FD2F4CB05DFDCAF49C91109654A334AC19F00` |
| 本地产物 EXE 大小 | 74,952,183 字节（≈71.5 MiB） |
| Node 22 基线 CI（提交 `81b23cf`） | **成功** https://github.com/JieYu-only/TS3-ChineseWebPageManager/actions/runs/33246561158 |
| 当前候选 CI | **成功**：https://github.com/JieYu-only/TS3-ChineseWebPageManager/actions/runs/33309578780 |
| CI 审计报告 artifact | `npm-audit-report`；审计基线门禁通过（4 low + 1 accepted high + 0 critical） |
| Windows artifact | `ts3-manager-windows-x64-c857e298075738b9f937b0e05ed8b2eecf0d6e36` |
| **CI 制品 EXE SHA256** | `1ba36e020c95220f7446575c5af108d0b118b32924b0214d7e57d2c19c56e485`（实际 EXE、`.sha256`、metadata 三方一致） |
| CI 制品 EXE 大小 | 74,502,485 字节 |
| 部署方式 | **Windows 原生 EXE** |
| Docker | **不适用（N/A）**：本次发布不采用容器部署 |

> **证据边界**：上述 CI 与 Windows artifact 仅证明提交 `c857e29`。本次后续仅修改验收文档，不改变应用、依赖或构建工作流；若后续再修改运行代码、依赖或工作流，必须重新取得对应提交的 CI 与 artifact 证据。

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

> 当前候选 `c857e29` 已取得 Node v22.23.2 / npm 10.9.8 的同提交 CI、审计报告和 Windows artifact；artifact 元数据已与下载文件核对。

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

### 3.2 真实环境结果与剩余项
- ❌ HTTP→HTTPS 跳转：需真实反向代理（Nginx/Caddy）。
- ❌ 真实 `wss://` Socket.IO 建立：需真实 HTTPS 页面 + 代理。
- ❌ 日志客户端 IP 与真实地址一致：需真实代理 + `TRUSTED_PROXY_HOPS` 匹配一层/多层代理复核。
- ❌ 不直接暴露 Node 服务端口：属部署拓扑要求。
- ➖ Docker 镜像构建/运行：**不适用（N/A）**；本次发布采用 Windows 原生 EXE，Dockerfile/Compose 不作为该发布路径的验收门禁。
- ✅ 本地真实 TeamSpeak 核心端到端：Raw Query `10011`、SSH Query `10022` 登录/状态/退出、Socket.IO 连接、服务器/频道/客户端只读查询、虚拟服务器选择、remembered session 跨 EXE 重启恢复均通过。
- ✅ 真实小文件上传/下载：随机文件上传成功，下载 SHA-256 与原内容一致，远端测试文件已删除；未修改已有文件。
- ⚠️ 权限/封禁等破坏性写操作、大文件压力、主动断网/关闭目标等故障注入未在临时真实服务器执行；边界、ticket、超时和失败释放由自动化测试覆盖。详见 `docs/external-environment-validation.md`。

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

> Node 22 独立环境门禁已有历史基线；当前发布路径为 Windows 原生 EXE，因此 Docker 标记为不适用。真实 HTTPS 反向代理和真实 TeamSpeak 仍按各自状态独立验收。下表为**真实状态**，未做任何虚构。

| 任务 | 验收项 | 状态 | 原因 / 需在何处执行 |
|------|--------|------|--------------------|
| 1 | Node 22 门禁（`npm ci`/`test`/`lint`/`ui:build`/`server:build` + Windows EXE） | **通过** | `c857e29` 的 CI `33309578780` 成功；Windows artifact、SHA-256、Node/npm 元数据已核对 |
| 2 | Docker 构建/运行/重启/持久化 | **不适用（N/A）** | 已确定采用 Windows 原生 EXE 部署；若未来改为容器部署，必须重新启用并完成 Docker 全套验收 |
| 3 | 真实 HTTPS 反向代理（Nginx/Caddy）+ WSS + Origin + 代理 IP | **未执行** | 无真实管理域名/反向代理；仅 Cookie 属性与 Origin 403 有自动化测试覆盖（§3.1） |
| 4 | 真实 TeamSpeak 管理与文件传输端到端 | **核心链路通过；破坏性/压力场景未执行** | Raw/SSH、Socket只读查询、服务器选择、重启恢复、小文件上传下载与远端清理通过；其余边界由自动化覆盖 |

> 上述各项必须按 `docs/external-environment-validation.md` 在真实基础设施上执行、附证据并签名确认，本记录才能“红转绿”；部署参数说明见 `docs/production-deployment.md`。

---

## 6. 验收结论

**当前候选 CI 与 Windows artifact 已通过**：提交 `c857e29` 的 Node 22 CI成功，审计基线门禁通过；下载的 Windows artifact 已完成来源、SHA-256、元数据、启动、健康接口、主页和端口释放验证。真实 TeamSpeak核心连接、会话与小文件传输链路也已通过。

**发布验收状态：`NOT RELEASE READY`（红色）**。Docker不适用、当前候选证据与真实 TeamSpeak核心链路均已回填；真实 HTTPS/WSS/代理仍未执行。若最终部署限定为本机/可信局域网纯HTTP，需要书面标记其为受限部署且禁止公网暴露；若公网访问，则必须先完成 HTTPS/WSS验收。

- Vuetify High 风险：负责人/复核人已具名登记为 **jieyu**（`docs/security-tracker.md` §1.1，确认日期 **2026-08-30**），截止 **2026-11-27**；迁移已拆为 6 个带负责人与截止日期的独立任务（见 tracker §6）。
- **未创建版本标签 / 发布**（按指引，在环境级验收完成前不创建正式发布）。
- 验收执行：**Codex（自动化）**；环境提供与结果确认：**jieyu**；日期：2026-08-31。**最终结论：CI、Windows EXE 与真实 TeamSpeak核心链路通过；HTTPS部署决策/验收待完成，暂不建议公网发布。**
