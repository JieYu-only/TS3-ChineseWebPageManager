const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// Scan the whole business layer (components, App.vue, main.js, Vuex modules) but
// whitelist the protocol / transport / domain-service layers, which legitimately
// import TeamSpeak and the socket and call execute().
const scanRoot = path.join(root, "packages", "ui", "src");
const allowedDirs = new Set(["services", "api", "transport"]);
const allowedBasenames = new Set(["socket.js"]);

const bannedRegex = [
  { re: /\$TeamSpeak/, label: "$TeamSpeak" },
  {
    re: /import\s+[^;]*\bTeamSpeak\b/,
    label: "direct TeamSpeak import (alias or default) into business layer",
  },
  {
    re: /TeamSpeak\s*\.\s*(execute|on|off|addEventListener|removeEventListener|downloadFile|getServerList|getServerInfo|getClientList|getChannelList|whoAmI|createSnapshot|deploySnapshot|selectServer|fullClientDBList)\s*\(/,
    label: "direct TeamSpeak API call in business layer",
  },
  { re: /\$socket\b/, label: "$socket" },
  {
    re: /@\/socket|(?:from\s+|require\(\s*["'])[^"']*socket["']/,
    label: "socket import (socket.js) in business layer",
  },
];

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!allowedDirs.has(entry.name)) walk(full);
    } else {
      if (allowedBasenames.has(entry.name)) continue;
      if (/\.(js|vue)$/.test(entry.name)) files.push(full);
    }
  }
}
walk(scanRoot);

const violations = [];

function record(file, label) {
  violations.push(`${path.relative(root, file)} — banned reference: ${label}`);
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");

  for (const { re, label } of bannedRegex) {
    if (re.test(source)) record(file, label);
  }

  // A bare `.execute(` is only allowed via the console exception
  // (`consoleService.execute`). Flag any other `.execute(` call.
  const executeRe = /\.execute\s*\(/g;
  let m;
  while ((m = executeRe.exec(source)) !== null) {
    const preceding = source.slice(Math.max(0, m.index - 40), m.index);
    if (!/consoleService\s*$/.test(preceding)) {
      record(file, "direct .execute( call");
      break;
    }
  }
}

if (violations.length) {
  console.error("decoupling gate: found banned references in the business layer:");
  violations.forEach((v) => console.error("  - " + v));
  process.exit(1);
}

console.log(
  "decoupling gate: business layer is free of $TeamSpeak, TeamSpeak import/API, $socket, socket.js and direct execute."
);
