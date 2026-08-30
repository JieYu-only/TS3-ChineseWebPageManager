# 外部环境发布验收记录

> 本表用于 Docker、真实 HTTPS 反向代理和真实 TeamSpeak 环境验收。自动化测试通过不能替代这些项目。全部 P0 项完成并附证据前，发布状态保持 `NOT RELEASE READY`。

## 1. 验收信息

| 项目 | 填写值 |
|------|--------|
| Git 提交 SHA | （待填写，必须与 CI artifact 元数据一致） |
| CI 运行链接 | （待填写） |
| Windows artifact 名称 | （待填写） |
| Windows EXE SHA-256 | （待填写，并与 `server.exe.sha256` 核对） |
| 执行人 / 复核人 | （待填写） |
| 验收日期 | （待填写） |

## 2. Docker

执行并保存完整日志：

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --no-color
```

| 检查项 | 结果 | 证据 / 备注 |
|--------|------|-------------|
| 镜像无缓存构建成功 | 待执行 | |
| `/api/health` 返回 200 和 `status: ok` | 待执行 | |
| 容器重启后服务恢复 | 待执行 | |
| `data/` 使用持久化卷 | 待执行 | |
| 重启后 remembered session 可恢复 | 待执行 | |
| 日志不包含密码、密钥或文件传输凭据 | 待执行 | |

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
| 登录失败、登录成功及退出 | 待执行 | |
| 保持登录、刷新页面及服务重启恢复 | 待执行 | |
| 切换虚拟服务器 | 待执行 | |
| 客户端、频道、权限、封禁等主要管理功能 | 待执行 | |
| 零字节、小文件、近上限文件上传 | 待执行 | |
| 下载成功且哈希一致 | 待执行 | |
| 取消、断网、目标关闭及超时处理 | 待执行 | |
| ticket 过期、复用、跨会话和方向不匹配均被拒绝 | 待执行 | |
| 失败后并发名额释放，可再次传输 | 待执行 | |

## 5. 发布判定

- 任一 P0 项为“待执行”或“失败”：`NOT RELEASE READY`。
- 失败项必须关联缺陷编号、负责人和修复期限。
- 全部通过后，由执行人和复核人签名，并在 `docs/release-readiness.md` 回填本记录及证据链接后，才能改为 `RELEASE READY`。

