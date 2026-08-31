# TS3 Manager 中文控制台

TS3 Manager 是一个基于浏览器的 TeamSpeak 3 ServerQuery 管理面板。本项目在原版 TS3 Manager 的基础上重新设计了中文控制台界面，并完善了服务器列表、实时在线、权限密钥、黑名单和快照管理体验。

> 本项目不是 TeamSpeak 服务器。使用前必须准备一台可访问的 TeamSpeak 3 服务器，以及拥有相应权限的 ServerQuery 账号。

## 最新更新

- 完成前端业务通信层解耦：Vue 组件与 Vuex 模块统一通过领域服务访问 TeamSpeak，移除 `$TeamSpeak`/`$socket` 全局注入和组件内原始命令调用
- 建立统一的通信错误模型、Socket 请求超时/取消/断线处理及幂等实时事件订阅，并加入通信边界静态检查
- 当前验证基线：UI 单元测试 181 项、服务端测试 88 项、持久化测试 4 项、Playwright 核心回归 30 项
- 已创建 `codex/vue3-migration` 独立迁移分支，并按阶段完成 Vue 3、Vite、Vuetify 3、vue-router 4、Pinia 与新 PWA 的实际迁移（工具链、入口、路由、状态管理与最小可运行纵切面均已落地并验证）；该分支尚未合并回 `master`，当前生产基线仍为 Vue 2 版本
- 前端构建工具链在迁移分支已切换为 Vite（`@vitejs/plugin-vue` + `vite-plugin-pwa`，替代 Vue CLI/Webpack），并统一使用 Node.js 22、npm workspace 锁文件和可复现构建流程
- 同步 Docker 构建/运行环境、Windows x64 可执行文件及 GitHub Release 跨平台构建配置
- 完善浅色/深色主题手动切换、系统主题初始化和本地偏好保存，修复深色主题文字对比度问题
- 迁移 PWA Service Worker：版本化静态缓存，自动接管新版本，一次性清理 Vue CLI 旧缓存，并确保 API 与 Socket.IO 始终走网络；已在 Chrome localhost 环境通过离线冷启动、SPA fallback 和双版本更新验收
- 完成依赖安全治理，迁移候选的 `npm audit --omit=dev` 为 0 vulnerabilities，生产依赖树已无 Vue 2 与 Vuetify 2
- 完成服务端会话、Origin/CSRF、Socket.IO 鉴权与限流、文件传输一次性票据及传输资源上限加固
- 统一 HTTP 与 Socket.IO 对 `TRUST_PROXY` 的解释，并支持按真实代理层数解析客户端 IP
- 清理生产构建警告，关闭生产 source map，并将 MDI 图标字体收敛为单一 WOFF2 资源
- 生产构建目录由 26.3 MB 降至 7.72 MB，体积减少约 70.6%；迁移分支改用 Vite 按需分包与长期缓存友好的构建输出
- 补齐 API 密钥、权限密钥、频道、服务器、通知、仪表盘及各类操作弹窗的简体中文翻译
- 统一汉化按钮、表单字段、筛选条件、空数据、分页、确认操作和常见服务器错误提示
- 优化未知英文异常的展示方式，避免直接向普通用户显示难以理解的原始报错
- 保留 TeamSpeak、ServerQuery、UID、IP、权限标识符及服务器自定义名称等必要技术内容
- 修正文件上传图标兼容性，并加强通知标题的安全渲染
- 已通过前端代码检查和生产环境构建验证
- 已在 Node.js 22.23.2 干净环境通过 `npm ci` 和全量门禁，并在本机隔离环境完成真实 TeamSpeak Raw/SSH Query、认证 Socket.IO、文件传输、会话恢复及 HTTPS/WSS 验收

第四阶段必要执行门禁已闭环，当前状态为 **RELEASE READY（待独立评审）**；尚未合并、创建 Release 或部署生产环境。完整证据见 [发布验收记录](docs/release-readiness.md)。

## 项目特色

- 现代化中文控制台，统一优化顶部栏、侧边栏、面包屑、卡片和数据表格
- 服务器列表集中入口：左侧仅保留服务器列表，点击对应服务器的“管理”即可进入实时在线
- 单服务器管理栏：进入服务器后，可在顶部快速切换消息、文件、日志、密钥、封禁、用户、组和权限等功能
- 全局简体中文组件，分页、空数据、表头、操作菜单、确认弹窗和常见网络错误均已汉化
- 使用本地 Material Design Icons，不依赖 Google Fonts，避免图标显示成英文名称
- 响应式登录页面，支持桌面端和移动端
- 支持 SSH Query 与传统 ServerQuery
- 管理多台 TeamSpeak 虚拟服务器及其运行状态
- 实时查看频道树、在线用户和服务器信息
- 管理服务器及频道权限密钥
- 管理 IP、用户名称和 UID 黑名单
- 创建、下载和恢复服务器快照
- 快照恢复前二次确认，降低误覆盖风险
- 管理聊天、文件、日志、权限组、投诉和 API 密钥
- 支持深色模式和浏览器端连接信息保存

## 功能概览

### 服务器管理

- 查看虚拟服务器名称、端口、在线人数、运行时间及状态
- 在服务器列表中直接点击“管理”，自动选择对应服务器并进入实时在线页面
- 启动、停止、创建、编辑和删除虚拟服务器
- 查看频道结构与在线用户
- 当前服务器行高亮显示，并提供“运行中/已停止”状态提示

### 单服务器管理导航

进入某台服务器后，页面顶部会显示针对当前服务器的统一管理栏：

- 实时在线、消息中心、文件管理、服务器日志和查询终端
- 权限密钥、API 密钥、黑名单、快照和投诉记录
- 用户管理、服务器组、频道组和权限管理

这些页面始终操作当前选中的虚拟服务器。如需管理另一台服务器，请返回左侧“服务器列表”，点击目标服务器的“管理”按钮。

### 权限密钥

- 创建服务器组密钥和频道组密钥
- 设置用户组、频道和描述
- 查看密钥创建时间
- 一键复制密钥
- 单项或批量删除密钥

### 黑名单

- 使用 IP、用户名称或 TeamSpeak UID 添加封禁
- 设置封禁原因和持续时间
- 搜索、编辑和删除封禁记录
- 支持永久封禁及到期时间显示

### 快照

- 将当前虚拟服务器配置导出为 `.backup` 文件
- 从本地快照恢复频道、权限及服务器配置
- 恢复前显示覆盖警告和二次确认
- 恢复完成后自动重新选择当前虚拟服务器

## 使用前准备

请确认 TeamSpeak 服务器已经开放 ServerQuery 服务，并允许运行 TS3 Manager 的机器连接。

常用端口：

| 连接方式 | 默认端口 | 加密 |
| --- | ---: | --- |
| SSH Query | `10022/TCP` | 是 |
| Raw ServerQuery | `10011/TCP` | 否 |

你还需要以下信息：

- TeamSpeak 服务器 IP 或域名
- ServerQuery 端口
- ServerQuery 用户名，例如 `serveradmin`
- ServerQuery 密码

ServerQuery 密码不是普通 TeamSpeak 客户端的服务器密码。首次安装 TeamSpeak 服务端时通常会生成 `serveradmin` 密码。

## Windows 原生版（推荐）

### Windows 一键管理

Windows 用户可以直接双击项目根目录中的脚本：

| 文件 | 用途 |
| --- | --- |
| `一键启动.bat` | 优先启动 Windows 原生 EXE；没有 EXE 时自动回退到 Docker |
| `一键停止.bat` | 停止 Windows 原生进程或 Docker 容器，并保留配置 |
| `一键重启.bat` | 按当前运行方式停止并重新启动服务 |
| `查看日志.bat` | 显示 Windows 原生版或 Docker 版日志，按 `Ctrl+C` 退出 |
| `更新并启动.bat` | 安全检查上游更新，然后重新构建和启动 |
| `构建Windows版.bat` | 从当前源码生成 `TS3-ChineseWebPageManager.exe` |

首次启动前可以复制并编辑 `.env.example`，或直接运行 `一键启动.bat`。脚本会自动创建 `.env` 并生成随机 `JWT_SECRET`。

从 GitHub Releases 下载 `TS3-ChineseWebPageManager-win-x64-版本号.exe` 后，将其重命名为 `TS3-ChineseWebPageManager.exe` 并放在项目根目录，然后双击 `一键启动.bat`。Windows 原生版不需要安装 Docker。

开发者也可以双击 `构建Windows版.bat` 从当前源码生成 EXE。构建环境统一使用 Node.js 22，并由 `@yao-pkg/pkg` 生成内嵌 Node.js 22 的 Windows x64 程序；普通使用者直接下载 Release 中的 EXE 即可。

如果项目根目录没有 EXE，启动脚本才会尝试 Docker：优先使用新版 `docker compose`，其次尝试旧版 `docker-compose`；两者都未安装时使用原生 `docker build` 和 `docker run`。

如需限制可连接的 TeamSpeak 服务器，请编辑生成的 `.env`：

```dotenv
WEB_PORT=8080
JWT_SECRET=自动生成，请勿随意修改
WHITELIST=ts3.example.com,192.0.2.10
```

`.env` 已被 Git 忽略，不会被正常提交到代码仓库。

“更新并启动”检测到未提交的源码修改时会跳过远程拉取，只重新构建当前版本，避免覆盖定制页面。

## Docker 部署（可选）

### 1. 构建本项目镜像

```powershell
cd "D:\path\to\TS3-ChineseWebPageManager"
docker build -t ts3-manager-custom .
```

### 2. 启动容器

```powershell
docker run -d `
  --name ts3-manager `
  --restart unless-stopped `
  -p 8080:8080 `
  -v "${PWD}/data:/app/data" `
  -e SESSION_ENCRYPTION_KEY="请替换成32字节随机值的Base64" `
  -e SESSION_COOKIE_SECURE="false" `
  -e WHITELIST="你的TS3服务器IP或域名" `
  ts3-manager-custom
```

启动后访问：

```text
http://localhost:8080
```

部署在远程服务器时应通过 Nginx、Caddy 等反向代理启用 HTTPS，然后访问：

```text
https://你的管理面板域名
```

`SESSION_COOKIE_SECURE=false` 只适用于可信局域网或本机的纯 HTTP 部署；公网部署必须保持 `true` 并使用 HTTPS，否则会话 Cookie 无法安全传输。

### Docker Compose 示例

```yaml
services:
  ts3-manager:
    build: .
    image: ts3-manager-custom
    container_name: ts3-manager
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      PORT: "8080"
      SESSION_ENCRYPTION_KEY: "请替换成32字节随机值的Base64"
      SESSION_COOKIE_SECURE: "true"
      WHITELIST: "ts3.example.com,192.0.2.10"
      ALLOWED_ORIGINS: "https://ts3.example.com"
      TRUST_PROXY: "1"
      TRUSTED_PROXY_HOPS: "1"
```

运行：

```powershell
docker compose up -d --build
```

查看状态：

```powershell
docker compose ps
docker compose logs -f ts3-manager
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | Web 服务监听端口 | Docker 中为 `8080` |
| `BIND_HOST` | Web 服务监听地址；位于反向代理后时建议设为 `127.0.0.1` | `0.0.0.0` |
| `JWT_SECRET` | 兼容用旧密钥（新登录改用服务端会话） | 每次启动随机生成 |
| `SESSION_ENCRYPTION_KEY` | 加密“记住登录”长会话凭据的 32 字节 Base64 密钥 | 首次启动自动生成并保存到 `data/session.key` |
| `SESSION_COOKIE_SECURE` | 是否仅通过 HTTPS 发送会话 Cookie；公网必须为 `true` | `true` |
| `WHITELIST` | 允许连接的 TS3 地址，多个地址以英文逗号分隔 | 允许任意地址 |
| `ALLOWED_ORIGINS` | 允许发起状态变更请求的生产来源，多个来源以英文逗号分隔 | 同源 |
| `TRUST_PROXY` | 是否信任反向代理转发头；仅在代理后启用，接受 `1`、`true` 或 `yes` | 关闭 |
| `TRUSTED_PROXY_HOPS` | 启用代理信任后，从转发链右侧跳过的可信代理层数 | `1` |
| `SESSION_LOGIN_RATE_MAX` | 单个客户端 IP 在限流窗口内允许的登录尝试次数 | `5` |
| `SOCKET_RATE_LIMIT_MAX` | 单个客户端 IP 在限流窗口内允许的 Socket.IO 连接次数 | `10` |
| `SOCKET_SESSION_MAX_CONNECTIONS` | 单个登录会话允许的并发 Socket.IO 连接数 | `3` |
| `FILE_TRANSFER_MAX_SIZE` | 单次上传文件大小上限（字节） | `2147483648` |
| `FILE_TRANSFER_SESSION_CONCURRENCY` | 单个会话允许的并发文件传输数 | `2` |
| `FILE_TRANSFER_GLOBAL_CONCURRENCY` | 服务全局允许的并发文件传输数 | `20` |
| `FILE_TRANSFER_TOTAL_TIMEOUT_MS` | 单次文件传输的墙钟总时限 | `1800000` |

其余会话、限流和文件传输参数见 [.env.example](.env.example)。公网部署的完整配置与检查清单见 [生产部署指引](docs/production-deployment.md)。`TRUST_PROXY` 只能在服务确实位于可信反向代理之后时启用，`TRUSTED_PROXY_HOPS` 必须与实际代理层数一致。

## 凭据安全

管理面板不再把 ServerQuery 密码保存到浏览器，也不再依赖 JWT 携带凭据。

- 登录成功后，服务端生成**随机会话 ID**，并通过 **HttpOnly Cookie**（`ts3_session`）发送给浏览器；浏览器 JavaScript 无法读取。
- **ServerQuery 凭据只保存在服务端**。
- 普通登录的会话保存在服务端**内存**，有效期约 **8 小时**。
- 勾选“在此设备保持登录 30 天”后，凭据用 **AES-256-GCM 加密**写入 `data/sessions.enc`（经 `SESSION_ENCRYPTION_KEY` 加密），有效期约 **30 天**。
- 会话具有**绝对过期**（普通 8 小时 / 记住 30 天）与**空闲过期**（连续 8 小时未使用）双重限制。
- 退出登录会**立即撤销**会话，并关闭对应的 Socket.IO 与 ServerQuery 连接。
- `data/` 目录、`*.enc`、`*.key` 已在 `.gitignore` 中忽略，不进入 Git 与日志。

> 安全迁移提示：旧版浏览器令牌（`token` Cookie）会在访问时自动清除，需要重新输入一次 ServerQuery 凭据登录。

建议设置 `WHITELIST`，防止管理面板连接未经授权的公网或内网地址。

## 登录控制台

打开管理页面后填写：

1. **服务器地址**：TeamSpeak 服务器 IP 或域名。
2. **端口**：SSH Query 通常为 `10022`，Raw Query 通常为 `10011`。
3. **SSH 加密**：使用 `10022` 时开启；使用 `10011` 时关闭。
4. **ServerQuery 用户名**：例如 `serveradmin`。
5. **密码**：对应的 ServerQuery 密码。
6. 根据需要选择是否记住连接信息，然后点击“连接控制台”。

登录后进入“服务器列表”，点击目标服务器右侧的“管理”按钮。系统会自动选择该虚拟服务器并进入“实时在线”页面；之后可通过顶部管理栏切换功能。密钥、黑名单、快照、频道、用户组和权限操作均针对当前服务器。

离线服务器无法直接进入管理页面，请先通过运行状态开关启动服务器，再点击“管理”。

## 本地开发

项目为 npm workspace。`master` 生产基线仍为 Vue 2 与 Vuetify 2；`codex/vue3-migration` 迁移分支已切换为 Vue 3、Vuetify 3，前端构建工具链为 Vite（`@vitejs/plugin-vue` + `vite-plugin-pwa`），路由为 vue-router 4，状态管理为 Pinia。后端使用 Node.js、Express 和 Socket.IO。

开发、Docker 构建/运行和 Windows 可执行文件统一使用 Node.js 22。

Vue 3/Vite 正式升级在独立的 `codex/vue3-migration` 分支推进，`master` 尚未切换到新框架。迁移决策与进度见 [Vue 3 / Vite 迁移方案](docs/vue3-migration.md)。

PWA 使用自定义 Workbox Service Worker：静态构建资源支持离线访问，API 与 Socket.IO 始终走网络。新版本安装完成后会自动接管并刷新一次，同时清理旧版 Workbox 预缓存。

生产构建默认关闭 source map，并复用单一 WOFF2 图标字体；迁移分支的 Vite 构建采用按需分包与长期缓存友好的输出命名。

### 安装依赖

```powershell
npm ci
```

### 启动开发环境

```powershell
npm run dev
```

也可以分别启动：

```powershell
npm run ui:serve
npm run server:dev
```

### 构建

```powershell
npm run build
```

### 测试

```powershell
npm test
npm run lint --workspace=@ts3-manager/ui
npm run test:unit --workspace=@ts3-manager/ui
npm run check:decoupling
npx playwright install chromium
npm run test:ui:e2e
```

浏览器测试使用本地模拟服务，不需要连接真实 TeamSpeak 服务器；覆盖登录、会话恢复、服务器列表、频道树、文件、日志和移动端登录页。CI 会自动运行这些测试，并在失败时保留 Playwright 报告。

根目录的 `package.json` 要求 Node.js 22 和 npm 10 或更高版本；Dockerfile 使用同一 Node.js 主版本并从锁文件安装依赖。

## 安全建议

- 不要将未启用 HTTPS 的管理面板直接暴露到公网
- 推荐使用 Nginx、Caddy 或其他反向代理配置 HTTPS
- 为 ServerQuery 创建独立账号并遵循最小权限原则
- 限制 ServerQuery 可连接的来源 IP
- 固定并妥善保管 `SESSION_ENCRYPTION_KEY`，同时持久化和备份 `data/`；不要把真实密钥提交到 Git
- 使用 `WHITELIST` 限制面板能够连接的 TS3 服务器
- 公网反向代理部署应设置准确的 `ALLOWED_ORIGINS`、`TRUST_PROXY` 和 `TRUSTED_PROXY_HOPS`
- 不要把 `10011/TCP` 向整个公网开放
- 恢复快照前先下载当前配置备份
- 不要上传来源不明的 `.backup` 文件

## 项目结构

```text
packages/
├── server/    Node.js 后端与 ServerQuery/WebSocket 通信
└── ui/        管理控制台（迁移分支为 Vue 3 + Vuetify 3 + Vite；`master` 基线仍为 Vue 2）
```

前端业务通信采用分层结构：

```text
Vue 组件 / Vuex 模块
        ↓
领域服务（packages/ui/src/services）
        ↓
TeamSpeak 协议客户端（packages/ui/src/api）
        ↓
传输层 / Socket.IO / HTTP
```

组件不得直接访问 TeamSpeak 或 Socket，也不得包含原始 TeamSpeak 命令和 Socket 事件名。`npm run check:decoupling` 用于检查该边界；详细设计和测试基线见 [通信层解耦文档](docs/communication-decoupling.md)。

主要界面文件位于：

```text
packages/ui/src/components/
```

## 常见问题

### 无法连接服务器

检查服务器地址、Query 端口、SSH 开关、账号密码、防火墙以及 TeamSpeak Query 白名单。

### 登录后提示权限不足

当前 ServerQuery 账号缺少对应权限。创建、删除服务器、管理权限、封禁或恢复快照通常需要更高权限。

### 容器重启后保存的账号不可用

确认已把宿主机 `data/` 挂载到容器的 `/app/data`，并且重启前后使用同一个 `SESSION_ENCRYPTION_KEY`。如果密钥或 `data/sessions.enc` 丢失，已保存的加密会话无法恢复，需要重新登录。`JWT_SECRET` 仅用于旧版兼容，不能解密当前保存的会话。

### 快照恢复失败

确认已经选择正确的虚拟服务器、快照文件格式正确，并且 ServerQuery 账号拥有快照部署权限。

### Docker Hub 连接超时

如果构建时出现 `registry-1.docker.io`、`context deadline exceeded` 或 `Client.Timeout exceeded`，说明 Docker 无法正常访问 Docker Hub，并非项目代码错误。

`一键启动.bat` 会先通过 Docker Hub 构建；连接失败后会自动改用 [DaoCloud 公共镜像](https://github.com/DaoCloud/public-image-mirror) 重试两次。该镜像采用地址前缀方式代理 Docker Hub，镜像内容与源站保持一致。

如果三次尝试仍然失败，请在 Docker Desktop 的代理或 Docker Engine 配置中设置当前网络可用的代理/镜像加速服务，应用配置并重启 Docker Desktop，然后再次运行脚本。

### 提示 `no matching manifest for windows`

这表示 Docker Desktop 当前使用的是 Windows 容器，而本项目使用 Linux 容器。请右键任务栏通知区域的 Docker Desktop 鲸鱼图标，选择 **Switch to Linux containers**，等待 Docker Desktop 重启完成后，再运行 `一键启动.bat`。

启动脚本会在构建前检查容器模式；如果检测到 Windows 容器，会直接停止并显示切换提示，不再重复下载镜像。

## 上游项目与许可证

本项目基于 [joni1802/ts3-manager](https://github.com/joni1802/ts3-manager) 修改。原项目及本项目代码按照仓库中的 MIT License 使用。
