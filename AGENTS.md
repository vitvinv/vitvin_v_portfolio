# AGENTS.md — Agent Rules

This repository is **public**: anything that lands in the git index lands on GitHub.
Local internals (agent memory, agent/IDE workspaces, secrets) are not needed for
this project to function — keep them on disk only, outside git.

## Never commit

- Agent/IDE workspaces: `.freebuff/`, `.kilo/`, `.claude/`, `.cursor/`, `.hermes/`,
  `.agents/`, `.agentmemory/`, `.graphify/`, `.expanse.json`
- Agent memory and local instructions: `MEMORY.md`, local guidance inside `AGENTS.md`
  (references to `AGENTMEMORY_URL`, ports, machine paths, session/lesson dumps)
- Secrets: `.env`, `.env.*`, keys, tokens, passwords, `local_config.py`
- Build artifacts: `*.zip`, `dist/`, `build/`, `node_modules/`
- Local caches and databases: `__pycache__/`, `.pytest_cache/`, `.hypothesis/`, `*.db`, `*.sqlite`

## Commit workflow

1. Before committing, run `git status` — the index should contain only what is intended.
2. Never use a bare `git add .` / `git add -A` — add explicit paths.
3. If `git status` shows anything from the never-commit list, do not add it — extend `.gitignore`.
4. Keep local agent instructions in `~/.agents/` or files named `*.local.md`, both gitignored.
5. Never rewrite history without an explicit request (no force pushes).

## About this project

Static portfolio site (GitHub Pages): repo root = site root.
- Content: `index.html`, `styles.css`, `app.js`, `data.json` (project aggregate).
- Projects live in `projects/<name>/` with `meta.jsonc` and media files.
- CI/CD: deploy to Pages happens automatically from `main`.
- After edits: verify locally or on Pages, check the console.