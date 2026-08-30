# 外部环境发布验收记录

> 本表用于发布环境验收。当前发布方式确定为 **Windows 原生 EXE**，因此 Docker 项标记为不适用；真实 HTTPS 反向代理和真实 TeamSpeak 项仍需独立提供证据。自动化测试通过不能替代真实环境验收。

## 1. 验收信息

| 项目 | 填写值 |
|------|--------|
| Git 提交 SHA | `c857e298075738b9f937b0e05ed8b2eecf0d6e36`（与 artifact 元数据一致） |
| CI 运行链接 | https://github.com/JieYu-only/TS3-ChineseWebPageManager/actions/runs/33309578780 |
| Windows artifact 名称 | `ts3-manager-windows-x64-c857e298075738b9f937b0e05ed8b2eecf0d6e36` |
| Windows EXE SHA-256 | `1ba36e020c95220f7446575c5af108d0b118b32924b0214d7e57d2c19c56e485`（实际文件、`.sha256`、metadata 三方一致） |
| Windows EXE 大小 | 74,502,485 字节 |
| CI Node / npm | Node v22.23.2 / npm 10.9.8 |
| 部署方式 | Windows 原生 EXE |
| 执行人 / 复核人 | Codex（自动执行）/ jieyu（环境提供与结果确认） |
| 验收日期 | 2026-08-31 |

## 2. Docker（不适用）

**状态：不适用（N/A）**。本次发布不采用容器部署，以下命令和检查项不作为发布门禁。若未来切换到 Docker 部署，必须重新启用本节并保存完整日志：

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --no-color
```

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| 镜像无缓存构建成功 | 不适用 | Windows 原生 EXE 部署 |
| `/api/health` 返回 200 和 `status: ok` | 不适用 | 由 Windows EXE 冒烟测试覆盖 |
| 容器重启后服务恢复 | 不适用 | 无容器运行时 |
| `data/` 使用持久化卷 | 不适用 | Windows 部署改为验证本地持久化数据目录与备份 |
| 重启后 remembered session 可恢复 | 不适用 | 由 Windows EXE 重启恢复测试覆盖 |
| 日志不包含密码、密钥或文件传输凭据 | 不适用 | 由 Windows EXE 运行日志检查覆盖 |

## 3. HTTPS、WSS 与反向代理

生产配置必须显式设置 `WHITELIST`、`ALLOWED_ORIGINS`、`TRUST_PROXY` 和与实际代理层数一致的 `TRUSTED_PROXY_HOPS`。

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| HTTP 自动跳转 HTTPS | 待执行 | |
| Node 服务端口未直接暴露公网 | 待执行 | |
| Cookie 包含 Secure、HttpOnly、SameSite=Strict | 待执行 | |
| HTTPS 页面成功建立 `wss://` Socket.IO | 待执行 | |
| 非允许 Origin 的状态变更请求返回 403 | 待执行 | |
| 日志客户端 IP 与真实客户端一致 | 待执行 | |

## 4. 真实 TeamSpeak 回归

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| 登录失败、登录成功及退出 | 通过（真实成功链路 + 自动化失败链路） | 本地临时 TeamSpeak：Raw Query `10011`、SSH Query `10022` 登录/状态/退出通过；错误凭据统一拒绝由自动化测试覆盖 |
| 保持登录、刷新页面及服务重启恢复 | 通过 | remembered session 在 Windows EXE 进程重启后恢复；`sessions.enc` 存在且不含明文凭据 |
| 切换虚拟服务器 | 通过 | 真实 Socket.IO 查询后选择虚拟服务器，HTTP session 中的 serverId 同步成功 |
| 客户端、频道、权限、封禁等主要管理功能 | 部分通过 | 服务器、频道、客户端列表真实读取通过；未对临时服务器执行权限、封禁等破坏性写操作 |
| 零字节、小文件、近上限文件上传 | 部分通过 | 真实随机命名小文件上传通过；零字节、超限及边界行为由自动化测试覆盖，未在真实服务器做大文件压力测试 |
| 下载成功且哈希一致 | 通过 | 下载内容 SHA-256 与上传前一致 |
| 取消、断网、目标关闭及超时处理 | 自动化通过，真实故障注入未执行 | 自动化覆盖总时限、请求中止及错误释放；未主动关闭本地 TeamSpeak/网络做破坏性测试 |
| ticket 过期、复用、跨会话和方向不匹配均被拒绝 | 自动化通过 | ticket-store 与 file-transfer 测试覆盖 |
| 失败后并发名额释放，可再次传输 | 自动化通过 | file-transfer 测试覆盖 |

> 真实文件传输测试使用唯一随机文件名，下载校验后已通过 `ftdeletefile` 删除；未修改已有文件。测试凭据未写入文件、日志或 Git。本地临时 TeamSpeak 服务器将在验收后关闭。

## 5. 发布判定

- 任一适用的 P0 项为“待执行”或“失败”：`NOT RELEASE READY`；有明确部署决策和替代验收证据的“不适用”项不视为失败。
- 失败项必须关联缺陷编号、负责人和修复期限。
- 全部通过后，由执行人和复核人签名，并在 `docs/release-readiness.md` 回填本记录及证据链接后，才能改为 `RELEASE READY`。
