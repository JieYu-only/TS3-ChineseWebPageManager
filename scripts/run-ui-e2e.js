const http = require('http')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const healthUrl = 'http://127.0.0.1:4173/api/health'
let mockServer

function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(healthUrl, (response) => {
        response.resume()
        if (response.statusCode === 200) return resolve()
        retry()
      })
      request.on('error', retry)
      request.setTimeout(1000, () => request.destroy())
    }
    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error(`E2E mock server did not become ready at ${healthUrl}`))
      } else {
        setTimeout(check, 100)
      }
    }

    check()
  })
}

function stopMockServer() {
  if (!mockServer || mockServer.exitCode !== null) return Promise.resolve()

  return new Promise((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(forceTimer)
      resolve()
    }
    const forceTimer = setTimeout(() => {
      if (mockServer.exitCode === null) mockServer.kill('SIGKILL')
      finish()
    }, 2000)

    mockServer.once('exit', finish)
    mockServer.kill('SIGTERM')
  })
}

async function main() {
  const mockPath = path.join(root, 'e2e', 'mock-server.js')
  mockServer = spawn(process.execPath, [mockPath], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  })

  mockServer.once('error', (error) => {
    console.error(error)
  })

  await waitForHealth()

  const cliPath = require.resolve('@playwright/test/cli')
  const playwright = spawn(process.execPath, [cliPath, 'test', ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, E2E_EXTERNAL_SERVER: '1' },
    stdio: 'inherit'
  })

  const exitCode = await new Promise((resolve, reject) => {
    playwright.once('error', reject)
    playwright.once('exit', (code, signal) => {
      if (signal) resolve(1)
      else resolve(code ?? 1)
    })
  })

  await stopMockServer()
  process.exitCode = exitCode
}

async function shutdown() {
  await stopMockServer()
  process.exit(130)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

main().catch(async (error) => {
  console.error(error)
  await stopMockServer()
  process.exitCode = 1
})
