# 发布验收记录 (Release Readiness Record)

> 针对近期发布的验收检查结果。本文件记录**在本环境实际验证**的项，以及**需要外部真实环境执行**的项（Node 22 主机、Docker、真实反向代理/HTTPS、真实 TeamSpeak）。
> 验收日期：2026-08-29

---

## 1. 版本与提交

| 项 | 值 |
|----|----|
| 应用版本 | v2.2.6 |
| Git HEAD | `ff6070ae5a0dad72b5cc1f40ead0b69c366d74ff` |
| 相关提交（本次） | `60ae7f6` chore(ci): add dependency security audit job · `ff6070a` docs(security): add deployment config, dependency tracker and release record（上一批：`4f6259a`/`c1815bb` 等） |
| 构建时主机 Node / npm | **v24.19.0** / 11.17.0（**非 Node 22**） |
| 本地产物 EXE（server.exe）SHA256 | `71927FE1A643B3ACAEF6115D7104720C5AF6CD00C8472DA4AB39826A82DB30EB`（**本机 Node24 上下文、pkg 目标 node22 构建，非 CI 制品**） |
| 本地产物 EXE（server.exe）SHA1 | `7DC8264D11F10867E0B01CE9409F5FF67F4C10B0` |
| 本地产物 EXE 大小 | 74,502,484 字节（≈71 MiB） |
| **CI 制品 EXE SHA256** | **待定**（本环境无法触发/读取 GitHub Actions 运行与下载产物，见 §6“环境验收状态”） |
| Docker 版本 | **不可用**（本环境未安装 Docker） |

> **重要**：发布候选提交**尚未推送到远程并触发 CI**（本环境无法执行 `git push` 或观测 GitHub Actions）。因此不存在“CI 运行链接、运行编号、CI 制品 EXE”。记录中的 EXE 哈希是本地 Node24 主机构建的制品，**不能作为发布候选的 CI 制品哈希**。正式发布必须用 CI 从同一发布候选提交构建的 EXE 哈希。

---

## 2. 构建/测试门禁结果（本环境，Node 24 主机、pkg 目标 Node 22）

| 命令 | 结果 |
|------|------|
| `npm test`（= server:test） | ✅ **87/87 通过** |
| `npm run lint --workspace=@ts3-manager/ui` | ✅ **通过（0 problems，eslint v8）** |
| `npm run ui:build` | ✅ **Build complete**（`runtimeCompiler: false` 生效） |
| `npm run server:build`（`pkg . --target node22`） | ✅ **成功生成 node22 EXE**（下载 node22 基础二进制并打包） |
| EXE 烟雾测试（随机端口 + 测试密钥启动） | ✅ `/api/health` 返回 **200** `{"status":"ok",...}`，`err.log` 为空，停止后监听端口计数为 **0**（无遗留进程/端口） |
| `npm ci` | ⚠️ 未执行（依赖已安装且门禁通过；避免破坏当前工具链。应于干净的 Node 22 CI 环境验证） |
| `npm audit --omit=dev` | ⚠️ **非零**（5 项：1 high + 4 low，按包聚合），见第四节风险接受 |

> Node 主版本要求（Task 1）：**主机 Node 为 v24，未满足 “Node 22”**；但生成的 EXE 由 `pkg --target node22` 构建，**内含 Node 22 运行时**，且通过独立启动 + `/api/health` 烟雾测试。需在真正的 Node 22 主机/CI 上按下方命令重跑以完成“Node 主版本必须为 22”的验收。

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
| Vuetify 原型污染（CVE-2025-8083 / GHSA-3jp5-5f8r-q2wg） | High / CVSS 8.6 | 已接受（暂未发现触发路径，保留升级要求）；见 `docs/security-tracker.md` | **2026-11-27** |
| Vue ReDoS（CVE-2024-9506 / GHSA-5j4c-8p2g-v4jx） | Low / CVSS 3.7 | 已接受；`runtimeCompiler: false` 缓解 | 随 Vue 3 迁移 |
| 主机 Node 版本非 22（本环境） | — | 需在 Node 22 主机重跑门禁 | 发布前 |
| `npm audit --omit=dev` 非零 | — | 已接受，属已知/已接受风险；CI `dependency-audit` 会上传报告并对照风险接受文档 | 迁移完成前 |

- `npm audit --omit=dev` 非零**不视为“干净”**：其中 High 含 Vuetify 原型污染，需按 `docs/security-tracker.md` 的负责人/截止日期跟踪，不允许误报为“没有 High”。
- **不执行 `npm audit fix --force`**（破坏性 Vue 3 迁移）。

---

## 5. 环境级验收状态（本批任务）

> 本批要求的环境级验证（Node 22 CI、Docker、真实 HTTPS 反向代理、真实 TeamSpeak）**未能在本环境执行**，因为这些基础设施在本沙箱中不可用。下表为**真实状态**，未做任何虚构。

| 任务 | 验收项 | 状态 | 原因 / 需在何处执行 |
|------|--------|------|--------------------|
| 1 | Node 22 CI 门禁（`npm ci`/`test`/`lint`/`ui:build`/`server:build` + Windows EXE） | **未执行** | 本机 Node 为 v24（非 22）；无法触及 GitHub Actions 运行/产物；需在 GitHub Actions 或独立 Node 22 主机运行并回填 CI 链接、运行号、提交 SHA、CI 制品 EXE SHA256 |
| 2 | Docker 构建/运行/重启/持久化 | **未执行** | 本环境未安装 Docker（`docker` 命令不可用）；需在 Docker Engine/Desktop 测试主机执行 |
| 3 | 真实 HTTPS 反向代理（Nginx/Caddy）+ WSS + Origin + 代理 IP | **未执行** | 无真实管理域名/反向代理；仅 Cookie 属性与 Origin 403 有自动化测试覆盖（§3.1） |
| 4 | 真实 TeamSpeak 管理与文件传输端到端 | **未执行** | 无真实 TeamSpeak 实例/测试账号 |

> 上述各项在 `docs/production-deployment.md` 给出配置清单。**必须由部署/运维在真实基础设施上执行、回填结果并签名确认**，本记录才能从红转绿。

---

## 6. 验收结论

**本环境（自动可验证项）全部通过**：服务端测试 **87/87**、前端 lint **0 问题**、UI 生产构建通过、Node 22（pkg 目标）EXE 构建并独立启动通过 `/api/health`、Cookie 属性与 Origin 403 通过自动化测试。

**发布验收状态：`NOT RELEASE READY`（红色）**。环境级验收项（Node 22 CI、Docker、真实 HTTPS/代理、真实 TeamSpeak）均**未执行**，且发布候选提交**尚未推送触发 CI、没有 CI 制品哈希**。这些必须先在真实基础设施上完成并回填本记录，形成可追溯证据（CI 链接/运行号/提交 SHA、CI EXE SHA256、镜像 ID/摘要、HTTPS/WSS/代理 IP 结果、TeamSpeak 回归结果）。

- Vuetify High 风险：负责人/复核人已登记为团队/角色标识，**具名成员须在 `docs/security-tracker.md` 完成接受确认**（截止 **2026-11-27**）。
- **未创建版本标签 / 发布**（按指引，在环境级验收完成前不创建正式发布）。
- 验收人：**待指派**（发布审批前落实，并签名）。日期：2026-08-29。**最终结论：环境级验收未完成，不建议发布。**
