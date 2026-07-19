/**
 * serve.js
 *
 * Starts a static file server + file watcher.
 * Double-click or run: node scripts/serve.js
 *
 * - Serves files from project root on port 3000
 * - Watches projects/ and info.jsonc, auto-runs build.js
 * - Refresh the browser manually to see changes
 */

var http = require("http");
var fs = require("fs");
var path = require("path");
var url = require("url");
var childProcess = require("child_process");

var ROOT = path.join(__dirname, "..");
var PROJECTS_DIR = path.join(ROOT, "projects");
var INFO_FILE = path.join(ROOT, "info.jsonc");
var BUILD_SCRIPT = path.join(__dirname, "build.js");
var PORT = process.env.PORT || 3000;

// ── Build (debounced) ────────────────────────────────

var buildPending = null;

function runBuild() {
  if (buildPending) clearTimeout(buildPending);
  buildPending = setTimeout(function () {
    buildPending = null;
    childProcess.exec("node \"" + BUILD_SCRIPT + "\"", { cwd: ROOT }, function (err, stdout, stderr) {
      if (err) console.error("[build] failed:", stderr || err.message);
      else if (stdout) process.stdout.write(stdout);
    });
  }, 300);
}

// ── Watcher ──────────────────────────────────────────

function watchDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    fs.watch(dirPath, { recursive: false }, function (eventType, filename) {
      if (!filename) return;
      var fullPath = path.join(dirPath, filename);
      try {
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) watchDir(fullPath);
      } catch (_) {}
      runBuild();
    });
  } catch (e) {
    console.error("[watch] error on " + dirPath + ":", e.message);
  }
}

function startWatcher() {
  console.log("[watch] watching for changes\u2026");
  watchDir(PROJECTS_DIR);
  if (fs.existsSync(PROJECTS_DIR)) {
    var entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isDirectory()) {
        watchDir(path.join(PROJECTS_DIR, entries[i].name));
      }
    }
  }
  if (fs.existsSync(INFO_FILE)) {
    try { fs.watch(INFO_FILE, function () { runBuild(); }); } catch (_) {}
  }
  runBuild();
}

// ── MIME types ───────────────────────────────────────

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
};

// ── Server ───────────────────────────────────────────

var server = http.createServer(function (req, res) {
  var parsed = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  // Static file serving
  var rawPath = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  var decodedPath = decodeURIComponent(rawPath);
  var filePath = path.join(ROOT, decodedPath);

  // Security: prevent directory traversal
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, "index.html");
  }

  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log("\n  \x1b[36mhttp://localhost:" + PORT + "\x1b[0m\n");
  startWatcher();
});
