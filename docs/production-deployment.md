# 生产部署配置指南 (Production Deployment Configuration)

本文件给出面向公网/生产环境的推荐配置、密钥与数据管理、以及需要按实际环境调整的参数。**不要**把真实密钥、域名或内网地址提交到 Git。

---

## 1. 推荐环境变量模板

```env
# ==== 运行时 ====
NODE_ENV=production
SESSION_COOKIE_SECURE=true
# 反向代理部署必须仅监听回环地址，避免 Node 端口直接暴露。
BIND_HOST=127.0.0.1

# ==== 会话与凭据密钥 ====
# 32 字节随机值经 Base64 编码。通过部署环境 / secret 管理注入，不要写进文件提交。
# 生成：node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_ENCRYPTION_KEY=<32字节随机值的Base64>

# ==== 允许连接的 TeamSpeak 主机 ====
# 公网部署必须显式配置，不得留空。多个地址用英文逗号分隔。
WHITELIST=<允许连接的TeamSpeak主机>

# ==== 反向代理 / 跨域 ====
ALLOWED_ORIGINS=https://<管理域名>
TRUST_PROXY=1
TRUSTED_PROXY_HOPS=1

# ==== 登录限流 ====
SESSION_LOGIN_RATE_WINDOW_MS=60000
SESSION_LOGIN_RATE_MAX=5

# ==== Socket.IO 连接限流 ====
SOCKET_RATE_LIMIT_WINDOW_MS=60000
SOCKET_RATE_LIMIT_MAX=10
SOCKET_SESSION_MAX_CONNECTIONS=3

# ==== 文件传输限制 ====
FILE_TRANSFER_MAX_SIZE=2147483648
FILE_TRANSFER_SESSION_CONCURRENCY=2
FILE_TRANSFER_GLOBAL_CONCURRENCY=20
FILE_TRANSFER_CONNECT_TIMEOUT_MS=5000
FILE_TRANSFER_IDLE_TIMEOUT_MS=30000
FILE_TRANSFER_TOTAL_TIMEOUT_MS=1800000
FILE_TRANSFER_TICKET_TTL_MS=45000
```

> 也可直接复用仓库根目录的 `.env.example`（已含上述注释与默认值）。为生产建议复制一份 `.env.production`（由部署工具注入，**不提交**）。

---

## 2. 强制要求

- **`WHITELIST` 在公网部署时不得留空**：必须列出允许连接的 TeamSpeak 主机（IP 或域名）。留空等于放行任意主机，禁止。
- **反向代理部署必须设置 `BIND_HOST=127.0.0.1`**：确保 Node 仅接受本机代理转发，不能直接从外部网络访问。
- **密钥必须通过 secret / 部署环境注入**：`SESSION_ENCRYPTION_KEY` 由 AWS Secrets Manager / Docker Secret / Kubernetes Secret / 部署编排注入，勿写入文件或镜像。
- **旧密钥与真实域名不得出现在 Git 历史**：不要把真实 `SESSION_ENCRYPTION_KEY`、`WHITELIST` 值、`ALLOWED_ORIGINS` 域名写入任何提交、`*.env*`、`docker-compose.yml`、Dockerfile 或发布产物。若已误提交，应立即轮换密钥并清理历史（`filter-repo`/`bfg`），然后重新生成密钥。
- **文件大小与并发限制需按实际环境调整**：
  - `FILE_TRANSFER_MAX_SIZE`：按服务器可用内存/X 服务器带宽设置；过大会带来内存/磁盘压力，过小会限制合法大文件。
  - `FILE_TRANSFER_SESSION_CONCURRENCY` / `FILE_TRANSFER_GLOBAL_CONCURRENCY`：按 TeamSpeak 文件传输槽位与带宽设置，避免拥塞。
  - `FILE_TRANSFER_CONNECT/IDLE/TOTAL_TIMEOUT`：按网络质量设置，避免慢速或挂死传输占用资源；`TOTAL_TIMEOUT_MS` 是墙钟上限，无法被小流量绕过。
  - 调整后建议在真实 TeamSpeak 环境做一次大文件与慢速传输回归。

---

## 3. 数据目录、密钥备份与恢复

- **数据目录**（默认 `<cwd>/data`，可 `DATA_DIR` 覆盖）包含：
  - `session.key`：编辑器优先从 `SESSION_ENCRYPTION_KEY` 读取；否则由服务首次启动自动生成并保存于此，**权限必须为 `0600`（仅服务账号可读）**。
  - `sessions.enc`：加密的“保持登录”长会话文件，同样是 `0600`。
- **目录必须位于持久化卷**（Docker volume / 宿主目录 / k8s PVC），否则重启后 remembered session 与密钥会丢失。
- **备份**：备份整个 `data/`（含 `session.key` 与 `sessions.enc`）。二者必须**一并备份**：仅备份 `sessions.enc` 而丢失 `session.key` 将无法解密；仅备份 `session.key` 而丢失 `sessions.enc` 则丢失所有长会话。
- **恢复**：把 `data/` 恢复到原路径，并保证 `session.key` 权限为 `0600`；确保 `DATA_DIR`/`SESSION_ENCRYPTION_KEY` 未变。
- **权限**：
  ```bash
  chmod 0600 data/session.key data/sessions.enc
  ```
  Windows 下确保仅服务账号可访问（可通过 NTFS ACL / 将 run-as 服务账号隔离）。

---

## 4. 反向代理与 HTTPS

- 服务运行于 Nginx/Caddy/其它代理之后，由代理终结 TLS，转发到 Node 服务（不要直接把 Node 端口暴露到公网）。
- 代理需做 **HTTP → HTTPS 跳转**，并设置 `X-Forwarded-For` / `X-Forwarded-Proto`。
- 服务端 `TRUST_PROXY=1`，`TRUSTED_PROXY_HOPS` 必须与真实代理层数一致（一层代理填 `1`，两层填 `2`，以此类推），否则客户端 IP / 限流来源可能与真实地址不符。
- `ALLOWED_ORIGINS` 填实际访问域名；同源状态变更请求会放行，非允许 Origin 会被拒绝（403）。
- 检测：设置 Cookie 应含 `Secure`、`HttpOnly`、`SameSite=Strict`；`wss://` Socket.IO 应在 HTTPS 页面可建立。

---

## 5. 上线检查清单（摘要）

- [ ] `WHITELIST` 已配置且非空。
- [ ] `SESSION_ENCRYPTION_KEY` 已通过 secret 注入，未有真实值进入 Git。
- [ ] `TRUSTED_PROXY_HOPS` 与真实代理层数一致。
- [ ] `data/` 位于持久化卷，密钥/会话文件权限 `0600`。
- [ ] 已建立 `data/` 与密钥的备份/恢复流程。
- [ ] 已在真实 TeamSpeak 环境完成文件上传/下载/中止与超限回归。
- [ ] 已对照 `docs/security-advisory-assessment.md` 进行依赖风险接受与跟踪（见 `docs/security-tracker.md`）。
