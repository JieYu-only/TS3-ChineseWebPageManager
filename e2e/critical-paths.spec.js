const { test, expect } = require('@playwright/test')

async function fillLogin(page, host = 'ts3.example.test') {
  await page.getByPlaceholder('IP 地址或域名').fill(host)
  await page.getByPlaceholder('例如 serveradmin').fill('serveradmin')
  await page.getByLabel('密码', { exact: true }).fill('test-password')
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
