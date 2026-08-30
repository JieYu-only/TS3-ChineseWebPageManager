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

test('管理页面黑名单可加载并显示空状态', async ({ context, page }) => {
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
  await expect(page.getByText('暂无封禁记录')).toBeVisible()
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
