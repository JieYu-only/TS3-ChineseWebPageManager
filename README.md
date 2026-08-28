# TS3 Manager 中文控制台

TS3 Manager 是一个基于浏览器的 TeamSpeak 3 ServerQuery 管理面板。本项目在原版 TS3 Manager 的基础上重新设计了中文控制台界面，并完善了服务器列表、实时在线、权限密钥、黑名单和快照管理体验。

> 本项目不是 TeamSpeak 服务器。使用前必须准备一台可访问的 TeamSpeak 3 服务器，以及拥有相应权限的 ServerQuery 账号。

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

开发者也可以双击 `构建Windows版.bat` 从当前源码生成 EXE。构建需要 Node.js 和网络连接；普通使用者直接下载 Release 中的 EXE 即可。

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
cd "C:\Users\cjy19\Desktop\work\TS3-ChineseWebPageManager"
docker build -t ts3-manager-custom .
```

### 2. 启动容器

```powershell
docker run -d `
  --name ts3-manager `
  --restart unless-stopped `
  -p 8080:8080 `
  -e JWT_SECRET="请替换成足够长的随机字符串" `
  -e WHITELIST="你的TS3服务器IP或域名" `
  ts3-manager-custom
```

启动后访问：

```text
http://localhost:8080
```

部署在远程服务器时访问：

```text
http://服务器IP:8080
```

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
    environment:
      PORT: "8080"
      JWT_SECRET: "请替换成足够长的随机字符串"
      WHITELIST: "ts3.example.com,192.0.2.10"
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
| `JWT_SECRET` | 加密和解密登录令牌的密钥 | 每次启动随机生成 |
| `WHITELIST` | 允许连接的 TS3 地址，多个地址以英文逗号分隔 | 允许任意地址 |

生产环境必须固定 `JWT_SECRET`。如果使用随机值，容器重启后，浏览器中保存的连接信息可能无法继续解密。

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

项目为 npm workspace，前端使用 Vue 2 与 Vuetify 2，后端使用 Node.js、Express 和 Socket.IO。

由于原项目工具链较旧，推荐使用 Node.js 16 进行前端构建。

### 安装依赖

```powershell
npm install --prefix .\packages\ui
npm install --prefix .\packages\server
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

若本机 Node.js 版本与旧版 Vue CLI 不兼容，请使用 Dockerfile 提供的构建环境。

## 安全建议

- 不要将未启用 HTTPS 的管理面板直接暴露到公网
- 推荐使用 Nginx、Caddy 或其他反向代理配置 HTTPS
- 为 ServerQuery 创建独立账号并遵循最小权限原则
- 限制 ServerQuery 可连接的来源 IP
- 设置固定且足够随机的 `JWT_SECRET`
- 使用 `WHITELIST` 限制面板能够连接的 TS3 服务器
- 不要把 `10011/TCP` 向整个公网开放
- 恢复快照前先下载当前配置备份
- 不要上传来源不明的 `.backup` 文件

## 项目结构

```text
packages/
├── server/    Node.js 后端与 ServerQuery/WebSocket 通信
└── ui/        Vue 2 + Vuetify 管理控制台
```

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

检查是否配置了固定的 `JWT_SECRET`，并确认重启前后使用的是同一个值。

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
