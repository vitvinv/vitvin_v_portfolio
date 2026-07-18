/**
 * Google Apps Script — Sync Sheet Data to GitHub
 *
 * Paste this into your Google Sheet: Extensions → Apps Script.
 * Then set these Script Properties (File → Project Properties → Script Properties):
 *
 *   GITHUB_TOKEN       personal access token with "repo" scope
 *   GITHUB_REPO        owner/repo    e.g. vitvinv/vitvin_v_portfolio
 *   GITHUB_BRANCH      branch name   e.g. main
 *   GITHUB_FILE_PATH   file path     e.g. data.json
 *
 * Use the custom menu "Portfolio → Sync to GitHub" to commit your edits
 * manually. No automatic sync.
 */

// ── Read Projects sheet (transposed) ────────────────────────────
function readProjectsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Projects");
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // data[0] = header row with project column names (Project 1, Project 2, ...)
  // data[1..n] = field rows (id, title, subtitle, tags, ...)
  //
  // We transpose: columns become rows (project objects), rows become fields.

  const headers = data[0]; // ["Project 1", "Project 2", ...]
  const fieldNames = data.slice(1).map(row => String(row[0] || "").trim().toLowerCase());

  const projects = [];

  for (let col = 1; col < headers.length; col++) {
    const project = {};
    let hasContent = false;

    for (let row = 1; row < data.length; row++) {
      const fieldName = fieldNames[row - 1];
      const value = data[row][col];
      if (value !== "" && value != null) hasContent = true;
      project[fieldName] = value != null ? value : "";
    }

    if (hasContent) {
      projects.push(project);
    }
  }

  return projects;
}

// ── Read Info sheet (key-value) ─────────────────────────────────
function readInfoSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Info");
  if (!sheet) return {};

  const data = sheet.getDataRange().getValues();
  const info = {};

  for (let i = 0; i < data.length; i++) {
    const key = String(data[i][0] || "").trim();
    const value = String(data[i][1] || "");
    if (key) {
      info[key] = value;
    }
  }

  return info;
}

// ── Build JSON ──────────────────────────────────────────────────
function buildPayload() {
  const payload = {
    projects: readProjectsSheet(),
    info: readInfoSheet(),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

// ── Commit to GitHub ───────────────────────────────────────────
function commitToGitHub(content) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("GITHUB_TOKEN");
  const repo  = props.getProperty("GITHUB_REPO");
  const branch = props.getProperty("GITHUB_BRANCH") || "main";
  const filePath = props.getProperty("GITHUB_FILE_PATH") || "data.json";

  if (!token || !repo) {
    console.error("Missing GITHUB_TOKEN or GITHUB_REPO in Script Properties");
    return;
  }

  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const encoded = Utilities.base64Encode(Utilities.newBlob(content).getBytes());

  // Get current file SHA (needed for update)
  let sha = null;
  try {
    const getResponse = UrlFetchApp.fetch(`${apiBase}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      muteHttpExceptions: true,
    });
    if (getResponse.getResponseCode() === 200) {
      sha = JSON.parse(getResponse.getContentText()).sha;
    }
  } catch (e) {
    // File doesn't exist yet — that's fine, we'll create it.
  }

  const body = {
    message: `sheet update ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")}`,
    content: encoded,
    branch: branch,
  };
  if (sha) body.sha = sha;

  const putResponse = UrlFetchApp.fetch(apiBase, {
    method: "put",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  if (putResponse.getResponseCode() >= 200 && putResponse.getResponseCode() < 300) {
    console.log(`Synced: ${JSON.parse(putResponse.getContentText()).content.html_url}`);
  } else {
    console.error(`Sync failed (${putResponse.getResponseCode()}): ${putResponse.getContentText()}`);
  }
}

// ── Custom menu ─────────────────────────────────────────────────
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Portfolio")
    .addItem("Sync to GitHub", "syncNow")
    .addToUi();
}

// ── Manual trigger ──────────────────────────────────────────────
function syncNow() {
  const json = buildPayload();
  commitToGitHub(json);
}
