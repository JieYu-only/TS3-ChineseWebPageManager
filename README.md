# TS3 Manager 中文控制台

TS3 Manager 是一个基于浏览器的 TeamSpeak 3 ServerQuery 管理面板。本项目在原版 TS3 Manager 的基础上重新设计了中文控制台界面，并完善了服务器列表、实时在线、权限密钥、黑名单和快照管理体验。

> 本项目不是 TeamSpeak 服务器。使用前必须准备一台可访问的 TeamSpeak 3 服务器，以及拥有相应权限的 ServerQuery 账号。

## 项目特色

- 现代化中文控制台，提供统一的顶部栏、侧边栏、面包屑和管理标签页
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
- 选择当前管理的虚拟服务器
- 启动、停止、创建、编辑和删除虚拟服务器
- 查看频道结构与在线用户

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

## Docker 部署（推荐）

### Windows 一键管理

Windows 用户可以直接双击项目根目录中的脚本：

| 文件 | 用途 |
| --- | --- |
| `一键启动.bat` | 检查 Docker、生成本机密钥、构建镜像、启动容器并打开管理页面 |
| `一键停止.bat` | 停止服务，但保留容器和配置 |
| `一键重启.bat` | 重启现有服务；尚未创建容器时自动执行首次启动 |
| `查看日志.bat` | 显示最近 200 行日志并持续跟踪，按 `Ctrl+C` 退出 |
| `更新并启动.bat` | 安全检查上游更新，然后重新构建和启动 |

首次启动前可以复制并编辑 `.env.example`，或直接运行 `一键启动.bat`。脚本会自动创建 `.env` 并生成随机 `JWT_SECRET`。

脚本会优先使用新版 `docker compose`，其次尝试旧版 `docker-compose`；如果两者都未安装，则自动使用原生 `docker build` 和 `docker run`，无需额外安装 Compose。

如需限制可连接的 TeamSpeak 服务器，请编辑生成的 `.env`：

```dotenv
WEB_PORT=8080
JWT_SECRET=自动生成，请勿随意修改
WHITELIST=ts3.example.com,192.0.2.10
```

`.env` 已被 Git 忽略，不会被正常提交到代码仓库。

“更新并启动”检测到未提交的源码修改时会跳过远程拉取，只重新构建当前版本，避免覆盖定制页面。

### 1. 构建本项目镜像

```powershell
cd C:\Users\cjy19\Desktop\work\ts3-manager
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

登录后先在“服务器列表”中选择需要管理的虚拟服务器。密钥、黑名单、快照、频道和权限操作均针对当前选择的服务器。

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

## 上游项目与许可证

本项目基于 [joni1802/ts3-manager](https://github.com/joni1802/ts3-manager) 修改。原项目及本项目代码按照仓库中的 MIT License 使用。
