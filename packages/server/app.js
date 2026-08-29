// Read .env file
require("dotenv").config();

const config = require("./config");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const app = express();
const socket = require("./socket");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const routes = require("./routes");
const { sessionManager } = require("./session");
const { trustProxyEnabled } = require("./utils");

// Trust the reverse proxy so Secure cookies and req.ip work correctly when the
// app runs behind Nginx/Caddy or a Docker proxy. This is intentionally off by
// default so a directly-exposed server cannot be tricked by forged
// X-Forwarded-* headers; enable it with TRUST_PROXY=1 / true / yes only behind a
// known proxy. Both the HTTP and Socket.IO layers share this same policy.
if (trustProxyEnabled()) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

// Enable cross-origin resource sharing for the frontend in development
const corsOptions = {
  origin: process.env.NODE_ENV === "development" ? true : false,
  credentials: true,
};

app.use(cors(corsOptions));

// Full security response headers. A restrictive Content-Security-Policy is set
// for the management page; the Service Worker migration script is served locally
// so no third-party script-src is needed.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        fontSrc: ["'self'", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(cookieParser());

// JSON body parsing for the session login/logout API.
app.use(express.json());

// Security migration: drop the legacy JWT token cookie if a client still sends
// it. New logins use the HttpOnly session cookie instead.
app.use((req, res, next) => {
  if (req.cookies && req.cookies.token) {
    res.clearCookie("token", { path: "/" });
  }
  return next();
});

app.use(express.static(path.join(__dirname, "../ui/dist/")));

app.use("/api", routes.api);

app.get("/*", (req, res) => {
  // path must be absolute or specify root to res.sendFile
  res.sendFile(path.join(__dirname, "../ui/dist/index.html"));
});

// Only start listening when this module is run directly (e.g. `node app.js`).
// When it is required by a test the app is exported instead so the test can
// bind it to an ephemeral port without side effects.
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`Server listening on http://127.0.0.1:${config.port}`);
  });

  // Periodically clean expired sessions (temporary + remembered).
  sessionManager.startCleanup();

  socket.init(server, corsOptions);
}

module.exports = app;
