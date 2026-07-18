# Google Sheets CMS — Implementation Plan

## Goal

Replace all hardcoded content (projects, side panel text) with data sourced from Google Sheets, synced automatically to a JSON file in the GitHub repo via Apps Script.

## Architecture

```
Google Sheet                    GitHub repo                    Browser
─────────────                   ───────────                    ───────
Sheet "Projects"                                               
Sheet "Info"        onEdit                                     
    │                  │                                       
    ▼                  ▼                                       
Apps Script ──commit──▶ data.json  ──Page rebuild──▶ fetch    data.json
                              │                         │
                              └─────────────────────────┘
                                    (same origin, no CORS)
```

- Site loads `data.json` from its own domain (same-origin, no network dependency outside GitHub Pages)
- Apps Script pushes changes to the repo on every sheet edit
- No API keys or secrets in client code
- Hardcoded arrays remain as fallback if `data.json` fails to load

## Sheet Structure

### Sheet 1: `Projects` (transposed — columns = projects)

| Row | Col A (Project 1) | Col B (Project 2) | ... |
|-----|-------------------|-------------------|----|
| `id` | `project-1` | `project-2` | |
| `title` | `Gallery 01` | `Gallery 02` | |
| `subtitle` | `AI / 3D` | `Brand / Motion` | |
| `tags` | `AI, 3D` | `Brand, Motion` | (comma-separated) |
| `description` | `A visual exploration...` | `...` | |
| `link_url` | `https://example.com/project-1` | `...` | |
| `media_type` | `video` | `image` | (`image` or `video`) |
| `media_src` | `./media/arnypraht.MP4` | `./media/face0.png` | (main media for detail page) |
| `tile_image` | `./media/arnypraht-cover.jpg` | `./media/face0.png` | (always an image) |

### Sheet 2: `Info` (key-value)

| Row | Col A (key) | Col B (value) |
|-----|-------------|---------------|
| 1 | `copyright_name` | `Valentin Vitvinskii` |
| 2 | `copyright_text` | `© 2026 — Designer & Creative Developer.` |
| 3 | `copyright_lorem` | `Lorem ipsum dolor sit amet...` |
| 4 | `experience` | `Creative Developer at Studio Name (2020–present)\nFrontend Lead at Agency (2018–2020)` |
| 5 | `cv_label` | `CV` |
| 6 | `cv_link_text` | `Download CV (PDF)` |
| 7 | `cv_link_url` | `#` |
| 8 | `tools_label` | `Tools` |
| 9 | `tools_text` | `Three.js / WebGL, React, Motion Design, Figma, Blender, GSAP` |
| 10 | `contact_heading` | `Contact` |
| 11 | `contact_email` | `hello@example.com` |
| 12 | `contact_telegram` | `@yourhandle` |
| 13 | `contact_instagram` | `@yourhandle` |

## Generated `data.json` Format

```json
{
  "projects": [
    {
      "id": "project-1",
      "title": "Gallery 01",
      "subtitle": "AI / 3D",
      "tags": ["AI", "3D"],
      "description": "A visual exploration...",
      "link_url": "https://example.com/project-1",
      "media_type": "video",
      "media_src": "./media/arnypraht.MP4",
      "tile_image": "./media/arnypraht-cover.jpg"
    },
    {
      "id": "project-2",
      "title": "Gallery 02",
      "subtitle": "Brand / Motion",
      "tags": ["Brand", "Motion"],
      "description": "...",
      "link_url": "https://example.com/project-2",
      "media_type": "image",
      "media_src": "./media/face0.png",
      "tile_image": "./media/face0.png"
    }
  ],
  "info": {
    "copyright_name": "Valentin Vitvinskii",
    "copyright_text": "© 2026 — Designer & Creative Developer.",
    "copyright_lorem": "Lorem ipsum dolor sit amet...",
    "experience": "Creative Developer at Studio Name (2020–present)\nFrontend Lead at Agency (2018–2020)",
    "cv_label": "CV",
    "cv_link_text": "Download CV (PDF)",
    "cv_link_url": "#",
    "tools_label": "Tools",
    "tools_text": "Three.js / WebGL, React, Motion Design, Figma, Blender, GSAP",
    "contact_heading": "Contact",
    "contact_email": "hello@example.com",
    "contact_telegram": "@yourhandle",
    "contact_instagram": "@yourhandle"
  }
}
```

## Apps Script Setup

1. Open the Google Sheet → Extensions → Apps Script
2. Paste the sync script (provided in implementation)
3. Store `GITHUB_TOKEN` in Script Properties (File → Project Properties → Script Properties)
4. Set `GITHUB_REPO` and `GITHUB_FILE_PATH` in the script
5. The `onEdit(e)` trigger fires on any cell edit
6. 3-second debounce before committing (avoids flooding GitHub with intermediate edits)
7. Commit message includes timestamp: `sheet update YYYY-MM-DD HH:mm`

## Implementation Tasks

### Phase 1 — Data layer (`app.js`)

1. **Add `fetchSheetData()` async function**
   - Fetches `./data.json` via `fetch()`
   - Parses and returns `{ projects, info }` object
   - On failure (network error, 404), returns `null` — caller uses fallback

2. **Transform fetched projects into internal format**
   - `tags` column (comma-separated string) → array (split by `,`, trimmed)
   - Build `media` sub-object: `{ type, src, poster, previewVideo }`
   - For `media_type === "video"`: set `poster` = `tile_image`, `previewVideo` = `media_src` (only used in `createTileMedia`)
   - For `media_type === "image"`: set `poster` = `tile_image` (or `media_src`)

3. **Add `renderSiteFromData(data)` function**
   - Replaces the current `renderProjects()` call and side panel population
   - Takes `data` parameter — either fetched data or hardcoded fallback
   - Calls existing `renderProjects()` but with projects from data
   - Calls new `renderSidePanel(info)` — replaces `syncMobileInfo()` for initial population

4. **Wire up boot sequence**
   - On page load: `fetchSheetData()` → if success, `renderSiteFromData(data)` → if null, use hardcoded arrays as fallback
   - Keep existing `syncMobileInfo()` for mobile content cloning (it reads from side panel DOM, unchanged)

5. **Keep hardcoded arrays as fallback**
   - Existing `projects` array, `gallerySources`, `galleryTags` remain
   - Wrapped in `getFallbackProjects()` that returns a clone
   - If `data.json` fetch fails, the site renders from these — user sees a working portfolio

### Phase 2 — Side panel rendering (`index.html` + `app.js`)

6. **Empty side panel HTML of hardcoded content**
   - Remove all `<section class="side-block">` children from `#info-side-panel`
   - Keep only the container structure (`side-panel-top`, `side-panel-bottom`)

7. **Add `renderSidePanel(info)` function in `app.js`**
   - Reads keys from `info` object
   - Creates `<section class="side-block">` elements for each section
   - Copyright header: `<h3><a class="copyright-link">` + `<p class="copyright-lorem">`
   - Experience: `<h3>` + `<p>`
   - CV: `<h3>` + `<p><a href="...">`
   - Tools: `<h3>` + `<p>`
   - Contact: `<h3>` + `<p>` with email/telegram/instagram links
   - Appends to appropriate parent (`side-panel-top` vs `side-panel-bottom`)
   - Contact section goes into `side-panel-bottom`

8. **Update `syncMobileInfo()`**
   - Already reads from side panel DOM — no change needed
   - Since side panel is now dynamically populated, `syncMobileInfo()` will clone the dynamically created blocks

### Phase 3 — Video support in tiles

9. **Ensure `createTileMedia()` always uses the tile image for tiles**
   - Currently checks `media.type === "video"` to create a video element
   - **Change**: For tiles, ALWAYS use the image path (`poster` field) — never create video elements in the tile gallery
   - The `poster` field in the `media` object will be the `tile_image` value from the sheet
   - Video tiles show the static cover image; video playback only happens in the detail page
   - Remove the video-specific tile creation logic (`media.previewVideo` check)

10. **Update `lazyLoadVideo()` — keep for detail page videos only**
    - This function is only used if `createTileMedia` still creates videos (which it won't after task 9)
    - If no tile videos exist, the function can be removed or left as dead code for potential future use
    - **Decision**: Remove `lazyLoadVideo()` and its IntersectionObserver since tiles no longer use videos

### Phase 4 — Test video integration

11. **Create a cover image for the test video**
    - Take a screenshot/frame from `arnypraht.MP4`
    - Save as `./media/arnypraht-cover.jpg` (or `.webp` if converting)
    - Add to git repo

12. **Add test video to the sheet**
    - In the Projects sheet, add a column for the test project with:
      - `media_type`: `video`
      - `media_src`: `./media/arnypraht.MP4`
      - `tile_image`: `./media/arnypraht-cover.jpg`

13. **Verify video detail page rendering**
    - Detail page already handles video: checks `media.type === "video"` and creates a `<video>` element with controls
    - No code changes needed for detail page video display

### Phase 5 — Cleanup

14. **Remove unused code**
    - `gallerySources` array (replaced by sheet data)
    - `galleryTags` array (replaced by sheet data)
    - `lazyLoadVideo()` function (tiles no longer use videos)
    - `createTileMedia()` video branch (always uses image path now)

15. **Consolidate data flow**
    - Single `renderSiteFromData(data)` function is the entry point
    - All DOM population goes through this path
    - Fallback is called with hardcoded data object (structured identically to fetched JSON)

## Media Recommendations

- **Images**: Convert to WebP (`cwebp` or an online converter). 30–50% smaller than PNG/JPG with identical quality. All modern browsers support it. Keep original files as source-of-truth backups.
- **Video cover images**: Create a static WebP/JPEG for each video. Crop to the most representative frame.
- **Video files**: Keep as MP4 (H.264). GitHub Pages has a 100 MB file limit per file. Consider compressing with `ffmpeg` if files are large.

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Empty side panel of hardcoded blocks; keep container structure |
| `app.js` | Add `fetchSheetData()`, `renderSidePanel(info)`, update boot sequence, simplify `createTileMedia()` to image-only for tiles, remove `lazyLoadVideo()`, keep fallback arrays |
| `styles.css` | No changes (all existing classes reused) |
| `data.json` | New file — generated by Apps Script, consumed by site |
| `media/` | Add `arnypraht-cover.jpg` (or `.webp`) |

## Apps Script (separate deliverable)

The Apps Script lives in the Google Sheet's script editor, not in the GitHub repo. It will be provided as a standalone `.gs` file to paste into the Apps Script editor.

### Script behavior:
- `onEdit(e)` trigger on any cell edit
- 3-second debounce timer
- Reads `Projects` sheet, transposes columns → rows, builds project objects
- Reads `Info` sheet, builds key-value object
- Wraps both in `{ projects, info }` JSON
- Commits `data.json` to repo root via GitHub API
- Uses `GITHUB_TOKEN`, `GITHUB_REPO` (owner/repo), `GITHUB_BRANCH` from Script Properties

## Validation Steps

1. **After Apps Script setup**: Edit a cell in the sheet → wait 5 seconds → check GitHub repo for new commit with updated `data.json`
2. **Site build**: Push to main → GitHub Pages rebuilds → site loads `data.json` and renders content
3. **Fallback**: Delete or rename `data.json` → site loads and shows hardcoded fallback content
4. **Video on tile**: Hover over the video project's tile → shows static cover image (not a playing video)
5. **Video in detail**: Open the video project → detail page shows `<video>` with controls
6. **Prev/next**: Navigate between projects via prev/next buttons → content updates correctly
7. **Mobile**: About/contact tabs clone from dynamically rendered side panel → content matches
