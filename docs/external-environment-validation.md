# 外部环境发布验收记录

> 本表用于发布环境验收。当前发布方式确定为 **Windows 原生 EXE**，因此 Docker 项标记为
> 不适用；真实 HTTPS 反向代理、真实 TeamSpeak 与 Chrome PWA 项均已有本机隔离证据。
> 自动化测试通过本身**不能**替代这些真实环境验收。
>
> **本表当前对象 = Vue 3 / Vuetify 3 / Vite 迁移候选**：分支 `codex/vue3-migration`，
> HEAD `58914fa7d85e7aaa339b2a8124abdea01c003bf8`。该候选的 TeamSpeak 与隔离 HTTPS/WSS
> 主要路径与 Chrome localhost PWA live-host 门禁均已执行。
> 以下“待执行”/“未执行”项为**当前真实状态**，未做任何虚构。历史候选 `c857e29`
> 的证据仅作历史参照（见 §6），**不**构成本候选证据。

## 1. 验收信息（当前候选）

| 项目 | 填写值 |
|------|--------|
| 分支 / Git 提交 SHA | `codex/vue3-migration` / `58914fa7d85e7aaa339b2a8124abdea01c003bf8` |
| 工作区状态 | `git status --porcelain` = **95 项**（**90 个已跟踪改动 + 5 个未跟踪项**，为清理 `tmp-node22-final/` 与 `tmp-node22-final.zip` 之后的实测值）；`.ai/` 文件受忽略规则影响，不计入该计数 |
| 本地产物 Windows EXE SHA-256 | `BB42ED3D8E8050FB679ACB95CB57E79F6A7090C146F8562017D541D688DA4B8C`（最终候选重建，`packages/server/server.exe`，gitignored） |
| 本地产物 Windows EXE 大小 | 72,397,111 字节 |
| 宿主 Node / npm | 宿主 v24.19.0 / 11.17.0；Node 22 干净 `npm ci` 已在隔离副本用官方 v22.23.2 / 10.9.8 完成 |
| 部署方式 | Windows 原生 EXE |
| 执行人 / 复核人 | Codex（自动执行，自动化部分）/ jieyu（真实环境提供与结果确认，待提供） |
| 验收日期 | 2026-09-01 |

> **注**：本候选无 CI 运行链接（迁移分支未通过 CI 取得制品 artifact）；本轮为主机工作区
> 构建/验证。CI artifact 证据需在 Node 22 干净环境与 CI 链路补齐后回填。

## 2. Docker（不适用）

**状态：不适用（N/A）**。本次发布不采用容器部署。若未来切换到 Docker 部署，必须重新
启用本节并保存完整日志：

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --no-color
```

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| 镜像无缓存构建成功 | 不适用 | Windows 原生 EXE 部署 |
| `/api/health` 返回 200 和 `status: ok` | 由 Windows EXE 冒烟测试覆盖 | `PORT`/`--port` 两路径 200 |
| 容器重启后服务恢复 | 不适用 | 无容器运行时；Windows 部署改验本地持久化数据目录与备份 |
| `data/` 使用持久化卷 | 不适用 | 同上 |
| 重启后 remembered session 可恢复 | **通过（本机）** | 最终 EXE 强制重启后状态、serverId 和认证 Socket 恢复 |
| 日志不包含密码、密钥或文件传输凭据 | **通过（本机检查）** | 输出仅保留脱敏结果；临时日志和会话目录已删除 |

## 3. HTTPS、WSS 与反向代理

生产配置必须显式设置 `WHITELIST`、`ALLOWED_ORIGINS`、`TRUST_PROXY` 和与实际代理层数
一致的 `TRUSTED_PROXY_HOPS`。

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| HTTP 自动跳转 HTTPS | **通过（本机隔离代理）** | HTTP 入口返回 308 和 HTTPS Location |
| Node 服务端口未直接暴露公网 | **通过（本机拓扑）** | 新增 `BIND_HOST=127.0.0.1`，最终 EXE 仅监听回环地址 |
| Cookie 包含 Secure、HttpOnly、SameSite=Strict | **通过（真实 HTTPS）** | HTTPS 登录响应三项属性齐全 |
| HTTPS 页面成功建立 `wss://` Socket.IO | **通过（本机隔离代理）** | 真实会话鉴权及 TeamSpeak 连接成功 |
| 非允许 Origin 的状态变更请求返回 403 | **通过** | 隔离 HTTPS 请求返回 403 |
| 日志客户端 IP 与真实客户端一致 | **本机单代理通过** | 正式部署仍需按真实代理层数复核 |

## 4. 真实 TeamSpeak 回归（当前候选——**本机主要路径通过**）

> 本候选已在本机隔离 TeamSpeak 上执行主要路径，结果来自真实 Raw/SSH Query、文件通道
> 和最终 EXE，不是 mock。未覆盖的压力、断网及近上限文件项目继续明确标记为未执行。

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| 登录失败、登录成功及退出 | **主要路径通过** | Raw/SSH 登录通过；退出 200 且 Socket 主动断开；错误凭据由自动化覆盖 |
| 保持登录、刷新页面及服务重启恢复 | **通过** | remembered session、serverId、认证 Socket 跨最终 EXE 重启恢复 |
| 切换虚拟服务器 | **通过（单服务器）** | 选择 sid=1 并持久化；多服务器切换待有多实例时补测 |
| 客户端、频道、权限、封禁等主要管理功能 | **部分通过** | 服务器/频道/用户读取、服务器临时改名恢复及实时事件通过；其余写操作未逐项执行 |
| 零字节、小文件、近上限文件上传 | **小文件通过；其余未执行** | 38 字节真实文件通道上传成功并清理 |
| 下载成功且哈希一致 | **通过** | 下载 38 字节，SHA-256 一致 |
| 取消、断网、目标关闭及超时处理 | **未执行**（自动化覆盖总时限/错误释放，无真实故障注入） | 需真实故障注入 |
| ticket 过期、复用、跨会话和方向不匹配均被拒绝 | 自动化通过 | `ticket-store.test.js`、`file-transfer.test.js` |
| 失败后并发名额释放，可再次传输 | 自动化通过 | `file-transfer.test.js` |

> TODO（真实环境）：使用唯一随机文件名，真实上传/下载后校验并清理；不可恢复的写操作
> 使用隔离测试对象；凭据不得写入文件、日志或 Git。真实环境就绪后按本表逐项回填。

## 5. 发布判定（当前候选）

- 当前候选的本机 TeamSpeak、隔离 HTTPS/WSS 与 Chrome localhost PWA 门禁均已通过。
  当前结论为 **RELEASE READY（待独立评审）**。
- 任一适用的 P0 项为“待执行”或“失败”即 NOT RELEASE READY；“不适用”项（Docker）
  在有明确部署决策时不视为失败。
- 全部通过后，由执行人和复核人签名，并在 `docs/release-readiness.md` 回填本记录及
  证据链接后，才能改为 `RELEASE READY`。

## 6. 历史参照：先前候选 `c857e29`（**已取代，不构成本候选证据**）

- 先前候选 `c857e298075738b9f937b0e05ed8b2eecf0d6e36`（Vue 2 基线）曾取得真实
  TeamSpeak 核心链路、Node 22 CI 与 Windows artifact（`ts3-manager-windows-x64-c857e29…`，
  SHA-256 `1ba36e020c95220f7446575c5af108d0b118b32924b0214d7e57d2c19c56e485`）证据。
- 这些证据**只证明** `c857e29` 本体验证通过，**不能**用于证明当前 `58914fa` 迁移候选
  可发布（迁移引入的回归、依赖与构建链变化都会影响可发布性）。
- 当前候选的 EXE SHA-256 `10E2F5…` 与历史候选 `1ba36e0…` 不同。
