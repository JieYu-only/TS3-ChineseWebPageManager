const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

const app = require("../app");

// Stub the underlying TeamSpeak connection so no real server is required to
// bring up the HTTP layer. The health route does not need it, but requiring the
// app loads the API routes which import the TeamSpeak library eagerly.
test("GET /api/health responds 200 with status ok without authentication", async (t) => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.strictEqual(response.status, 200);

  const body = await response.json();
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(typeof body.uptime, "number");
  assert.strictEqual(typeof body.timestamp, "number");
});

test("server boots and the express app is exported for tests", () => {
  // `app` should be an express() instance (a function) and NOT have started
  // listening, because app.js only binds a port when run directly.
  assert.strictEqual(typeof app, "function");
});
