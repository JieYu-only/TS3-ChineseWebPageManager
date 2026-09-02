const path = require('path')
const http = require('http')
const express = require('express')
const { Server } = require('socket.io')

const port = Number(process.env.E2E_PORT) || 4173
const app = express()
const server = http.createServer(app)
const io = new Server(server)
const validCookie = 'ts3_e2e_session=valid'
// Tracks how many times each TeamSpeak command was executed, so E2E can assert
// that viewing a channel does NOT issue a `clientmove` (a real ServerQuery
// rejects moving its own Query client, and the UI should not attempt it).
const commandCounts = {}
// Logs the params of every destructive file/channel command so E2E can assert
// the exact delete targets/counts (batch delete, parent+child dedup, and that a
// channel root never deletes the channel itself).
const deleteCalls = []
// Files already deleted (their full `/path/name`), so a refreshed folder list
// reflects the deletion and E2E can assert the list updates.
const deletedFiles = new Set()

// Rich file tree for cid=1: a folder `docs` (with a nested file) + a root file,
// so E2E can verify multi-select, parent/child dedup and channel safety.
function fileListFor(cid, path) {
  const cidStr = String(cid)
  let list = []
  if (cidStr === '1' && (path === '/' || path === undefined)) {
    list = [
      { cid: '1', name: 'docs', path: '/', type: 0, datetime: 1767225600, size: 0 },
      { cid: '1', name: 'readme.txt', path: '/', type: 1, datetime: 1767225600, size: 128 }
    ]
  } else if (cidStr === '1' && path === '/docs') {
    list = [{ cid: '1', name: 'guide.txt', path: '/docs', type: 1, datetime: 1767225600, size: 10 }]
  } else if (cidStr === '2' && (path === '/' || path === undefined)) {
    list = [{ cid: '2', name: 'notes.txt', path: '/', type: 1, datetime: 1767225600, size: 5 }]
  }
  return list.filter((f) => !deletedFiles.has(fullFilePath(f)))
}

function fullFilePath(f) {
  const base = f.path === '/' || f.path === undefined ? '/' : f.path
  return base === '/' ? '/' + f.name : base + '/' + f.name
}
const banRows = Array.from({ length: 30 }, (_, index) => ({
  banid: String(index + 1),
  ip: `192.0.2.${index + 1}`,
  name: `E2E user ${String(index + 1).padStart(2, '0')}`,
  uid: `e2e-uid-${index + 1}`,
  reason: `Reason ${String(index + 1).padStart(2, '0')}`,
  created: 1767225600,
  duration: index % 2 === 0 ? 0 : 3600
}))
const clientDatabaseRows = [
  { cldbid: '1', clientDatabaseId: '1', clientNickname: 'serveradmin', clientUniqueIdentifier: 'uid-admin' },
  { cldbid: '2', clientDatabaseId: '2', clientNickname: 'E2E member', clientUniqueIdentifier: 'uid-member' }
]

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

app.get('/api/stats', (req, res) => {
  if (!authenticated(req)) return res.status(401).json({ message: '未登录' })
  res.json({ commandCounts, deleteCalls })
})

// Reset the mutable mock state between tests so deleteCalls/commandCounts/
// deletedFiles do not leak across E2E cases (the mock server is one process).
app.post('/api/test/reset', (req, res) => {
  if (!authenticated(req)) return res.status(401).json({ message: '未登录' })
  for (const key of Object.keys(commandCounts)) delete commandCounts[key]
  deleteCalls.length = 0
  deletedFiles.clear()
  res.json({ ok: true })
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
  socket.on('teamspeak-execute', ({ command, params = {} }, ack) => {
    commandCounts[command] = (commandCounts[command] || 0) + 1
    // A real ServerQuery rejects `clientmove` of its own Query client (which is
    // exactly the failure users saw when clicking a channel in the message
    // center). The UI must not issue this command to view a channel's history.
    if (command === 'clientmove') {
      return ack && ack({ id: 256, message: 'invalid clientID', connected: true })
    }
    // Track destructive commands so E2E can assert targets/counts. Never a
    // channeldelete here (the UI deletes folder/file children, not channels).
    if (command === 'ftdeletefile' || command === 'channeldelete') {
      deleteCalls.push({ command, params })
      if (command === 'ftdeletefile' && typeof params.name === 'string') {
        deletedFiles.add(params.name)
      }
    }
    if (command === 'ftgetfilelist') {
      return ack && ack(fileListFor(params.cid, params.path))
    }
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
      serverinfo: [{
        virtualserverName: 'E2E 测试服务器',
        virtualserverDefaultServerGroup: '8'
      }],
      servergrouplist: [
        { sgid: '8', name: 'Guest', type: 1 },
        { sgid: '9', name: 'Admin', type: 1 },
        { sgid: '10', name: 'Query template', type: 2 }
      ],
      channelgrouplist: [
        { cgid: '5', name: 'Channel Admin', type: 1 },
        { cgid: '6', name: 'Channel Guest', type: 1 }
      ],
      channellist: [
        { cid: '1', pid: '0', channelName: '欢迎大厅' },
        { cid: '2', pid: '0', channelName: '测试频道' }
      ],
      clientlist: [
        {
          clid: '7',
          cid: '1',
          clientNickname: 'serveradmin',
          clientDatabaseId: '1'
        }
      ],
      clientinfo: [{
        clientDatabaseId: '1',
        clientNickname: 'serveradmin',
        clientDescription: 'E2E administrator',
        clientServergroups: [9]
      }],
      servergroupclientlist: [clientDatabaseRows[0]],
      banlist: banRows,
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
      tokenadd: [{ token: 'token-created-by-e2e' }],
      use: []
    }
    if (command === 'clientdblist') {
      return ack && ack(Number(params.start || 0) === 0 ? clientDatabaseRows : [])
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
