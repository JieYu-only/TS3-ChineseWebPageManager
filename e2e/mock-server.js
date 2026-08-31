const path = require('path')
const http = require('http')
const express = require('express')
const { Server } = require('socket.io')

const port = Number(process.env.E2E_PORT) || 4173
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const validCookie = 'ts3_e2e_session=valid'

app.use(express.json())

function authenticated(req) {
  return String(req.headers.cookie || '').includes(validCookie)
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.get('/api/session/status', (req, res) => {
  if (!authenticated(req)) return res.json({ connected: false })
  res.json({
    connected: true,
    expiresAt: Date.now() + 60 * 60 * 1000,
    serverId: '1'
  })
})

app.post('/api/session/login', (req, res) => {
  if (req.body.host === 'fail.example') {
    return res.status(401).json({
      connected: false,
      message: '用户名或密码错误，或者无法连接到目标服务器'
    })
  }

  res.cookie('ts3_e2e_session', 'valid', {
    httpOnly: true,
    sameSite: 'strict'
  })
  res.json({
    connected: true,
    remembered: Boolean(req.body.remember),
    expiresAt: Date.now() + 60 * 60 * 1000
  })
})

app.patch('/api/session/server', (req, res) => {
  if (!authenticated(req)) return res.status(401).json({ message: '未登录' })
  res.json({ serverId: String(req.body.serverId) })
})

app.post('/api/session/logout', (_req, res) => {
  res.clearCookie('ts3_e2e_session')
  res.json({ connected: false })
})

io.use((socket, next) => {
  if (!String(socket.handshake.headers.cookie || '').includes(validCookie)) {
    return next(new Error('未登录或会话已过期'))
  }
  next()
})

io.on('connection', (socket) => {
  socket.emit('teamspeak-connected', { connected: true, serverId: '1' })

  socket.on('teamspeak-registerevents', (ack) => ack && ack('ok'))
  socket.on('teamspeak-unregisterevent', (ack) => ack && ack('ok'))
  socket.on('teamspeak-execute', ({ command }, ack) => {
    const responses = {
      serverlist: [
        {
          virtualserverId: '1',
          virtualserverName: 'E2E 测试服务器',
          virtualserverPort: '9987',
          virtualserverClientsonline: '2',
          virtualserverMaxclients: '32',
          virtualserverUptime: '3661',
          virtualserverStatus: 'online'
        }
      ],
      whoami: [{ virtualserverId: '1', clientId: '7', clientNickname: 'serveradmin' }],
      serverinfo: [{ virtualserverName: 'E2E 测试服务器' }],
      channellist: [{ cid: '1', pid: '0', channelName: '欢迎大厅' }],
      clientlist: [
        {
          clid: '7',
          cid: '1',
          clientNickname: 'serveradmin',
          clientDatabaseId: '1'
        }
      ],
      ftgetfilelist: [
        {
          cid: '1',
          name: 'readme.txt',
          path: '/',
          type: 1,
          datetime: 1767225600,
          size: 128
        }
      ],
      logview: [
        {
          l: '2026-08-31 04:00:00.000000|INFO|ServerLibPriv|1|E2E server ready',
          lastPos: 0
        }
      ],
      tokenlist: [
        {
          token: 'token-e2e-abc',
          tokenType: 0,
          tokenCreated: 1767225600
        }
      ],
      use: []
    }
    ack && ack(responses[command] || [])
  })
})

const distDir = path.resolve(__dirname, '../packages/ui/dist')
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E mock server listening on http://127.0.0.1:${port}`)
})

function shutdown() {
  // Gracefully disconnect socket.io clients, then close the HTTP server. A
  // lingering keep-alive (or socket.io upgrade) connection would otherwise keep
  // `server.close()`'s callback from firing and hang the Playwright process
  // after all tests have passed, so force-close connections and fall back to a
  // hard exit.
  io.close()
  server.closeAllConnections?.()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
