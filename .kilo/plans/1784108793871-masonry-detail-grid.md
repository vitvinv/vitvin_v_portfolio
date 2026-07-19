# JS Masonry Layout for Detail Grid

## Goal
Replace CSS Grid with a JS-driven masonry layout that packs images/videos tightly regardless of aspect ratio. Items flow left-to-right, each new item goes to the shortest column. Column heights are fully independent — a caption in one column does not affect adjacent columns.

## How It Works
1. Container (`detail-media`) becomes `position: relative`
2. Each item wrapper gets `position: absolute` with `left` / `top` / `width` set by JS
3. JS calculates column count from container width (min 280px per column, like current `minmax`)
4. For each item (left-to-right DOM order): find the shortest column, place the item there, update that column's accumulated height
5. Container height = tallest column
6. Recalculates on image load, video metadata, and window resize

## CSS Changes (`styles.css`)

### Replace grid rules with masonry rules
```
.has-multi-media .detail-media {
  position: relative;       /* was: display: grid */
  width: 100%;
  background: #ffffff;
}
```

### Items switch to natural height (no forced `height: 100%`)
```
.has-multi-media .detail-media-item-wrap .detail-media-item {
  width: 100%;
  height: auto;             /* was: height: 100% */
  display: block;
  object-fit: cover;         /* no-op when size matches aspect ratio */
}
```

### Items positioned by JS
```
.has-multi-media .detail-media-item-wrap {
  position: absolute;        /* JS sets left, top, width */
  overflow: hidden;
}
```

## JS Changes (`app.js`)

### New function: `layoutDetailMasonry()`
- Read `detailMedia.clientWidth` and `PORTFOLIO_CONFIG.detail.mediaGap`
- Calc: `cols = max(1, floor((width + gap) / (280 + gap)))`
- Calc: `colWidth = (width - (cols-1) * gap) / cols`
- Track `colHeights` array (starting at 0)
- Loop items (`.detail-media-item-wrap` children):
  - Find column with min `colHeights`
  - Set `item.style.left = col * (colWidth + gap)`
  - Set `item.style.top = colHeights[col]`
  - Set `item.style.width = colWidth + 'px'`
  - After setting width, read `item.offsetHeight` (triggers reflow)
  - Update `colHeights[col] += offsetHeight + gap`
- Set `detailMedia.style.height = max(colHeights) + 'px'`

### Call `layoutDetailMasonry` after rendering
In `fillDetailContent`, after all items are appended:
```js
layoutDetailMasonry();
```

### Recalculate on media loads
Add load/metadata listeners to images and videos in the loop:
```js
// Images: recalculate when loaded
image.addEventListener('load', layoutDetailMasonry);
image.addEventListener('error', layoutDetailMasonry);

// Videos: recalculate when metadata arrives
video.addEventListener('loadedmetadata', function() {
  // existing aspect-ratio code
  layoutDetailMasonry();
});
```

### Recalculate on resize
Add a debounced `ResizeObserver` on `detailMedia` that calls `layoutDetailMasonry()`:
```js
if (window.ResizeObserver) {
  new ResizeObserver(debounce(layoutDetailMasonry, 150)).observe(detailMedia);
}
```

### Debounce helper
```js
function debounce(fn, ms) {
  var t;
  return function() { clearTimeout(t); t = setTimeout(fn, ms); };
}
```

## Edge Cases
- **Single item**: one column, fills full width
- **No items**: container height stays 0
- **Images not loaded yet**: `offsetHeight` may be 0; each `load` event triggers recalculation, progressively improving the layout
- **Videos**: aspect-ratio from metadata ensures correct height
- **Captions**: included in `offsetHeight` naturally since they're inside the wrapper
- **Mobile** (`max-width: 900px`): `columns: 1` rule already exists — user confirmed this works correctly as-is; the masonry path only runs when `has-multi-media` is active (which is always now)

## Files Changed
- `styles.css`: ~3 rule blocks updated
- `app.js`: new `layoutDetailMasonry` function + call site + observers