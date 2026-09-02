const { test, expect } = require('@playwright/test')

async function fillLogin(page, host = 'ts3.example.test') {
  await page.getByPlaceholder('IP 地址或域名').fill(host)
  await page.getByPlaceholder('例如 serveradmin').fill('serveradmin')
  await page.getByLabel('密码', { exact: true }).fill('test-password')
}

const validSessionCookie = [
  { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
]

// Reset the mock's mutable counters/deleted-state so a test observes a clean
// server (the mock server is one shared process across the suite).
async function resetMock(page) {
  await page.evaluate(async () => {
    await fetch('/api/test/reset', { method: 'POST' })
  })
}

async function getStats(page) {
  return page.evaluate(async () => (await fetch('/api/stats')).json())
}

// Tree helpers: expand a group node (its first button is the expand toggle) and
// check a node's selection checkbox (Vuetify 3 `v-checkbox-btn` native input).
async function expandFileNode(page, label) {
  const node = page.locator('.v-treeview .v-list-item', { hasText: label }).first()
  await node.locator('button').first().click()
  await page.waitForTimeout(600)
}

async function checkFileNode(page, label) {
  const node = page.locator('.v-treeview .v-list-item', { hasText: label }).first()
  if ((await node.count()) === 0) throw new Error(`file tree node not found: ${label}`)
  await node.locator('.v-checkbox-btn input[type="checkbox"]').click({ force: true })
}

test('未登录访问受保护页面时跳转到登录页', async ({ page }) => {
  await page.goto('/servers')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: '连接服务器' })).toBeVisible()
  await expect(page.getByRole('button', { name: /连接控制台/ })).toBeDisabled()
})

test('登录失败时保留登录页并显示安全错误信息', async ({ page }) => {
  await page.goto('/login')
  await fillLogin(page, 'fail.example')
  await page.getByRole('button', { name: /连接控制台/ }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('用户名或密码错误，或者无法连接到目标服务器')).toBeVisible()
})

test('登录成功后进入服务器列表并显示真实页面结构', async ({ page }) => {
  await page.goto('/login')
  await fillLogin(page)
  await page.getByRole('button', { name: /连接控制台/ }).click()

  await expect(page).toHaveURL(/\/servers$/)
  await expect(page.getByRole('heading', { name: '服务器列表' })).toBeVisible()
  await expect(page.getByText('E2E 测试服务器')).toBeVisible()
  await expect(page.getByText('运行中')).toBeVisible()
})

test('已有服务端会话时可直接恢复受保护页面', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/servers')
  await expect(page).toHaveURL(/\/servers$/)
  await expect(page.getByText('E2E 测试服务器')).toBeVisible()
})

test('核心管理页面可加载频道树、文件入口和服务器日志', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/serverviewer')
  await expect(page.getByRole('heading', { name: '实时在线' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()

  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()

  await page.goto('/logs')
  await expect(page.getByRole('heading', { name: '服务器日志' })).toBeVisible()
  await expect(page.getByText('E2E server ready')).toBeVisible()
})

test('移动端登录页无水平溢出且主要控件可见', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: '连接服务器' })).toBeVisible()
  await expect(page.getByRole('button', { name: /连接控制台/ })).toBeVisible()

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth
  }))
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth)
})

test('管理页面黑名单可加载并显示封禁记录', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/bans')
  await expect(page.getByRole('heading', { name: '黑名单' })).toBeVisible()
  await expect(page.getByText('Reason 01')).toBeVisible()
})

test('密钥、API 密钥与投诉管理页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/tokens')
  await expect(page.getByRole('heading', { name: '密钥列表' })).toBeVisible()

  await page.goto('/apikeys')
  await expect(page.getByRole('heading', { name: 'API 密钥' })).toBeVisible()

  await page.goto('/complaints')
  await expect(page.getByRole('heading', { name: '投诉记录' })).toBeVisible()
})

test('服务器组、频道组与用户管理页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/servergroups')
  await expect(page.getByRole('heading', { name: '服务器组' })).toBeVisible()

  await page.goto('/channelgroups')
  await expect(page.getByRole('heading', { name: '频道组' })).toBeVisible()

  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible()
})

test('查询终端页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/console')
  await expect(page.getByRole('heading', { name: '查询终端' })).toBeVisible()
  await expect(page.getByText('格式化显示')).toBeVisible()
})

test('备份与快照页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/snapshot')
  await expect(page.getByRole('heading', { name: '服务器快照' })).toBeVisible()
  await expect(page.getByText('创建快照')).toBeVisible()
})

test('消息中心页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()
})

test('权限管理页可加载', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/permissions/servergroup')
  await expect(page.getByRole('heading', { name: '服务器组权限' })).toBeVisible()

  await page.goto('/permissions/client')
  await expect(page.getByRole('heading', { name: '用户权限' })).toBeVisible()

  await page.goto('/permissions/channel')
  await expect(page.getByRole('heading', { name: '频道权限' })).toBeVisible()
})

test('退出登录后跳转到登录页', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/logout')
  await expect(page).toHaveURL(/\/login$/)
})

test('已有会话时访问登录页会跳转到服务器列表', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/login')
  await expect(page).toHaveURL(/\/servers$/)
})

test('根路径重定向到登录页', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

test('复制密钥成功时提示已复制', async ({ context, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} }
    })
  })

  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/tokens')
  await expect(page.getByText('token-e2e-abc')).toBeVisible()
  await page.locator('button:has(.mdi-content-copy)').click()
  await expect(page.getByText('密钥已复制')).toBeVisible()
})

test('复制密钥失败时提示手动复制', async ({ context, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    })
    document.execCommand = () => false
  })

  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/tokens')
  await expect(page.getByText('token-e2e-abc')).toBeVisible()
  await page.locator('button:has(.mdi-content-copy)').click()
  await expect(page.getByText('复制失败，请手动复制')).toBeVisible()
})

test('最小纵切面：频道树节点菜单可触发且无意外错误通知', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/serverviewer')
  await expect(page.getByRole('heading', { name: '实时在线' })).toBeVisible()

  // The channel node renders a clickable label that opens its action menu.
  const channelNode = page.locator('.v-treeview .tree-node-label').first()
  await expect(channelNode).toContainText('欢迎大厅')
  await channelNode.click()
  await expect(page.getByText('编辑频道')).toBeVisible()

  // No unexpected error notification from the admin console.
  await expect(page.getByText('操作失败，请检查输入和服务器状态')).toHaveCount(0)
})

test('最小纵切面：文件树目录节点菜单可触发且无意外错误通知', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()

  const folderNode = page.locator('.v-treeview .tree-node-label').first()
  await expect(folderNode).toContainText('欢迎大厅')
  await folderNode.click()
  await expect(page.getByText('上传文件')).toBeVisible()

  await expect(page.getByText('操作失败，请检查输入和服务器状态')).toHaveCount(0)
})

test('最小纵切面：深色主题切换可生效', async ({ page }) => {
  await page.goto('/login')
  const app = page.locator('.v-application')
  await expect(app).toBeVisible()

  const initiallyDark = await app.evaluate((el) =>
    el.classList.contains('v-theme--dark')
  )
  const toggle = page.locator(
    'button[aria-label="切换到深色主题"], button[aria-label="切换到浅色主题"]'
  )
  await expect(toggle).toBeVisible()
  await toggle.click()

  await page.waitForTimeout(300)
  const afterDark = await app.evaluate((el) =>
    el.classList.contains('v-theme--dark')
  )
  // The Vuetify 3 theme changed (dark <-> light), and the persisted setting is
  // kept in sync by the toggle.
  expect(afterDark).toBe(!initiallyDark)
})

test('最小纵切面：v-data-table 表头按 Vuetify 3 title/key 渲染', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/bans')
  await expect(page.getByRole('heading', { name: '黑名单' })).toBeVisible()
  // The converted `title`/`key` headers must render their column titles.
  await expect(page.getByText('过期时间')).toBeVisible()
  await expect(page.getByText('IP / 名称 / UID')).toBeVisible()
})

test('最小纵切面：expansion panel 用 Vuetify 3 标题/内容结构渲染', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/server/edit')
  await expect(page.getByText('主机信息')).toBeVisible()
  await expect(page.getByText('日志设置')).toBeVisible()
})

test('最小纵切面：列表子标题用 Vuetify 3 v-list-subheader 渲染', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/servergroups')
  await expect(page.getByRole('heading', { name: '服务器组' })).toBeVisible()
  await expect(page.locator('.v-list-subheader__text').filter({ hasText: '常规服务器组' })).toBeVisible()
})

test('最小纵切面：关键路由收集 console 错误/警告与 pageerror 并断言为空', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  const collected = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') collected.push(`[${m.type()}] ${m.text()}`)
  })
  page.on('pageerror', (e) => collected.push(`[pageerror] ${e}`))

  const routes = [
    '/tokens', '/bans', '/servers', '/serverviewer', '/files', '/logs', '/console',
    '/permissions/servergroup', '/permissions/client', '/permissions/channel',
    '/servergroups', '/channelgroups', '/snapshot', '/chat', '/clients', '/complaints',
    '/apikeys', '/server/edit'
  ]
  for (const r of routes) {
    await page.goto(r)
    await page.waitForTimeout(700)
  }

  // Ignore the Playwright-injected SW-block notice, the browser Canvas2D hint,
  // and chromium's network-resource error log (the external update-check GitHub
  // request is blocked in this offline test env and is handled silently by the
  // app). Fail on any Vue/Vuetify/JS warning or page error.
  const bad = collected.filter((l) => {
    if (/Service Worker registration blocked by Playwright/.test(l)) return false
    if (/willReadFrequently/.test(l)) return false
    if (/Failed to load resource/.test(l)) return false
    return true
  })
  expect(bad).toEqual([])
})

test('最小纵切面：expansion panel 可点击展开并显示内容', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/server/edit')
  const title = page.getByText('主机信息')
  await expect(title).toBeVisible()
  await title.click()
  // The expansion panel text should become visible after expanding.
  await expect(page.locator('.v-expansion-panel-text').first()).toBeVisible()
})

test('最小纵切面：消息频道点击后该频道项自身激活并落到正确路由', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()

  // Channel list is the `my-2` v-list of `.v-list-item` channel rows.
  const targetItem = page.locator('.v-list.my-2 .v-list-item', { hasText: '测试频道' }).first()
  await expect(targetItem).toBeVisible()

  await targetItem.click()
  await page.waitForTimeout(1200)

  // Navigation landed on the clicked channel's route and THAT item is active.
  await expect(page).toHaveURL(/\/chat\/2$/)
  await expect(targetItem).toHaveClass(/v-list-item--active/)

  // The previously-joined channel is no longer active.
  const firstItem = page.locator('.v-list.my-2 .v-list-item', { hasText: '欢迎大厅' }).first()
  await expect(firstItem).not.toHaveClass(/v-list-item--active/)
})

test('高风险交互：密钥类型切换会启用并填充级联自动完成框', async ({ context, page }) => {
  await context.addCookies([{ name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  await page.goto('/token/add')

  const channelField = page.getByLabel('频道', { exact: true })
  await expect(channelField).toBeDisabled()

  const tokenTypeField = page.getByRole('combobox', { name: '密钥类型', exact: true })
  await tokenTypeField.locator('..').click()
  // Vuetify animates and replaces overlay nodes while opening. Dispatching the
  // click on the settled option avoids Playwright retrying a detached node.
  const channelGroupOption = page.getByRole('option', { name: '频道组' })
  await expect(channelGroupOption).toBeVisible()
  await channelGroupOption.evaluate((element) => element.click())
  await expect(channelField).toBeEnabled()
  // Let the async cascade (channel-group list + channel list) settle before the
  // autocomplete interactions, so the mocked items are loaded.
  await page.waitForTimeout(600)

  const groupField = page.getByRole('combobox', { name: '用户组' })
  await groupField.press('Control+A')
  await groupField.fill('Channel Guest')
  await groupField.press('ArrowDown')
  await groupField.press('Enter')
  await expect(groupField).toHaveValue('Channel Guest')
  const channelCombobox = page.getByRole('combobox', { name: '频道', exact: true })
  await channelCombobox.press('Control+A')
  await channelCombobox.fill('测试频道')
  await channelCombobox.press('ArrowDown')
  await channelCombobox.press('Enter')
  await expect(channelCombobox).toHaveValue('测试频道')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.getByText('权限密钥创建成功')).toBeVisible()
  await expect(page.getByLabel('生成的权限密钥')).toHaveValue('token-created-by-e2e')
})

test('高风险交互：服务器组成员支持多选添加与移除', async ({ context, page }) => {
  await context.addCookies([{ name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  await page.goto('/servergroup/9/edit')

  await expect(page.getByText('serveradmin (1)')).toBeVisible()
  const removeButton = page.getByRole('button', { name: '移除成员' })
  await expect(removeButton).toBeDisabled()
  await page.getByText('serveradmin (1)').click()
  await expect(removeButton).toBeEnabled()
  await removeButton.click()
  await expect(page.getByText('serveradmin (1)')).toHaveCount(0)

  await page.getByRole('button', { name: '添加成员' }).click()
  await expect(page.getByText('选择用户', { exact: true })).toBeVisible()
  const addButton = page.getByRole('button', { name: '添加', exact: true })
  await expect(addButton).toBeDisabled()
  await page.getByText('E2E member (2)').click()
  await expect(addButton).toBeEnabled()
  await addButton.click()
  await expect(page.getByText('E2E member (2)')).toBeVisible()
})

test('服务器列表 8 列内容对齐：开关/文字同基线、状态文字不换行、单选垂直居中', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'ts3_e2e_session',
      value: 'valid',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }
  ])

  await page.goto('/servers')
  await expect(page.getByRole('heading', { name: '服务器列表' })).toBeVisible()
  await expect(page.locator('.v-data-table thead th')).toHaveCount(8)

  // Structural sanity: the table renders 8 header cells and a full data row.
  await expect(page.locator('.v-data-table tbody tr td')).toHaveCount(8)

  // Content-level alignment: capture the positions of the first server row's
  // selection radio, status switch and status label so we can assert they are
  // vertically centred/on the same baseline (the reported misalignment came from
  // Vuetify 3's default radio/switch margins and the status text wrapping).
  const layout = await page.evaluate(() => {
    const row = document.querySelector('.v-data-table tbody tr')
    const rowRect = row.getBoundingClientRect()
    const rowCenter = rowRect.top + rowRect.height / 2

    const radio = row.querySelector('.v-radio')
    const radioRect = radio ? radio.getBoundingClientRect() : null

    const statusCell = row.querySelector('.status-cell')
    const sw = statusCell ? statusCell.querySelector('.v-switch') : null
    const swRect = sw ? sw.getBoundingClientRect() : null
    const label = statusCell ? statusCell.querySelector('.status-text') : null
    const labelRect = label ? label.getBoundingClientRect() : null

    // The status cell must not overflow its column (no clipped/wrapped control).
    const statusCellRect = statusCell ? statusCell.getBoundingClientRect() : null

    return {
      radioCenter: radioRect ? radioRect.top + radioRect.height / 2 : null,
      rowCenter,
      switchCenter: swRect ? swRect.top + swRect.height / 2 : null,
      labelCenter: labelRect ? labelRect.top + labelRect.height / 2 : null,
      labelHeight: labelRect ? labelRect.height : null,
      statusCellWidth: statusCellRect ? statusCellRect.width : null,
      statusScrollWidth: statusCell ? statusCell.scrollWidth : null
    }
  })

  // Selection radio is vertically centred in its row.
  expect(layout.radioCenter).not.toBeNull()
  expect(Math.abs(layout.radioCenter - layout.rowCenter)).toBeLessThan(15)

  // Status switch and its label share a vertical baseline (same centre line).
  expect(layout.switchCenter).not.toBeNull()
  expect(layout.labelCenter).not.toBeNull()
  expect(Math.abs(layout.switchCenter - layout.labelCenter)).toBeLessThan(8)

  // Status label renders on a single line (not squeezed/wrapped).
  expect(layout.labelHeight).toBeLessThan(30)

  // Status cell content does not overflow the column.
  expect(layout.statusScrollWidth).toBeLessThanOrEqual(layout.statusCellWidth + 2)

  // Footer is inside the card and status control is present in the row.
  const footerInCard = await page.evaluate(() => {
    const footer = document.querySelector('.v-data-table-footer')
    const card = document.querySelector('.v-data-table').closest('.v-card')
    return footer ? card.contains(footer) : false
  })
  expect(footerInCard).toBe(true)
  await expect(page.getByText('运行中')).toBeVisible()
  await expect(page.locator('tbody tr .v-switch').first()).toBeVisible()
})

test('窄屏服务器表格有实际横向滚动范围且页面不横向溢出', async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await context.addCookies([
    { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
  ])

  await page.goto('/servers')
  await expect(page.getByRole('heading', { name: '服务器列表' })).toBeVisible()
  await expect(page.locator('.v-data-table thead th')).toHaveCount(8)

  // The table wrapper must offer a real horizontal scroll range (content wider
  // than the visible container) so narrow screens can reach every column/action.
  // Vuetify 3's scroll container is `.v-table__wrapper` (the `.v-data-table`
  // element itself holds the 940px min-width content and is not the scroller).
  const wrapper = page.locator('.v-table__wrapper, .v-data-table__wrapper').first()
  const scrollable = await wrapper.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    overflowX: getComputedStyle(el).overflowX
  }))
  expect(scrollable.scrollWidth).toBeGreaterThan(scrollable.clientWidth)
  expect(scrollable.overflowX).toBe('auto')

  // Key actions (manage button) remain reachable after scrolling.
  const manage = page.getByRole('button', { name: '管理' }).first()
  await expect(manage).toBeVisible()

  // Body must not overflow horizontally even though the table scrolls inside.
  const layout = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }))
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth)
})

test('实时在线新增入口可展开收起并分别进入创建页面', async ({ context, page }) => {
  await context.addCookies([
    { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
  ])

  await page.goto('/serverviewer')
  await expect(page.getByRole('heading', { name: '实时在线' })).toBeVisible()

  const plus = page.locator('button[aria-label="添加频道或分隔符"]').first()
  await expect(plus).toBeVisible()

  // Expand: both create entries appear.
  await plus.click()
  const createChannel = page.locator('[aria-label="创建频道"]').first()
  const createSpacer = page.locator('[aria-label="创建频道分隔符"]').first()
  await expect(createChannel).toBeVisible()
  await expect(createSpacer).toBeVisible()

  // Collapse: entries are removed again.
  await page.locator('button[aria-label="收起创建菜单"]').first().click()
  await expect(page.locator('[aria-label="创建频道"]')).toHaveCount(0)
  await expect(page.locator('[aria-label="创建频道分隔符"]')).toHaveCount(0)

  // Re-open and navigate to the channel form.
  await plus.click()
  await createChannel.click()
  await expect(page).toHaveURL(/\/channel\/add$/)

  // Back, re-open and navigate to the spacer form.
  await page.goBack()
  await page.waitForTimeout(400)
  await page.locator('button[aria-label="添加频道或分隔符"]').first().click()
  await page.locator('[aria-label="创建频道分隔符"]').first().click()
  await expect(page).toHaveURL(/\/spacer\/add$/)
})

test('实时在线新增入口可通过键盘触发', async ({ context, page }) => {
  await context.addCookies([
    { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
  ])

  await page.goto('/serverviewer')
  await expect(page.getByRole('heading', { name: '实时在线' })).toBeVisible()

  const plus = page.locator('button[aria-label="添加频道或分隔符"]').first()
  await plus.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[aria-label="创建频道"]').first()).toBeVisible()
})

test('消息中心点击频道不移动 Query 客户端且正确切换', async ({ context, page }) => {
  await context.addCookies([
    { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
  ])

  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()

  const targetItem = page.locator('.v-list.my-2 .v-list-item', { hasText: '测试频道' }).first()
  await expect(targetItem).toBeVisible()
  await targetItem.click()
  await page.waitForTimeout(1200)

  // Navigation landed on the clicked channel's route and THAT item is active.
  await expect(page).toHaveURL(/\/chat\/2$/)
  await expect(targetItem).toHaveClass(/v-list-item--active/)

  // No bogus generic failure toast (the Query client was not asked to move).
  await expect(page.getByText('操作失败，请检查输入和服务器状态')).toHaveCount(0)

  // The mock rejects `clientmove`; assert the UI did not issue it at all.
  const stats = await page.evaluate(async () => (await fetch('/api/stats')).json())
  expect(stats.commandCounts.clientmove || 0).toBe(0)
})

test('重复点击同一频道不发出额外移动请求', async ({ context, page }) => {
  await context.addCookies([
    { name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }
  ])

  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()

  const targetItem = page.locator('.v-list.my-2 .v-list-item', { hasText: '测试频道' }).first()
  await targetItem.click()
  await page.waitForTimeout(800)
  await targetItem.click()
  await page.waitForTimeout(800)

  const stats = await page.evaluate(async () => (await fetch('/api/stats')).json())
  expect(stats.commandCounts.clientmove || 0).toBe(0)
  await expect(page).toHaveURL(/\/chat\/2$/)
  await expect(page.getByText('操作失败，请检查输入和服务器状态')).toHaveCount(0)
})

test('文件管理树显示可选择复选框，勾选后批量删除按钮启用', async ({ context, page }) => {
  await context.addCookies(validSessionCookie)
  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()

  // Wait for the channel tree to finish loading before interacting.
  await expect(page.getByText('欢迎大厅')).toBeVisible()
  await page.waitForTimeout(400)
  await resetMock(page)

  // Selection checkboxes render on tree nodes.
  await expect(page.locator('.v-treeview .v-checkbox-btn input[type="checkbox"]').first()).toHaveCount(1)

  const deleteButton = page.getByRole('button', { name: '删除所选' })
  await expect(deleteButton).toBeDisabled()

  await checkFileNode(page, '欢迎大厅')
  await expect(deleteButton).toBeEnabled()
})

test('文件管理父子节点同时选择批量删除仅删父节点且刷新列表并清空选择', async ({ context, page }) => {
  await context.addCookies(validSessionCookie)
  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()
  await page.waitForTimeout(400)
  await resetMock(page)

  // Build the tree: channel -> folder -> nested file.
  await expandFileNode(page, '欢迎大厅')
  await expandFileNode(page, 'docs')

  // Select the parent folder and its child file simultaneously.
  await checkFileNode(page, 'docs')
  await checkFileNode(page, 'guide.txt')

  const deleteButton = page.getByRole('button', { name: '删除所选' })
  await expect(deleteButton).toBeEnabled()
  await deleteButton.click()
  await expect(page.getByText('确定要删除所有选中的文件和文件夹吗？此操作无法撤销。')).toBeVisible()
  await page.locator('.v-card', { hasText: '删除所选文件和文件夹' }).getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForTimeout(900)

  // Only the parent folder is deleted (the child was deduped), with a single
  // `ftdeletefile` targeting `/docs`.
  const stats = await getStats(page)
  const fileDeletes = stats.deleteCalls.filter((c) => c.command === 'ftdeletefile')
  expect(fileDeletes.length).toBe(1)
  expect(fileDeletes[0].params.name).toBe('/docs')

  // The deleted folder is gone from the refreshed list (mock removed it).
  await expect(page.locator('.v-treeview .v-list-item', { hasText: 'docs' })).toHaveCount(0)

  // Selection was cleared after the batch delete.
  await expect(deleteButton).toBeDisabled()
})

test('文件管理取消删除不发出删除调用且保留选择', async ({ context, page }) => {
  await context.addCookies(validSessionCookie)
  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()
  await page.waitForTimeout(400)
  await resetMock(page)

  await checkFileNode(page, '欢迎大厅')
  const deleteButton = page.getByRole('button', { name: '删除所选' })
  await expect(deleteButton).toBeEnabled()

  await deleteButton.click()
  await expect(page.getByText('确定要删除所有选中的文件和文件夹吗？此操作无法撤销。')).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByText('确定要删除所有选中的文件和文件夹吗？此操作无法撤销。')).toHaveCount(0)

  // Cancel issues no destructive command and keeps the selection.
  const stats = await getStats(page)
  expect(stats.deleteCalls.length).toBe(0)
  await expect(deleteButton).toBeEnabled()
})

test('文件管理多选两个同级文件确认删除后刷新列表并清空选择', async ({ context, page }) => {
  await context.addCookies(validSessionCookie)
  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()
  await page.waitForTimeout(400)
  await resetMock(page)

  await expandFileNode(page, '欢迎大厅')

  await checkFileNode(page, 'docs')
  await checkFileNode(page, 'readme.txt')
  const deleteButton = page.getByRole('button', { name: '删除所选' })
  await expect(deleteButton).toBeEnabled()

  await deleteButton.click()
  await expect(page.getByText('确定要删除所有选中的文件和文件夹吗？此操作无法撤销。')).toBeVisible()
  await page.locator('.v-card', { hasText: '删除所选文件和文件夹' }).getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForTimeout(900)

  // Two siblings selected -> two `ftdeletefile` calls with the right targets.
  const stats = await getStats(page)
  const names = stats.deleteCalls.filter((c) => c.command === 'ftdeletefile').map((c) => c.params.name).sort()
  expect(names).toEqual(['/docs', '/readme.txt'])

  // Both nodes disappear after the refresh.
  await expect(page.locator('.v-treeview .v-list-item', { hasText: 'docs' })).toHaveCount(0)
  await expect(page.locator('.v-treeview .v-list-item', { hasText: 'readme.txt' })).toHaveCount(0)
  await expect(deleteButton).toBeDisabled()
})

test('文件管理频道根节点批量删除仅删除子内容且绝不误删频道', async ({ context, page }) => {
  await context.addCookies(validSessionCookie)
  await page.goto('/files')
  await expect(page.getByRole('heading', { name: '文件管理' })).toBeVisible()
  await expect(page.getByText('欢迎大厅')).toBeVisible()
  await page.waitForTimeout(400)
  await resetMock(page)

  // Load the channel's children, then select the channel root itself.
  await expandFileNode(page, '欢迎大厅')
  await checkFileNode(page, '欢迎大厅')
  const deleteButton = page.getByRole('button', { name: '删除所选' })
  await expect(deleteButton).toBeEnabled()

  await deleteButton.click()
  await expect(page.getByText('确定要删除所有选中的文件和文件夹吗？此操作无法撤销。')).toBeVisible()
  await page.locator('.v-card', { hasText: '删除所选文件和文件夹' }).getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForTimeout(900)

  // Deleting a channel root only removes its children (docs + readme.txt); it
  // never issues a channeldelete so the channel itself is not removed.
  const stats = await getStats(page)
  const fileDeletes = stats.deleteCalls.filter((c) => c.command === 'ftdeletefile')
  const names = fileDeletes.map((c) => c.params.name).sort()
  expect(names).toEqual(['/docs', '/readme.txt'])
  expect(stats.deleteCalls.filter((c) => c.command === 'channeldelete').length).toBe(0)

  // The channel node remains in the tree.
  await expect(page.locator('.v-treeview .v-list-item', { hasText: '欢迎大厅' }).first()).toBeVisible()
})

test('高风险交互：黑名单表格支持排序、分页、批量选择和确认对话框', async ({ context, page }) => {
  await context.addCookies([{ name: 'ts3_e2e_session', value: 'valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }])
  await page.goto('/bans')

  await expect(page.getByText('Reason 01')).toBeVisible()
  await expect(page.getByText('Reason 26')).toHaveCount(0)
  await page.locator('.v-data-table-footer button').last().click()
  await expect(page.getByText('Reason 26')).toBeVisible()

  await page.getByText('原因', { exact: true }).click()
  await expect(page.locator('tbody tr').first()).toContainText(/Reason (30|01)/)

  await page.locator('tbody input[type="checkbox"]').first().check({ force: true })
  const bulkDelete = page.getByRole('button', { name: '删除所选' })
  await expect(bulkDelete).toBeEnabled()
  await bulkDelete.click()
  await expect(page.getByText('确定要删除所选封禁记录吗？此操作无法撤销。')).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByText('确定要删除所选封禁记录吗？此操作无法撤销。')).toHaveCount(0)
})
