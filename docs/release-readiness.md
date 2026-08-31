# 发布验收记录 (Release Readiness Record)

> 本文件记录**在本环境实际验证**的项，以及**需要外部真实环境执行**的项。当前发布方式
> 确定采用 **Windows 原生 EXE 部署**，Docker 不属于本次发布路径。
>
> **本文件当前对象 = Vue 3 / Vuetify 3 / Vite 迁移候选**：分支
> `codex/vue3-migration`，HEAD `58914fa7d85e7aaa339b2a8124abdea01c003bf8`。
> 该候选的 Stage-4 执行门禁已闭环，当前结论为 **RELEASE READY（待独立评审）**。
> 历史发布候选（`c857e29`，Vue 2 基线）的证据
> 仅作为历史参照，**不构成本候选的发布证据**（见 §7）。

---

## 1. 版本与提交（当前候选）

| 项 | 值 |
|----|----|
| 应用版本 | v2.2.6 |
| 当前验证候选 | `58914fa7d85e7aaa339b2a8124abdea01c003bf8`（迁移分支 `codex/vue3-migration`） |
| 验收时 Node / npm | 宿主 **v24.19.0** / **11.17.0**（主工作区）；Node 22 干净 `npm ci` 已在隔离候选副本用官方 **v22.23.2** / **10.9.8** 完成（见 §2.1） |
| 分支 / 上游 | `codex/vue3-migration`（发布路径为迁移分支，**不**指向 `master`） |
| 工作区状态 | `git status --porcelain` = **95 项**（**90 个已跟踪改动 + 5 个未跟踪项**，为清理 `tmp-node22-final/` 与 `tmp-node22-final.zip` 之后的实测值）；`.ai/` 文件受忽略规则影响，不计入该计数 |
| 本地产物 EXE（server.exe）SHA256 | `BB42ED3D8E8050FB679ACB95CB57E79F6A7090C146F8562017D541D688DA4B8C`（最终候选重建） |
| 本地产物 EXE 大小 | 72,397,111 字节（≈69.0 MiB） |
| 部署方式 | **Windows 原生 EXE** |
| Docker | **不适用（N/A）**：本次发布不采用容器部署 |

> **证据边界**：上述 EXE SHA-256 / 大小由本工作区**当前候选**（`58914fa` + 当前 UI
> `dist`）重建并核对，属本候选证据；与历史候选 `c857e29` 的 EXE 值**不同**。

---

## 2. 构建/测试门禁结果（本工作区宿主 Node v24.19.0 / npm 11.17.0）

| 命令 | 结果 |
|------|------|
| `npm run check:decoupling` | ✅ **通过**（业务层无 `$TeamSpeak`/`TeamSpeak` 导入/`$socket`/socket.js/`.execute`） |
| `npm run lint --workspace=@ts3-manager/ui` | ✅ **通过（0 问题）** |
| `npm run test:unit --workspace=@ts3-manager/ui` | ✅ **181/181 通过**（19 个测试文件） |
| `npm run test:ui:persist` | ✅ **4/4 通过** |
| `npm test`（= server:test） | ✅ **88/88 通过** |
| `npm run build --workspace=@ts3-manager/ui` | ✅ **Build complete**（PWA `generateSW`，precache 109 条目） |
| `node scripts/run-ui-e2e.js` | ✅ **30/30 通过**（1 worker，~38.3s，**exit 0**） |
| PWA 产物 | `dist/sw.js`、`dist/workbox-*.js`、`dist/manifest.webmanifest` **存在** |
| `npm run build --workspace=@ts3-manager/server`（`pkg . --target node22`） | ✅ **成功生成 node22 EXE**（当前候选） |
| EXE 冒烟（`PORT=8091` env 与 `--port 8092`） | ✅ 两路径 `/api/health` **200**；停止后端口监听为 0、`server.exe` 进程残留为 0 |
| `npm audit --omit=dev` | ✅ **0 vulnerabilities** |
| Vue 2 / Vuetify 2 生产依赖 | `npm ls vue@2 vuetify@2 vuex@3 vue-template-compiler@2 --omit=dev --all` = **空**（无匹配） |

### 2.1 Node 22 干净环境（通过）

任务要求“在受支持的 Node 22 干净环境安装依赖并完成构建”。宿主为 Node 24；另在
官方便携 Node **v22.23.2 / npm 10.9.8** 的隔离副本完成 `npm ci`、全量测试、
UI/PWA 与 Windows x64 构建。Node 22 门禁现为**通过**。

---

## 3. 部署/安全行为验证（当前候选）

### 3.1 已通过测试验证（自动化覆盖）
- ✅ `/api/health` 无鉴权返回 200 `status: ok`（`server.test.js`、`security-headers.test.js`）。
- ✅ 生产模式 session cookie 含 **Secure、HttpOnly、SameSite=Strict**、Path=/。
- ✅ 非信任 Origin 的状态变更请求返回 **403**；同源放行。
- ✅ 未登录不能初始化/使用文件传输 ticket；ticket 过期/复用/跨会话/方向不匹配均被拒绝。
- ✅ 上传超限 413、慢速超总时限被终止、失败后释放并发名额且健康检查正常。
- ✅ Socket 客户端 IP：未启用 TRUST_PROXY 时伪造 XFF 仍共享限流；启用后取可信链客户端地址；畸形回退。
- ✅ remembered session 不重复计数（`session.test.js`）。

以上服务端安全项由 `packages/server/test/*` 覆盖，属当前候选（迁移分支）工作区
实际运行的 88/88 服务端测试范围。

### 3.2 真实环境结果（当前候选）
- ✅ 本机隔离 TeamSpeak 的 Raw/SSH 登录、服务器/频道/用户读取、选择、可恢复写、事件、
  小文件上传下载、退出和 EXE 重启 remembered session 均通过。
- ✅ 本机隔离 TLS 代理的 HTTP→HTTPS、`wss://`、安全 Cookie、Origin 403、可信代理和
  Node 回环绑定均通过；正式部署仍需按实际代理层数复核客户端 IP。
- ✅ 桌面/移动端人工视觉检查：1280×720 与 390×844 的主要管理页已检查并修复发现项。
- ✅ PWA live update：Chrome + localhost 实测服务器完全停止后新标签离线冷启动 `/login`；
  新入口哈希生效、旧入口不再返回旧脚本；API/Socket 保持 `NetworkOnly`。
- ➖ Docker 镜像构建/运行：**不适用（N/A）**；本次发布采用 Windows 原生 EXE。

---

## 4. 已知风险与风险接受（当前候选）

| 风险 | 严重度 | 状态 | 截止 |
|------|--------|------|------|
| Vuetify 原型污染（CVE-2025-8083 / GHSA-3jp5-5f8r-q2wg） | High / CVSS 8.6（**Vuetify 2**） | 随迁移分支消除：当前候选生产树为 **Vuetify 3.13.2**，`npm audit --omit=dev` = **0**，该公告不再适用于生产依赖 | 已完成（随迁移分支） |
| Vue ReDoS（CVE-2024-9506 / GHSA-5j4c-8p2g-v4jx） | Low / CVSS 3.7（**Vue 2**） | 随迁移分支消除：当前候选生产树为 **Vue 3.5.42**，公告不再适用 | 已完成（随迁移分支） |
| Vuetify VDatePicker XSS（CVE-2025-8082 / GHSA-9w3x-85mw-4fwm） | Moderate（**Vuetify 2**） | 随迁移分支消除：当前候选生产树为 **Vuetify 3.13.2**，且未使用 `VDatePicker` | 已完成（随迁移分支） |
| Node 22 干净环境门禁 | — | **通过**：Node 22.23.2 / npm 10.9.8，clean `npm ci` + 全量门禁 | 已关闭 |
| 真实 TeamSpeak 回归 | — | **本机隔离环境主要路径通过** | PWA 门禁完成前继续保持候选状态 |

- `npm audit --omit=dev`（当前候选）：**0 vulnerabilities**。`docs/security-advisory-assessment.md`
  记录的历史 Vuetify 2 / Vue 2 公告为**迁移前基线**；当前候选生产树已无 Vue 2/Vuetify 2，
  触发这些公告的包不存在。**不执行 `npm audit fix --force`**。
- 需在 `docs/security-tracker.md` 与 `docs/security-advisory-assessment.md` 补充“迁移分支
  生产树已消除 Vue 2/Vuetify 2 公告”的按当前候选记录（§8）。

---

## 5. 环境级验收状态（当前候选）

> 以下为**真实状态**，未做任何虚构。Node 22、人工视口、本机 TeamSpeak、隔离 HTTPS/WSS
> 与 Chrome live-host PWA 均已完成。

| 任务 | 验收项 | 状态 | 原因 / 需在何处执行 |
|------|--------|------|--------------------|
| 1 | Node 22 门禁（`npm ci`/`test`/`lint`/`ui:build`/`server:build` + Windows EXE） | **通过** | Node 22.23.2 隔离副本，全量门禁通过 |
| 2 | Docker 构建/运行/重启/持久化 | **不适用（N/A）** | 已确定采用 Windows 原生 EXE 部署 |
| 3 | 隔离 HTTPS 反向代理 + WSS + Origin + 代理 IP | **通过（本机拓扑）** | 308、Secure Cookie、WSS、Origin 403、回环绑定通过；正式部署复核真实代理 IP |
| 4 | 真实 TeamSpeak 管理与文件传输端到端 | **主要路径通过（本机）** | Raw/SSH、读取、可恢复写、小文件、事件、退出、EXE 重启恢复通过 |
| 5 | Chrome localhost PWA 离线与版本更新 | **通过（本机）** | 离线冷启动、SPA fallback、新入口接管、旧入口失效与 NetworkOnly 配置通过 |

> 上述各项必须在真实基础设施上执行、附证据并签名确认，本记录才能转绿。部署参数说明见
> `docs/production-deployment.md`。

---

## 6. 验收结论（当前候选）

**当前候选的 Node 22 自动化、构建、PWA、EXE 冒烟、桌面/移动人工视觉、本机
TeamSpeak Raw/SSH Query 与隔离 HTTPS/WSS 均已通过。**

**发布验收状态：`RELEASE READY（待独立评审）`**。本记录只授权进入评审，不代表已经
推送、合并、创建 Release 或部署生产环境。

- **未创建版本标签 / 发布 / 推送 / 合并**（按指引，在验收完成前不创建正式发布）。
- 验收执行：**Codex（自动化）**；环境提供与结果确认：**jieyu**（真实环境，待提供）。
- 日期：2026-09-01。

---

## 7. 历史参照：先前发布候选 `c857e29`（**已取代，不构成本候选证据**）

记录如下仅为保留历史上下文，**不**作为当前迁移候选的发布证据：

- 先前候选 `c857e298075738b9f937b0e05ed8b2eecf0d6e36`（Vue 2 基线）曾取得 Node 22 CI、
  Windows artifact（`ts3-manager-windows-x64-c857e29…`）与本地真实 TeamSpeak 核心链路证据。
- 该候选的 EXE SHA-256 为 `1ba36e020c95220f7446575c5af108d0b118b32924b0214d7e57d2c19c56e485`
  （74,502,485 字节），与当前候选 `BB42ED…`（72,397,111 字节）**不同**。
- 该证据**只证明** `c857e29` 本体验证通过；**不能**用于证明 `58914fa` 迁移候选可发布
  （迁移引入的回归、生产依赖与构建链变化都会影响可发布性）。
- 历史 `c857e29` EXE（历史下载制品中的 `server.exe`，位于本机“下载”目录的
  `ts3-manager-windows-x64-c857e298075738b9f937b0e05ed8b2eecf0d6e36` 文件夹，路径已脱敏）
  曾在本环境另行运行于端口 18080（非本工作区启动制品），与当前候选无关。

---

## 8. 迁移分支文档联动

- `README.md`：主要技术栈已按迁移分支更新为 Vue 3 / Vuetify 3 / Vite / vue-router 4 /
  Pinia / 新 PWA（`master` 基线仍为 Vue 2）。
- `docs/external-environment-validation.md`：同步为当前候选。真实 TeamSpeak / HTTPS /
  认证 Socket.IO / PWA live-host 更新流程均记“未执行”；桌面/移动人工视觉已按执行记录
  标记为“通过（关键页面部分巡检，见 §3.2）”，仅 PWA live-host 未完成，因此文档一致性
  acceptance task 仍需在 PWA live-host 完成后收敛。
- `docs/security-tracker.md` 与 `docs/security-advisory-assessment.md`：补充“迁移分支
  生产树已消除 Vue 2/Vuetify 2 公告”的按当前候选记录。
- `docs/vue3-migration.md`、`docs/vuetify3-component-migration.md`、`docs/regression-matrix.md`：
  与迁移分支实际状态一致。
