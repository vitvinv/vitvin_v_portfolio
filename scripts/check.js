/**
 *  check.js
 *
 *  Sanity-checks the generated content pipeline. Run: node scripts/check.js
 *
 *  1. data.json parses and has at least one project
 *  2. every media src/poster referenced in data.json exists on disk
 *  3. every relative import in vendored vendor/three/*.js resolves to a file
 *     (serve.js answers missing files with index.html, which kills the whole
 *     ES-module graph and leaves the loading screen on forever)
 */

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var DATA_FILE = path.join(ROOT, "data.json");

var errors = [];
var checked = 0;

var data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
} catch (e) {
  console.error("check: data.json does not parse:", e.message);
  process.exit(1);
}

var projects = data.projects || [];
if (projects.length < 1) {
  errors.push("data.json has no projects");
}

projects.forEach(function (p) {
  var refs = [p.media && p.media.src, p.media && p.media.poster];
  ((p.media && p.media.files) || []).forEach(function (f) {
    refs.push(f.src, f.poster);
  });
  refs.forEach(function (ref) {
    if (!ref) return;
    checked += 1;
    if (!fs.existsSync(path.join(ROOT, ref))) {
      errors.push("missing file: " + ref + " (project " + p.id + ")");
    }
  });
});

// ── Vendored three.js: relative imports must resolve ──

function scanVendorImports(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scanVendorImports(full);
    if (!entry.name.endsWith(".js")) return;
    var src = fs.readFileSync(full, "utf8");
    var re = /(?:from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g;
    var m;
    while ((m = re.exec(src)) !== null) {
      checked += 1;
      var target = path.resolve(path.dirname(full), m[1]);
      if (!fs.existsSync(target)) {
        errors.push("vendor import missing: " + m[1] + " (from " + path.relative(ROOT, full) + ")");
      }
    }
  });
}
scanVendorImports(path.join(ROOT, "vendor"));

if (errors.length) {
  errors.forEach(function (e) { console.error("check: " + e); });
  console.error("check: FAILED (" + errors.length + " error(s), " + checked + " refs scanned)");
  process.exit(1);
}

console.log("check: OK (" + projects.length + " projects, " + checked + " media refs exist)");
