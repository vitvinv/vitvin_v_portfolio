/**
 *  build.js
 *
 *  Scans projects/ subdirectories for meta.jsonc and media files,
 *  then writes data.json and updates gallerySources in app.js.
 *
 * Usage:  node scripts/build.js
 */

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PROJECTS_DIR = path.join(ROOT, "projects");
var INFO_FILE = path.join(ROOT, "info.jsonc");
var DATA_FILE = path.join(ROOT, "data.json");
var APP_FILE = path.join(ROOT, "app.js");

var VIDEO_EXT = { ".mp4": true, ".webm": true, ".mov": true, ".avi": true };
var IMAGE_EXT = { ".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true };

// ── JSONC → JSON ──────────────────────────────────────

function parseJSONC(filePath) {
  if (!fs.existsSync(filePath)) return {};
  var raw = fs.readFileSync(filePath, "utf-8");
  var cleaned = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
    .replace(/\/\/.*$/gm, "")            // line comments
    .replace(/,\s*([}\]])/g, "$1");      // trailing commas
  return JSON.parse(cleaned);
}

// ── Title from folder name ────────────────────────────

function folderTitle(name) {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// ── Media detection ───────────────────────────────────

function scanMedia(folderPath, captions) {
  var files = fs.readdirSync(folderPath).filter(function (f) {
    var ext = path.extname(f).toLowerCase();
    return VIDEO_EXT[ext] || IMAGE_EXT[ext];
  });

  // Categorize
  var videos = files.filter(function (f) { return VIDEO_EXT[path.extname(f).toLowerCase()]; });
  var images = files.filter(function (f) { return IMAGE_EXT[path.extname(f).toLowerCase()]; });

  // Cover file
  var cover = images.find(function (f) { return /^cover\./i.test(f); });

  // Same-name poster (image matching video basename)
  function sameNamePoster(videoFile) {
    var base = path.basename(videoFile, path.extname(videoFile)).toLowerCase();
    return images.find(function (f) {
      return path.basename(f, path.extname(f)).toLowerCase() === base;
    }) || null;
  }

  var mainFile = videos[0] || cover || images[0];
  var mediaType = videos.length > 0 ? "video" : "image";
  var poster = cover || (videos[0] ? sameNamePoster(videos[0]) : null) || images[0];

  // Build full file list for multi-media detail pages
  // Sort: videos first (by name), then images alphabetically
  // Exclude cover.* and same-name video posters — they are for previews only
  var posterNames = {};
  for (var vi = 0; vi < videos.length; vi++) {
    var posterFile = sameNamePoster(videos[vi]);
    if (posterFile) posterNames[posterFile.toLowerCase()] = true;
  }
   var allFiles = videos.sort().concat(images.sort());
  var filesList = [];
  var captionIdx = 0;
  for (var fi = 0; fi < allFiles.length; fi++) {
    var f = allFiles[fi];
    if (/^cover\./i.test(f)) continue;
    if (posterNames[f.toLowerCase()]) continue;
    var fExt = path.extname(f).toLowerCase();
    var fType = VIDEO_EXT[fExt] ? "video" : "image";
    var fPoster = fType === "video"
      ? (cover || sameNamePoster(f)) || null
      : null;
    var cap = (captions && captionIdx < captions.length) ? (captions[captionIdx] || "") : "";
    filesList.push({ type: fType, src: f, poster: fPoster, caption: cap });
    captionIdx++;
  }

  return {
    type: mediaType,
    src: mainFile,
    poster: poster,
    files: filesList,
  };
}

// ── Build one project ─────────────────────────────────

function buildProject(folderName) {
  var folderPath = path.join(PROJECTS_DIR, folderName);
  var meta = parseJSONC(path.join(folderPath, "meta.jsonc"));
  var captions = Array.isArray(meta.captions) ? meta.captions : null;
  var media = scanMedia(folderPath, captions);

  // Allow meta to override media_src and tile_image
  var src = meta.media_src || (media.src ? "./projects/" + folderName + "/" + media.src : "");
  var poster = meta.tile_image || (media.poster ? "./projects/" + folderName + "/" + media.poster : src);
  var type = meta.media_type || media.type || "image";

  return {
    id: folderName,
    title: meta.title || folderTitle(folderName),
    subtitle: meta.subtitle || "",
    tags: typeof meta.tags === "string"
      ? meta.tags.split(",").map(function (t) { return t.trim(); })
      : (meta.tags || []),
    description: meta.description || "",
    link: meta.link_url || "",
    _date: meta.date || "0000-00",
    media: {
      type: type,
      src: src,
      poster: poster,
      previewVideo: type === "video" ? src : "",
      files: (media.files || []).map(function (f) {
        return {
          type: f.type,
          src: "./projects/" + folderName + "/" + f.src,
          poster: f.poster ? "./projects/" + folderName + "/" + f.poster : "",
          caption: f.caption || "",
        };
      }),
    },
  };
}

// ── Build all ──────────────────────────────────────────

function buildAll() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error("projects/ directory not found");
    process.exit(1);
  }

  // Projects
  var folders = fs.readdirSync(PROJECTS_DIR).filter(function (name) {
    return fs.statSync(path.join(PROJECTS_DIR, name)).isDirectory();
  }).sort();

  var projects = [];
  for (var i = 0; i < folders.length; i++) {
    var p = buildProject(folders[i]);
    if (p.media.src) {
      projects.push(p);
    } else {
      console.log("Skipping " + folders[i] + " (no media files)");
    }
  }

  // Info
  var info = parseJSONC(INFO_FILE);

  // Sort by date descending (newest first), then alphabetically
  projects.sort(function (a, b) {
    if (a._date !== b._date) return b._date.localeCompare(a._date);
    return a.id.localeCompare(b.id);
  });

  // Write data.json (strip internal _date field)
  var cleanProjects = projects.map(function (p) {
    var obj = {};
    for (var k in p) { if (k !== "_date") obj[k] = p[k]; }
    return obj;
  });
  var data = { projects: cleanProjects, info: info };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
  console.log("Wrote data.json (" + projects.length + " projects, " + Object.keys(info).length + " info fields)");

  // Update gallerySources in app.js
  updateGallerySources(projects);
}

// ── Update app.js gallerySources ──────────────────────

function updateGallerySources(projects) {
  if (!fs.existsSync(APP_FILE)) return;
  var content = fs.readFileSync(APP_FILE, "utf-8");

  var sources = projects.map(function (p) {
    return "  \"" + p.media.src + "\"";
  });

  content = content.replace(
    /(?:var|const|let) gallerySources = \[[\s\S]*?\];/,
    "var gallerySources = [\n" + sources.join(",\n") + ",\n];"
  );

  fs.writeFileSync(APP_FILE, content);
  console.log("Updated gallerySources in app.js");
}

// ── Run ──────────────────────────────────────────────

buildAll();
