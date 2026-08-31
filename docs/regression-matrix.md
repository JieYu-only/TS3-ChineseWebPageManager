# TS3 Manager — 功能回归矩阵（Stage 4）

> 本文件是任务要求的**可执行回归矩阵**。每一行给出：前置条件、操作步骤、预期结果、
> 实际结果、证据位置、缺陷编号和复验结果。自动化（mock）、Windows EXE 和真实
> TeamSpeak 结果**分开记录**；mock 与“页面加载”不能替代真实业务操作验证。
>
> 覆盖度图例（见“覆盖度”列）：
> - **自动化-完整**：该业务操作由自动化真实执行并断言了结果。
> - **自动化-部分**：只验证了页面/组件加载、渲染或菜单可见，未执行完整业务写操作。
> - **未执行**：缺少环境（真实 TeamSpeak / 人工视口 / 线上 PWA / 真实代理拓扑），按任务
>   要求记录为未执行，禁止虚构证据。Node 22 干净 `npm ci` 与全量门禁已在隔离副本通过
>   （见 Group 7 / Group 8），不再列为“未执行”。

## 候选与基线

- 分支 `codex/vue3-migration`，HEAD `58914fa7d85e7aaa339b2a8124abdea01c003bf8`。
- 宿主 Node 为 `v24.19.0`；已另用官方便携 Node `v22.23.2` / npm `10.9.8` 在隔离副本
  完成干净 `npm ci` 与全量门禁（见 Group 7）。
- 基线自动化：UI 单元 **181/181**、持久化 **4/4**、服务端 **88/88**、Playwright **30/30**。
- 日期 2026-09-01；执行记录见 `.ai/RESULT.md`；缺陷/复验见本文档末尾“缺陷与复验记录”。

---

## Group 1 — 候选固化与基线

| ID | 检查项 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 1.01 | 候选分支/HEAD/Node/npm/工作区记录 | 工作区未变 | `git branch --show-current`、`git rev-parse HEAD`、`node -v`、`npm -v`、`git status --porcelain` | 记录分支、HEAD、工具版本、工作区改动数 `git status --porcelain` = **95 项**（**90 个已跟踪改动 + 5 个未跟踪项**，为清理 `tmp-node22-final/` 与 `tmp-node22-final.zip` 后的实测值）；`.ai/` 文件受忽略规则影响，**不计入**该计数 | 分支 `codex/vue3-migration`、HEAD `58914fa`、宿主 Node 24 / npm 11.17（Node 22 干净门禁在隔离副本完成）、95 项（90 跟踪 + 5 未跟踪） | 自动化-完整（记录） | `.ai/RESULT.md` §Candidate、`git status --porcelain` | — | 通过 |
| 1.02 | 通信解耦门禁 | 工作区=当前候选 | `npm run check:decoupling` | 业务层无 `$TeamSpeak`/`TeamSpeak` 导入/`$socket`/socket.js/`.execute` | PASS（业务层干净） | 自动化-完整 | `scripts/check-decoupling.js` 输出 | — | 通过 |
| 1.03 | 生产依赖无 Vue 2 / Vuetify 2 | 安装完成 | `npm ls vue@2 vuetify@2 vuex@3 vue-template-compiler@2` | 无 Vue 2/Vuetify 2 | empty（无匹配） | 自动化-完整 | `package-lock.json`、`npm ls` | — | 通过 |
| 1.04 | 生产依赖实际版本 | 安装完成 | `npm ls vue vuetify pinia vue-router` | Vue 3 / Vuetify 3 / Pinia 2 / vue-router 4 | Vue `3.5.42`、Vuetify `3.13.2`、Pinia `2.3.1`、vue-router `4.6.4` | 自动化-完整 | `npm ls` | — | 通过 |

---

## Group 2 — 登录、会话与服务器切换

| ID | 功能域 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 2.01 | 未登录访问受保护页跳转登录 | 无会话 | 访问 `/servers` | 跳到 `/login`，连接按钮禁用 | 跳到 `/login`，按钮禁用 | 自动化-完整 | `e2e/critical-paths.spec.js:9` | — | 通过 |
| 2.02 | 登录失败提示安全错误 | 无会话 | `/login` 填错误 host 连接 | 停留登录页并显示错误文本 | 显示“用户名或密码错误…”，停留登录页 | 自动化-完整 | `e2e/critical-paths.spec.js:17` | — | 通过 |
| 2.03 | 登录成功进入服务器列表 | 无会话 | `/login` 填 `ts3.example.test` 连接 | 进入 `/servers`，显示“E2E 测试服务器”、状态“运行中” | 进入 `/servers`，显示服务器与运行中 | 自动化-完整 | `e2e/critical-paths.spec.js:26` | — | 通过 |
| 2.04 | 已有服务端会话直接恢复 | 注入有效 cookie | 访问 `/servers` | 直接进入服务器列表 | 显示“E2E 测试服务器” | 自动化-部分 | `e2e/critical-paths.spec.js:37` | — | 通过 |
| 2.05 | 已有会话访问登录页跳回 | 注入有效 cookie | 访问 `/login` | 跳到 `/servers` | 跳到 `/servers` | 自动化-部分 | `e2e/critical-paths.spec.js:242` | — | 通过 |
| 2.06 | 根路径重定向 | 无会话 | 访问 `/` | 跳到 `/login` | 跳到 `/login` | 自动化-完整 | `e2e/critical-paths.spec.js:258` | — | 通过 |
| 2.07 | 退出登录 | 注入 cookie 后访问 `/logout` | 访问 `/logout` | 跳到 `/login` | 跳到 `/login`（仅验证 URL 跳转，未断真实会话连接） | 自动化-部分 | `e2e/critical-paths.spec.js:226` | — | 通过 |
| 2.08 | 记住登录/remember-me 持久化 | 真实服务端会话 | 登录勾选记住，重启后尝试恢复 | 会话在预设期限内可恢复 | **未执行**（mock 只注入 cookie；真实 remember-me 生成/校验/过期未验证） | 未执行 | — | — | 待真实环境 |
| 2.09 | 进程重启后会话恢复 | 真实 EXE + 真实会话 | 启动 EXE→登录→停进程→重启 | remembered session 恢复 | **未执行**（无真实环境；服务端 `session.test.js` 只测 API 层不重复计数） | 未执行 | `packages/server/test/session.test.js` | — | 待真实环境 |
| 2.10 | 会话过期/断线处理 | 真实服务端 | 会话过期或断线后操作 | 统一错误码、安全断开 | **未执行** | 未执行 | — | — | 待真实环境 |
| 2.11 | 服务器列表与虚拟服务器切换 | 会话 + 多 vserver 数据 | 加载服务器列表、选择虚拟服务器 | 列表显示、选中后身份/在线状态/断线重连正确 | 仅服务器列表页加载（`/servers`）；**虚拟服务器选择/身份/断线重连未验证** | 自动化-部分 | `e2e/critical-paths.spec.js:26` | — | 待真实环境 |

---

## Group 3 — 在线用户、频道与消息

| ID | 功能域 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 3.01 | 频道树加载 | 会话 | 访问 `/serverviewer` | 显示“实时在线”与“欢迎大厅” | 显示标题与欢迎大厅 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:54`、`:314` | — | 通过 |
| 3.02 | 频道实时事件（在线/更新推送） | 真实 Socket.IO | 频道加入/退出后观察实时更新 | 实时刷新 | **未执行**（mock 不推送实时 socket 事件） | 未执行 | — | — | 待真实环境 |
| 3.03 | 频道编辑菜单 | 会话 | 点击频道树节点 | 显示“编辑频道” | 显示“编辑频道” | 自动化-部分（仅菜单可见） | `e2e/critical-paths.spec.js:331` | — | 通过 |
| 3.04 | 频道创建/删除/移动/排序/密码/spacer | 会话 | 逐项执行创建/删除/移动/排序/设置密码/spacer | 对象创建并反馈 | **未执行**（仅频道编辑菜单可见） | 未执行/部分 | — | — | 待真实环境 |
| 3.05 | 用户管理页加载 | 会话 | 访问 `/clients` | 显示“用户管理” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:150` | — | 通过 |
| 3.06 | 用户编辑/移动/踢出/封禁 | 会话 | 逐项执行编辑/移动/踢出/封禁 | 操作并反馈 | **未执行**（仅用户管理页、黑名单列表加载；封禁实际写入未验证） | 未执行/部分 | — | — | 待真实环境 |
| 3.07 | 服务器组分配（成员多选增删） | 会话 + 组数据 | `/servergroup/9/edit` 移除/添加成员 | 多选增删生效 | 移除 `serveradmin (1)`、添加 `E2E member (2)` | 自动化-完整 | `e2e/critical-paths.spec.js:562` | — | 通过 |
| 3.08 | 消息中心加载 | 会话 | 访问 `/chat` | 显示“消息中心” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:188` | — | 通过 |
| 3.09 | 频道消息/点击选择/路由/激活态 | 会话 | `/chat` 点击“测试频道” | 该频道项激活并落到 `/chat/2`，原频道取消激活 | 落到 `/chat/2`、目标项 `v-list-item--active`、原频道非激活 | 自动化-完整 | `e2e/critical-paths.spec.js:500` | — | 通过 |
| 3.10 | 私聊、未读计数、消息发送/接收 | 真实 Socket.IO | 发送/接收频道与私聊消息，观察未读 | 消息收发、未读计数 | **未执行**（mock 未提供消息收发 socket 事件） | 未执行 | — | — | 待真实环境 |
| 3.11 | 重复进入/切换服务器/退出后无重复监听或事件泄漏 | 会话 | 多次进入/切换/退出后统计监听 | 无重复监听、无事件泄漏 | **未执行**（无监听计数代码路径验证） | 未执行 | — | — | 待真实环境 |

---

## Group 4 — 文件、日志与查询终端

| ID | 功能域 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 4.01 | 文件页加载 | 会话 | 访问 `/files` | 显示“文件管理”与“欢迎大厅” | 显示标题与欢迎大厅 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:70` | — | 通过 |
| 4.02 | 文件树目录节点菜单 | 会话 | 点击文件树目录节点 | 显示“上传文件” | 显示“上传文件” | 自动化-部分（仅菜单可见） | `e2e/critical-paths.spec.js:339` | — | 通过 |
| 4.03 | 文件上传/下载/重命名/删除 | 会话 + 可写通道 | 执行上传、下载、重命名、删除 | 文件系统变化且反馈 | **未执行**（仅文件树加载与节点菜单；服务端 `file-transfer.test.js` 只测 API/ticket 边界） | 未执行/部分 | `packages/server/test/file-transfer.test.js` | — | 待真实环境 |
| 4.04 | 小文件/零字节/中文名/取消/失败/超限/凭证失效 | 会话 + 文件通道 | 逐项覆盖 | 各项按预期处理且正确释放 | **未执行**（仅服务端 API/单元覆盖 ticket、超限、并发槽释放；无真实上传） | 未执行/部分 | `packages/server/test/file-transfer.test.js`、`packages/server/test/ticket-store.test.js` | — | 待真实环境 |
| 4.05 | 浏览器不接触原始文件端口/ftkey | 会话 | 观察文件请求 | 仅经 ticket 间接访问，失败后并发槽释放 | 由 `file-transfer` / `ticket-store` / `security-headers` 测试覆盖的 API 层证据；**浏览器层未扫描** | 自动化-部分 | `packages/server/test/file-transfer.test.js`、`ticket-store.test.js`、`security-headers.test.js` | — | 通过 |
| 4.06 | 日志读取/筛选 | 会话 | 访问 `/logs`，筛选 | 显示“服务器日志”与日志条目 | 显示标题与“E2E server ready”；**筛选操作未验证** | 自动化-部分 | `e2e/critical-paths.spec.js:74` | — | 通过 |
| 4.07 | 查询终端输入/格式化/错误反馈 | 会话 | 访问 `/console`，输入并执行 | 输入回显、格式化显示、错误反馈 | 显示“查询终端”与“格式化显示”；**输入执行/错误反馈未验证** | 自动化-部分 | `e2e/critical-paths.spec.js:154` | — | 通过 |

---

## Group 5 — 管理对象与权限

| ID | 功能域 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 5.01 | Token 列表加载 | 会话 | 访问 `/tokens` | 显示“密钥列表” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:122` | — | 通过 |
| 5.02 | Token 创建（级联 autocomplete） | 会话 + `tokenadd` mock | `/token/add` 选“频道组”→填用户组/频道→创建 | 级联启用并填充，创建反馈 | 频道字段初始禁用→选类型后启用；“Channel Guest”“测试频道”填入；“权限密钥创建成功”并回显 `token-created-by-e2e` | 自动化-完整 | `e2e/critical-paths.spec.js:531` | — | 通过（需串行，见缺陷 D-01） |
| 5.03 | 复制密钥成功/失败提示 | 会话 | 点击复制按钮 | 成功显示“密钥已复制”，失败显示“复制失败…” | 两个分支均验证 | 自动化-完整 | `e2e/critical-paths.spec.js:263`、`:288` | — | 通过 |
| 5.04 | API 密钥管理 | 会话 | 访问 `/apikeys` | 显示“API 密钥” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:125` | — | 通过 |
| 5.05 | 黑名单列表加载 | 会话 | 访问 `/bans` | 显示“黑名单”与封禁记录 | 显示标题与“Reason 01” | 自动化-部分（加载） | `e2e/critical-paths.spec.js:93` | — | 通过 |
| 5.06 | 黑名单排序/分页/批量/确认弹窗 | 会话 + banlist mock | 访问 `/bans`→排序/翻页/勾选/删除所选 | 排序生效、翻页、批量删除确认弹窗 | 翻页见“Reason 26”、按“原因”排序、勾选后“删除所选”启用、确认弹窗出现/取消 | 自动化-完整 | `e2e/critical-paths.spec.js:584` | — | 通过 |
| 5.07 | 黑名单添加/编辑/删除（真实写） | 会话 | 执行添加/编辑删除 | 对象创建并反馈 | **未执行**（仅加载与列表交互；新增/编辑/实际删除未验证） | 未执行 | — | — | 待真实环境 |
| 5.08 | 投诉管理 | 会话 | 访问 `/complaints` | 显示“投诉记录” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:128` | — | 通过 |
| 5.09 | 服务器组/频道组列表 | 会话 | 访问 `/servergroups`、`/channelgroups` | 显示“服务器组”“频道组” | 显示标题 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:132` | — | 通过 |
| 5.10 | 组重命名/删除/复制/新建 | 会话 | 执行组重命名/删除/复制/新建 | 对象变化并反馈 | **未执行** | 未执行 | — | — | 待真实环境 |
| 5.11 | 权限页（服务器/用户/频道组权限）加载 | 会话 | 访问三个权限路由 | 显示三类权限页 | 三个标题均显示 | 自动化-部分（加载） | `e2e/critical-paths.spec.js:204` | — | 通过 |
| 5.12 | 权限读取/筛选/编辑/撤销/保存 | 会话 | 执行权限读取、筛选、编辑、撤销、保存 | 权限持久化并反馈 | **未执行**（仅权限页表格加载；编辑/撤销/保存未验证） | 未执行/部分 | `packages/ui/test/permissionService.test.js` | — | 待真实环境 |
| 5.13 | autocomplete/select 显示值/提交/禁用/分组/多选/清空 | 会话 | 使用各下拉控件 | 正确显示值、禁用项、分组、多选、清空 | 仅 key-type 级联（5.02）与组成员多选（3.07）覆盖；**禁用项/分组/清空未逐类验证** | 自动化-部分 | `e2e/critical-paths.spec.js:531`、`:562`、`packages/ui/test/*Service.test.js` | — | 部分 |

---

## Group 6 — 快照、设置、主题与 PWA

| ID | 功能域 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 6.01 | 快照页加载 | 会话 | 访问 `/snapshot` | 显示“服务器快照”与“创建快照” | 显示标题与“创建快照” | 自动化-部分（加载） | `e2e/critical-paths.spec.js:171` | — | 通过 |
| 6.02 | 快照创建/下载/上传/部署 | 会话 | 执行创建、下载、上传、部署 | 快照生成/下发并反馈 | **未执行** | 未执行 | `packages/ui/test/snapshotService.test.js` | — | 待真实环境 |
| 6.03 | 服务器设置各分组渲染 | 会话 | 访问 `/server/edit` | 显示“主机信息”“日志设置” | 显示两个分组标题 | 自动化-部分（渲染） | `e2e/critical-paths.spec.js:404`、`:416` | — | 通过 |
| 6.04 | 服务器设置保存/应用/校验/状态 | 会话 | 修改设置并保存/应用 | 设置保存、校验错误、状态变化 | **未执行**（仅分组渲染与展开；保存/校验未验证） | 未执行/部分 | — | — | 待真实环境 |
| 6.05 | expansion panel 展开交互 | 会话 | 点击“主机信息” | 展开显示内容 | 显示 `.v-expansion-panel-text` | 自动化-完整 | `e2e/critical-paths.spec.js:480` | — | 通过 |
| 6.06 | 深浅主题切换并持久化 | 无会话 | 登录页点击主题切换 | 主题类翻转且设置持久化 | `dark` 类翻转（`afterDark === !initiallyDark`）；store 持久化由 persist 测试覆盖 | 自动化-部分 | `e2e/critical-paths.spec.js:362`、`packages/ui/test/persist.test.cjs` | — | 通过 |
| 6.07 | 图标/通知 | 会话 | 触发通知/查看图标 | 图标渲染、通知正确 | **未执行**（复制密钥成功/失败提示由 5.03 覆盖；全局通知/图标视觉未验证） | 自动化-部分 | `e2e/critical-paths.spec.js:263`、`:288` | — | 通过 |
| 6.08 | 桌面/移动端关键页面视觉与可操作性 | 人工视口 | 桌面 + 移动视口逐页检查 | 无阻断布局问题 | 1280×720 与 390×844 检查服务器、在线、文件、权限、消息、黑名单和设置页；修复 Vuetify 3 主题/表格选择器、移动表格挤压和登录版本重复前缀；复验无文档级横向溢出 | 人工-完整 | `.ai/RESULT.md` 最新执行记录、`packages/ui/src/assets/css/style.css` | S4-UI-01/02 | 通过 |
| 6.09 | PWA manifest/SW/离线资源/更新流程 | Chrome + localhost live host | 在线加载后停止 EXE并从新标签访问 SPA；比较重建前后入口哈希；请求旧入口 | manifest/静态资源可离线；SPA fallback 生效；新 SW 接管并清理旧资源；API/Socket 为 NetworkOnly | 首次离线失败暴露 D-05；修复后服务器完全离线时新标签可冷启动完整 `/login`；入口由 `index-BWKP6doG.js` 更新为 `index-tislr8hN.js`，旧入口请求不再返回旧脚本而进入 navigation fallback；`skipWaiting`、`clientsClaim`、`cleanupOutdatedCaches` 与 API/Socket `NetworkOnly` 均保留 | 真实浏览器-完整（本机） | `packages/ui/vite.config.js`、`packages/ui/src/pwa/migrateLegacyServiceWorker.js`、`.ai/RESULT.md` 最新执行记录 | D-05 已修复 | 通过 |

---

## Group 7 — Windows EXE 与真实 TeamSpeak

| ID | 检查项 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 7.01 | Node 22 干净环境 `npm ci` | Node 22 干净环境 | `npm ci` 后全量测试 | exit 0，依赖安装成功 | 官方 Node v22.23.2（SHA-256 已核对）隔离副本 `npm ci` 成功；lint、177 UI、4 persist、87 server、build、30 E2E 全通过 | 自动化-完整 | `.ai/RESULT.md` 最新执行记录 | — | 通过 |
| 7.02 | 当前候选 Windows x64 EXE 构建 | 工作区=当前候选 | `npm run build --workspace=@ts3-manager/server`（`pkg . --target node22`） | 生成 server.exe，不复用历史产物 | PASS，生成 `packages/server/server.exe`（gitignored） | 自动化-完整 | `packages/server/server.exe` | — | 通过 |
| 7.03 | EXE `/api/health` | 启动 EXE | `PORT=8091` 与 `--port 8092` 两路径请求 `/api/health` | 200 且 `{status:ok}` | 两路径均 200 | 自动化-完整 | `.ai/RESULT.md` §EXE artifact | — | 通过 |
| 7.04 | EXE 主页/静态资源/Socket.IO | 启动最终 EXE（`PORT=8094`）+ UI `dist` 已随包 | 访问 `/`、`/manifest.webmanifest`、`/socket.io/?EIO=4&transport=polling`，再停止进程 | 主页/清单返回 200；Socket.IO 握手返回 open 包；停止后端口/进程释放 | health、主页、manifest、Engine.IO 均 200；主页含 `#app`，握手返回 open packet；停止后 8094 端口监听 0、EXE 进程 0。此前 8093 冒烟另验证无会话 namespace 被鉴权拒绝 | 自动化-完整（独立 EXE 冒烟） | `.ai/RESULT.md` 最新执行记录 | — | 通过 |
| 7.05 | EXE 停止与端口/进程释放 | 停止 EXE | 停止后检查端口与 `server.exe` 进程 | 端口监听 0、进程残留 0 | 停止后端口释放（`PORT` 与 `--port` 两路径） | 自动化-完整 | `.ai/RESULT.md` §EXE artifact | — | 通过 |
| 7.06 | 真实 TeamSpeak Raw Query（10011）登录/读取/切换/可恢复写 | 本机隔离 TeamSpeak | Raw Query 登录、读服务器/频道/用户、选择 sid=1、临时改名并恢复 | 全部成功并反馈 | 登录、读取、选择、事件注册、临时改名及恢复均通过；退出后 Socket 主动断开 | 真实环境-完整（本机） | `.ai/RESULT.md` 最新执行记录 | D-03 已修复 | 通过 |
| 7.07 | 真实 TeamSpeak SSH Query（10022） | 本机隔离 TeamSpeak | SSH Query 登录与会话建立 | 全部成功并反馈 | SSH 登录 200、会话状态有效；remembered session 跨最终 EXE 重启后恢复 | 真实环境-主要路径 | `.ai/RESULT.md` 最新执行记录 | — | 通过 |
| 7.08 | 小文件传输、退出、EXE 重启恢复、持久化、日志脱敏 | 本机隔离 TeamSpeak | 上传/下载小文件、退出、重启 EXE 恢复会话、检查日志无凭据 | 达标且无明文凭据 | 38 字节测试文件上传/下载及 SHA-256 一致，测试文件已删除；remembered session、serverId、Socket 跨 EXE 重启恢复；临时日志/会话目录已删除 | 真实环境-完整（小文件） | `.ai/RESULT.md` 最新执行记录 | — | 通过 |

---

## Group 8 — 安全与发布证据

| ID | 检查项 | 前置条件 | 操作步骤 | 预期结果 | 实际结果 | 覆盖度 | 证据位置 | 缺陷 | 复验 |
|----|--------|----------|----------|----------|----------|--------|----------|------|------|
| 8.01 | `npm audit --omit=dev` | 安装完成 | `npm audit --omit=dev` | 记录生产漏洞 | **0 vulnerabilities** | 自动化-完整 | `.ai/RESULT.md` §验证表 | — | 通过 |
| 8.02 | Vuetify 2 从生产依赖/产物消失 | 安装完成 | `npm ls vue@2 vuetify@2`、检查依赖树 | 无 Vue 2/Vuetify 2 | 无 Vue 2/Vuetify 2；Vue 3.5.42 / Vuetify 3.13.2 | 自动化-完整 | `package-lock.json`、`npm ls` | — | 通过 |
| 8.03 | 剩余漏洞逐项记录 | 审计后 | 对非零项记录路径/影响/利用条件/处置 | 逐项登记 | 本候选审计为 0，无既有清单外新 High/Critical；Vuetify 2 旧公告已因迁移消除 | 自动化-完整 | `docs/security-advisory-assessment.md` | — | 通过 |
| 8.04 | 安全跟踪表基于证据更新 | 审计后 | 更新跟踪表状态 | 关闭/替换旧风险接受 | 本候选生产树已无 Vuetify 2；旧“Vuetify 原型污染”风险接受随迁移分支消除（见 Group 8 文档更新） | 自动化-部分 | `docs/security-tracker.md` | — | 通过（待评审确认） |
| 8.05 | EXE SHA-256 与构建元数据 | EXE 构建后 | 生成 SHA-256、核对三方 | 对应当前候选 | 最终 server.exe SHA-256 `BB42ED3D8E8050FB679ACB95CB57E79F6A7090C146F8562017D541D688DA4B8C`（72,397,111 字节） | 自动化-完整 | `.ai/RESULT.md` 最新执行记录 | — | 通过 |
| 8.06 | README/迁移/安全/发布文档与实际状态一致 | 文档更新后 | 核对文档与 Vue 3/Vuetify 3/Vite 状态 | 一致 | README 主技术栈已更新；迁移、安全、发布、外部环境文档本轮同步更新 | 文档 | `README.md`、`docs/*.md` | — | 通过 |
| 8.07 | `git diff --check` 无错误、无敏感信息/意外产物 | 收尾 | `git diff --check`、`git status --short` | 干净、无敏感/临时文件 | `git diff --check` 干净；无敏感信息；EXE（gitignored）与 PWA 产物符合约定位置 | 自动化-完整 | `.ai/RESULT.md` §Final integrity | — | 通过 |
| 8.08 | 未执行未授权提交/推送/合并/Release/发布 | 收尾 | `git log`、`git status` | 无未授权发布操作 | 无提交/推送/合并/Release；工作区保持未提交 | 自动化-完整 | `.ai/RESULT.md` §Deviations | — | 通过 |

---

## 缺陷与复验记录

| 编号 | 严重度 | 现象 | 根因 | 影响 | 修复文件 | 针对性测试 | 复验结果 |
|------|--------|------|------|------|----------|-----------|----------|
| D-01 | 低（测试稳定性） | `深色主题切换` 与 `密钥类型级联` 两条测试在默认并行执行下间歇失败 | 并行 worker 共享同一 mock 会话/资源状态，级联下拉数据加载时序竞争；主题断言在 theme DOM 更新完成前执行 | 并行执行时套件偶发不达 30/30 | `playwright.config.js`（`fullyParallel:false` + `workers:1`）；`e2e/critical-paths.spec.js:543`（级联后 `waitForTimeout(600)`）；`:382`（主题翻转后 `waitForTimeout(300)`） | 串行复跑 **30/30** | 通过（串行门禁稳定；并发隔离未单独证明，见已知问题） |
| D-02 | 信息 | 旧报告出现“矩阵未生成”/`WEB_PORT` 端口验证错误/“并发波动未处理”三处自相矛盾 | 历史轮次与后续轮次结论叠加，未标注取代关系 | 文档结论不一致，误导验收 | `.ai/RESULT.md`（本轮清理，标注历史条目已取代） | 无（文档） | 通过（见 Known issues） |

---

## 未执行（外部环境）汇总 — 记录为未执行，禁止虚构

- TeamSpeak Raw/SSH、已认证 Socket.IO、可恢复写、小文件传输、退出及 EXE 重启会话恢复
  已在本机隔离 TeamSpeak 上通过；尚未覆盖近上限文件、真实断网/超时故障注入及多服务器切换。
- PWA 已在安装浏览器插件的 Chrome + localhost live host 完成离线冷启动、导航兜底和版本更新验收。
- HTTPS/WSS 已在本机隔离 TLS 代理拓扑通过；正式部署仍需按实际代理层数复核客户端 IP。

以上按任务要求“缺少环境时准确记录，禁止虚构”记录为**未执行**；补齐后应在对应行
填写实际结果、证据位置与复验结果并同步 `.ai/RESULT.md`。Node 22 干净 `npm ci` 与全量
门禁已在隔离副本通过（Group 7 / Group 8），**不属于**未执行项。
