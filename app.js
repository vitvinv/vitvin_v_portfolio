import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const PORTFOLIO_CONFIG = {
  head: {
    modelPath: "./models/head.glb",
    basePosition: { x: 0, y: 0.4, z: 0 },
    baseRotation: { x: 0.05, y: -0.08, z: 0 },
    scale: 1,
    autoFitHeight: 1,
    bob: { amplitude: 0.04, speed: 1.1 },
    lookAt: { lerp: 0.08, rangeX: 0.45, rangeY: 0.3 },
    targetViewportWidth: 0.7,
    cameraMinZ: 2.8,
    cameraMaxZ: 8.5,
    cameraLookAtY: 0,
    diagnostics: true,
    debugMaterial: false,
    headExposure: 1.3,
    mobileBaseY: 0.6,
    mobileScaleBoost: 1.25,
    mobileMetaBottom: "clamp(320px, 50%, 420px)",
    mobileMetaFontSize: "10px",
  },
  tiles: {
    mediaScale: 1,
    maxLaneHeightFactor: 0.62,
    minTileHeight: 130,
    maxTileHeight: 280,
    alignmentMode: "middle",
    randomOffsetY: 40,
    fallbackWidth: 320,
    fallbackHeight: 220,
    gap: 14,
    overlapFactor: 0.16,
    activeScale: 1.08,
    inactiveScale: 0.92,
    activeLift: 26,
    inactiveDrop: 14,
    emphasisLerp: 0.14,
    gestureZoneWidth: 0.6,
    wheelGestureWindowMs: 170,
    autoSpeed: 20,
    pauseDelay: 20,
    dragFactor: 1,
    dragVelocityFactor: 55,
    wheelScrollFactor: 0.62,
    wheelVelocityFactor: 0.2,
    velocityDamping: 0.9,
    visibleCount: 0,
    detailReveal: true,
    detailRevealSpeed: 400,
    detailRevealDuration: 600,
  },
};

var gallerySources = [
  "./projects/11111/face0.png",
  "./projects/22222/Generated Image March 25, 2026 - 7_50PM(1).jpg",
  "./projects/33333/950f644d5b61c97b8b3139a6323147e7.jpg",
  "./projects/44444/285844320e1483d2d7fb5fb912ac5082.jpg",
  "./projects/55555/3cf5d653cdfdfbcad92c59d59061c310.jpg",
  "./projects/arny-praht/arnypraht.MP4",
  "./projects/nature-cards/cover.jpg",
];

const galleryTags = [
  ["AI", "3D"],
  ["Brand", "Motion"],
  ["Design", "WebGL"],
  ["Render", "Code"],
  ["Studio", "Identity"],
  ["Visual", "Prototype"],
];

let projects = gallerySources.map((source, index) => {
  const id = `project-${index + 1}`;
  const tags = galleryTags[index % galleryTags.length];
  return {
    id: id,
    title: "loading\u2026",
    subtitle: tags.join(" / "),
    tags,
    description: "",
    link: "",
    media: {
      type: "image",
      src: source,
      poster: source,
      previewVideo: "",
    },
  };
});

const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const projectsPanel = panels.find((panel) => panel.dataset.panel === "projects");
const orientationMedia = window.matchMedia("(orientation: landscape)");

const orbit = document.getElementById("tiles-orbit");
const projectsList = document.getElementById("projects-list");
const headMetaName = document.getElementById("head-meta-name");
const headMetaTags = document.getElementById("head-meta-tags");

const detailPanel = document.querySelector("[data-panel='detail']");
const detailBackBtn = document.getElementById("detail-back");
const detailMedia = document.getElementById("detail-media");
const detailTitle = document.getElementById("detail-title");
const detailIndex = document.getElementById("detail-index");
const detailDescription = document.getElementById("detail-description");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailTags = document.getElementById("detail-tags");
const detailVideoControls = document.getElementById("detail-video-controls");

let selectedProjectIndex = 0;
let detailSource = null;
let tilesMotionController = null;
let activePanelId = panels.find((panel) => panel.classList.contains("is-active"))?.dataset.panel || "projects";

function applyMobileMetaVars() {
  const cfg = PORTFOLIO_CONFIG.head;
  const root = document.documentElement;
  root.style.setProperty("--meta-bottom-mobile", cfg.mobileMetaBottom);
  root.style.setProperty("--meta-font-size-mobile", cfg.mobileMetaFontSize);
}

function syncMobileInfo() {
  const sidePanel = document.getElementById("info-side-panel");
  const aboutTarget = document.getElementById("mobile-about-content");
  const contactTarget = document.getElementById("mobile-contact-content");

  if (!sidePanel) {
    return;
  }

  const blocks = sidePanel.querySelectorAll(".side-block");
  if (!blocks.length) {
    return;
  }

  const aboutBlocks = [];
  const contactBlocks = [];

  blocks.forEach((block) => {
    if (block.classList.contains("copyright-header")) {
      return;
    }

    const h3 = block.querySelector("h3");
    if (!h3) {
      return;
    }

    const heading = h3.textContent.trim().toLowerCase();
    if (heading === "contact") {
      contactBlocks.push(block.cloneNode(true));
    } else if (block.closest(".side-panel-bottom")) {
      return;
    } else {
      aboutBlocks.push(block.cloneNode(true));
    }
  });

  if (aboutTarget) {
    aboutTarget.innerHTML = "";
    aboutBlocks.forEach((b) => aboutTarget.appendChild(b));
  }

  if (contactTarget) {
    contactTarget.innerHTML = "";
    contactBlocks.forEach((b) => contactTarget.appendChild(b));
  }
}

/* ── Data layer ───────────────────── */
var FALLBACK_TEXT = "if you see this message, then there was an error on my side while filling the page and i promise to fix it soon";

function getFallbackProjects() {
  return gallerySources.map(function (source, index) {
    var id = "project-" + (index + 1);
    var tags = galleryTags[index % galleryTags.length];
    return {
      id: id,
      title: FALLBACK_TEXT,
      subtitle: tags.join(" / "),
      tags: tags,
      description: FALLBACK_TEXT,
      link: "",
      media: { type: "image", src: source, poster: source, previewVideo: "" },
    };
  });
}

function getFallbackInfo() {
  return {
    copyright_name: FALLBACK_TEXT,
    copyright_lorem: FALLBACK_TEXT,
    experience: FALLBACK_TEXT,
    cv_label: "CV",
    cv_link_text: FALLBACK_TEXT,
    cv_link_url: "#",
    tools_label: "Tools",
    tools_text: FALLBACK_TEXT,
    contact_heading: "Contact",
    contact_email: FALLBACK_TEXT,
    contact_telegram: FALLBACK_TEXT,
    contact_instagram: FALLBACK_TEXT,
  };
}

function renderSidePanel(info) {
  const sidePanel = document.getElementById("info-side-panel");
  if (!sidePanel || !info) return;

  const top = sidePanel.querySelector(".side-panel-top");
  const bottom = sidePanel.querySelector(".side-panel-bottom");
  if (!top || !bottom) return;

  top.innerHTML = "";
  bottom.innerHTML = "";

  const copyright = document.createElement("section");
  copyright.className = "side-block copyright-header";
  copyright.innerHTML = `
    <h3><a class="copyright-link" href="#">${info.copyright_name || ""}</a></h3>
    ${info.copyright_lorem ? `<p class="copyright-lorem">${info.copyright_lorem.replace(/\n/g, "<br>")}</p>` : ""}
  `;
  top.appendChild(copyright);

  if (info.experience) {
    const el = document.createElement("section");
    el.className = "side-block";
    el.innerHTML = `<h3>Experience</h3><p>${info.experience.replace(/\n/g, "<br>")}</p>`;
    top.appendChild(el);
  }

  if (info.cv_link_text) {
    const el = document.createElement("section");
    el.className = "side-block";
    el.innerHTML = `<h3>${info.cv_label || "CV"}</h3><p><a href="${info.cv_link_url || "#"}" target="_blank" rel="noreferrer">${info.cv_link_text}</a></p>`;
    top.appendChild(el);
  }

  if (info.tools_text) {
    const el = document.createElement("section");
    el.className = "side-block";
    el.innerHTML = `<h3>${info.tools_label || "Tools"}</h3><p>${info.tools_text}</p>`;
    top.appendChild(el);
  }

  if (info.contact_email || info.contact_telegram || info.contact_instagram) {
    const links = [];
    if (info.contact_email) links.push(`<a href="mailto:${info.contact_email}">email</a>`);
    if (info.contact_telegram) links.push(`<a href="https://t.me/${info.contact_telegram}" target="_blank" rel="noreferrer">telegram</a>`);
    if (info.contact_instagram) links.push(`<a href="https://instagram.com/${info.contact_instagram}" target="_blank" rel="noreferrer">instagram</a>`);
    const el = document.createElement("section");
    el.className = "side-block";
    el.innerHTML = `<h3>${info.contact_heading || "Contact"}</h3><p>${links.join(" &middot; ")}</p>`;
    bottom.appendChild(el);
  }
}

/* ── Boot ─────────────────────────── */
async function boot() {
  try {
    const res = await fetch("./data.json");
    if (!res.ok) throw new Error("data.json not ok");
    const data = await res.json();
    projects = data.projects || [];
    renderSidePanel(data.info || {});
  } catch (e) {
    console.warn("data.json unavailable, using fallback:", e.message);
    projects = getFallbackProjects();
    renderSidePanel(getFallbackInfo());
  }

  setupTabs();
  setupViewSwitch();
  setupResponsiveLayout();
  setActivePanel(activePanelId);
  renderProjects();
  setupDetailPanel();
  setupHeadScene(document.getElementById("head-stage"));
  applyMobileMetaVars();
  syncMobileInfo();

  document.querySelector(".copyright-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    setActivePanel("projects");
  });
}

boot();

function isProjectsTabActive() {
  return projectsPanel ? projectsPanel.classList.contains("is-active") : false;
}

function setupTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;

      if (orientationMedia.matches && (id === "about" || id === "contact")) {
        return;
      }

      setActivePanel(id);
    });
  });
}

function setupViewSwitch() {
  const toggle = document.getElementById("view-toggle");
  const options = document.querySelectorAll(".slider-option");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    if (activePanelId === "projects" || activePanelId === "index") {
      setActivePanel(activePanelId === "projects" ? "index" : "projects");
    }
  });

  options.forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const view = opt.dataset.view;
      if (view === "projects" || view === "index") {
        setActivePanel(view);
      }
    });
  });

  // Initial knob position
  updateSliderKnob("projects");
}

function setupResponsiveLayout() {
  const applyLayoutMode = () => {
    const isLandscape = orientationMedia.matches;
    document.body.classList.toggle("is-landscape", isLandscape);

    if (isLandscape && (activePanelId === "about" || activePanelId === "contact")) {
      setActivePanel("projects");
    }
  };

  applyLayoutMode();
  orientationMedia.addEventListener("change", applyLayoutMode);
}

function updateSliderKnob(panelId) {
  const toggle = document.getElementById("view-toggle");
  const options = document.querySelectorAll(".slider-option");
  const knob = document.querySelector(".slider-knob");
  if (!toggle || !knob) {
    return;
  }

  let activeOpt = null;
  options.forEach((opt) => {
    const isActive = opt.dataset.view === panelId;
    opt.classList.toggle("is-active", isActive);
    if (isActive) {
      activeOpt = opt;
    }
  });

  if (activeOpt) {
    knob.style.left = activeOpt.offsetLeft + "px";
    knob.style.width = activeOpt.offsetWidth + "px";
  }
}

let panelTransitionId = null;

function setActivePanel(id) {
  if (id === activePanelId) return;
  if (panelTransitionId) return;

  const oldPanel = panels.find(p => p.classList.contains('is-active'));
  const newPanel = panels.find(p => p.dataset.panel === id);
  if (!newPanel) return;

  activePanelId = id;

  tabs.forEach((tab) => {
    const tabId = tab.dataset.tab;
    const isActive = tabId === id || (tabId === "projects" && (id === "projects" || id === "index"));
    tab.classList.toggle("is-active", isActive);
  });

  const vs = document.querySelector(".view-switch");
  const showVs = () => {
    if (vs) vs.style.display = (id === "detail" || id === "about" || id === "contact") ? "none" : "";
  };

  if (!oldPanel || oldPanel === newPanel) {
    newPanel.classList.add('is-active');
    showVs();
    updateSliderKnob(id);
    if (id === "projects") {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
    return;
  }

  oldPanel.classList.remove('is-active');
  oldPanel.classList.add('is-leaving');

  panelTransitionId = setTimeout(() => {
    oldPanel.classList.remove('is-leaving');
    oldPanel.style.display = 'none';

    newPanel.style.display = '';
    newPanel.classList.add('is-active');
    showVs();
    updateSliderKnob(id);

    if (id === "projects") {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }

    panelTransitionId = null;
  }, 120);
}

function updateHeadMeta(project) {
  if (!headMetaName || !headMetaTags || !project) return;
  headMetaName.textContent = project.title;
  headMetaTags.textContent = (project.tags || []).join(" / ");
}

function renderProjects() {
  orbit.innerHTML = "";
  projectsList.innerHTML = "";
  const motionTiles = [];

  if (tilesMotionController) {
    tilesMotionController.destroy();
    tilesMotionController = null;
  }

  const cfg = PORTFOLIO_CONFIG.tiles;
  const viewWidth = window.innerWidth;
  const avgCardW = 220;
  const autoCount = Math.max(4, Math.ceil(viewWidth / avgCardW) + 5);
  const tileCount = cfg.visibleCount > 0 ? cfg.visibleCount : autoCount;
  // Ensure tile count is a multiple of project count so every cycle
  // contains the full project set — no partial loops.
  const copies = Math.max(1, Math.ceil(tileCount / projects.length));
  const totalTiles = copies * projects.length;
  const loopedProjects = [];
  for (let i = 0; i < totalTiles; i++) {
    loopedProjects.push(projects[i % projects.length]);
  }

  loopedProjects.forEach((project, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "project-tile";
    tile.setAttribute("aria-label", project.title);
    tile.setAttribute("draggable", "false");
    tile._projectDataId = project.id;

    tile.addEventListener("dragstart", (e) => e.preventDefault());

    const mediaEl = createTileMedia(project.media);
    tile.append(mediaEl);

    tile.addEventListener("mouseenter", () => {
      if (tilesMotionController) {
        tilesMotionController.setHovered(index);
      }
      updateHeadMeta(project);
    });

    tile.addEventListener("mouseleave", () => {
      if (tilesMotionController) {
        tilesMotionController.setHovered(-1);
      }
    });

    // Tile click handled via container (pointerCapture redirects events)
    tile._projectIndex = index;

    motionTiles.push(tile);
    orbit.appendChild(tile);
  });

  projects.forEach((project, index) => {
    const listItem = document.createElement("li");
    listItem.className = "projects-list-item";
    const previewSrc = project.media.poster || project.media.src;
    listItem.innerHTML = `
      <button class="projects-list-btn" type="button">
        <span class="projects-list-name">${project.title}</span>
        <span class="projects-list-tags">${(project.tags || []).join(" / ")}</span>
        <img class="list-preview" src="${previewSrc}" alt="" loading="lazy" />
      </button>
    `;

    listItem.firstElementChild.addEventListener("click", () => showDetail(index, "index"));
    projectsList.appendChild(listItem);
  });

  updateHeadMeta(projects[0]);
  tilesMotionController = setupTilesMotion(orbit, motionTiles, (focusedIndex) => {
    const focusedTile = motionTiles[focusedIndex];
    if (focusedTile && focusedTile._projectDataId) {
      const focusedProject = projects.find(function (p) { return p.id === focusedTile._projectDataId; });
      if (focusedProject) updateHeadMeta(focusedProject);
    }
  });
}

function setupTilesMotion(container, tiles, onFocusChange) {
  const cfg = PORTFOLIO_CONFIG.tiles;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const normalizeAlignmentMode = (value) => {
    const input = String(value || "middle").trim().toLowerCase();
    if (input === "lower" || input === "bottom") {
      return "lower";
    }
    if (input === "upper" || input === "top") {
      return "upper";
    }
    if (input === "random") {
      return "random";
    }
    return "middle";
  };
  const alignmentMode = normalizeAlignmentMode(cfg.alignmentMode);

  const seededRandom = (index) => {
    const seed = Math.sin((index + 1) * 78.233) * 43758.5453123;
    return seed - Math.floor(seed);
  };

  const state = {
    offset: 0,
    userVelocity: 0,
    lastTime: performance.now(),
    metrics: tiles.map(() => ({ width: cfg.fallbackWidth, height: cfg.fallbackHeight, start: 0 })),
    alignRandom: tiles.map((_, index) => seededRandom(index)),
    emphasis: tiles.map((_, index) => (index === 0 ? 1 : 0)),
    renderX: tiles.map(() => Number.NaN),
    trackLength: 1,
    isDragging: false,
    pointerId: null,
    lastDragX: 0,
    dragDistance: 0,
    suppressClickUntil: 0,
    hoveredIndex: -1,
    gestureIndex: -1,
    focusedIndex: -1,
    layerDiagnosticsLogged: false,
    pauseUntil: 0,
    pointerDownX: 0,
    wheelGestureTimer: 0,
    rafId: 0,
  };

  const cleanupFns = [];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setHoveredIndex = (index) => {
    if (!supportsHover.matches) {
      state.hoveredIndex = -1;
      return;
    }

    const valid = Number.isInteger(index) && index >= 0 && index < tiles.length;
    state.hoveredIndex = valid ? index : -1;
  };

  const getMediaSize = (tile) => {
    const media = tile.querySelector(".tile-media");

    if (media instanceof HTMLImageElement && media.naturalWidth > 0 && media.naturalHeight > 0) {
      return {
        width: media.naturalWidth,
        height: media.naturalHeight,
      };
    }

    if (media instanceof HTMLVideoElement && media.videoWidth > 0 && media.videoHeight > 0) {
      return {
        width: media.videoWidth,
        height: media.videoHeight,
      };
    }

    return {
      width: cfg.fallbackWidth,
      height: cfg.fallbackHeight,
    };
  };

  const bindMediaLoadRefresh = () => {
    tiles.forEach((tile) => {
      const media = tile.querySelector(".tile-media");
      if (!media) {
        return;
      }

      const handler = () => {
        recalcMetrics();
      };

      if (media instanceof HTMLImageElement) {
        media.addEventListener("load", handler);
        cleanupFns.push(() => media.removeEventListener("load", handler));
      } else if (media instanceof HTMLVideoElement) {
        media.addEventListener("loadedmetadata", handler);
        cleanupFns.push(() => media.removeEventListener("loadedmetadata", handler));
      }
    });
  };

  const computeTileX = (metric, viewportWidth, index, commit = true) => {
    const span = Math.max(state.trackLength, 1);
    const margin = Math.max(40, metric.width * 0.25);
    const minX = -metric.width - margin;
    const maxX = viewportWidth + metric.width + margin;
    const rawX = metric.start + state.offset;
    const base = ((rawX - minX) % span + span) % span + minX;
    const previousX = Number.isFinite(state.renderX[index]) ? state.renderX[index] : viewportWidth * 0.5;

    let bestX = Number.NaN;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let k = -3; k <= 3; k += 1) {
      const candidateX = base + k * span;
      if (candidateX < minX || candidateX > maxX) {
        continue;
      }

      const distance = Math.abs(candidateX - previousX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestX = candidateX;
      }
    }

    const x = Number.isFinite(bestX) ? bestX : Math.min(maxX, Math.max(minX, base));
    if (commit) {
      state.renderX[index] = x;
    }

    return x;
  };

  const getNearestIndexByClientX = (clientX) => {
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth || 1;
    const localX = Number.isFinite(clientX) ? clamp(clientX - rect.left, 0, width) : width * 0.5;
    return findClosestTile(width, localX);
  };

  const getCenterTileIndex = () => {
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth || 1;
    const centerX = width * 0.5;
    return findClosestTile(width, centerX);
  };

  const findClosestTile = (viewportWidth, targetX) => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const span = Math.max(state.trackLength, 1);

    state.metrics.forEach((metric, index) => {
      const x = computeTileX(metric, viewportWidth, index, false);
      const baseCenter = x + metric.width * 0.5;
      const candidates = [baseCenter - span, baseCenter, baseCenter + span];

      candidates.forEach((centerX) => {
        const distance = Math.abs(centerX - targetX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
    });

    return nearestIndex;
  };

  const recalcMetrics = () => {
    const laneHeight = container.getBoundingClientRect().height || window.innerHeight * 0.35;
    const mediaSizes = tiles.map((tile) => getMediaSize(tile));
    const manualScale = cfg.mediaScale > 0 ? cfg.mediaScale : 1;
    const targetHeight = Math.round(
      clamp(laneHeight * cfg.maxLaneHeightFactor * manualScale, cfg.minTileHeight, cfg.maxTileHeight)
    );
    const targetArea = Math.max(targetHeight * targetHeight, 1);
    const overlapPx = Math.max(1, Math.round(targetHeight * cfg.overlapFactor));
    const overlapBoost = Math.max(0, cfg.gap);

    let cursor = 0;

    tiles.forEach((tile, index) => {
      const size = mediaSizes[index];
      const aspect = size.height > 0 ? size.width / size.height : cfg.fallbackWidth / cfg.fallbackHeight;
      const safeAspect = Number.isFinite(aspect) && aspect > 0.001 ? aspect : 1;
      const rawWidth = Math.max(Math.round(Math.sqrt(targetArea * safeAspect)), 1);
      const rawHeight = Math.max(Math.round(Math.sqrt(targetArea / safeAspect)), 1);
      const viewportWidth = container.getBoundingClientRect().width || window.innerWidth || 1;
      const maxWidth = Math.round(viewportWidth * 0.4);
      const cappedWidth = Math.min(rawWidth, maxWidth);
      const cappedHeight = cappedWidth < rawWidth ? Math.max(Math.round(cappedWidth / safeAspect), 1) : rawHeight;

      state.metrics[index].width = cappedWidth;
      state.metrics[index].height = cappedHeight;
      state.metrics[index].start = cursor;

      tile.style.width = `${cappedWidth}px`;
      tile.style.height = `${cappedHeight}px`;

      const step = Math.max(cappedWidth - overlapPx - overlapBoost, Math.round(cappedWidth * 0.34));
      cursor += step;
    });

    state.trackLength = Math.max(cursor, 1);
    // Initialize sequential positions so the first render shows correct tile order
    for (var ri = 0; ri < tiles.length; ri++) {
      state.renderX[ri] = state.metrics[ri].start;
    }
  };

  const renderPositions = () => {
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth || 1;
    const height = rect.height || 1;
    const centerX = width * 0.5;
    const isGestureActive = state.gestureIndex >= 0;
    const isHoverActive = !isGestureActive && state.hoveredIndex >= 0;
    const activeDeckIndex = isGestureActive ? state.gestureIndex : isHoverActive ? state.hoveredIndex : -1;
    const hasActiveDeck = activeDeckIndex >= 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    tiles.forEach((tile, index) => {
      const metric = state.metrics[index];
      const x = computeTileX(metric, width, index);
      const remainingSpace = Math.max(height - metric.height, 0);
      let baseY = remainingSpace * 0.5;

      if (alignmentMode === "upper") {
        baseY = 0;
      } else if (alignmentMode === "lower") {
        baseY = remainingSpace;
      } else if (alignmentMode === "random") {
        baseY = remainingSpace * state.alignRandom[index];
      }

      if (cfg.randomOffsetY > 0) {
        const offset = (state.alignRandom[(index + 7) % tiles.length] - 0.5) * cfg.randomOffsetY * 2;
        baseY += offset;
      }

      const cardCenterX = x + metric.width * 0.5;
      const distanceToCenter = Math.abs(cardCenterX - centerX);
      if (distanceToCenter < closestDistance) {
        closestDistance = distanceToCenter;
        closestIndex = index;
      }

      let target = 0;

      if (isGestureActive) {
        const zoneRadius = Math.max(width * cfg.gestureZoneWidth * 0.5, 1);
        target = Math.max(0, 1 - distanceToCenter / zoneRadius);
      } else if (isHoverActive && index === activeDeckIndex) {
        target = 1;
      }

      state.emphasis[index] += (target - state.emphasis[index]) * cfg.emphasisLerp;

      const emphasis = state.emphasis[index];
      let scale = 1;
      let y = baseY;

      if (emphasis > 0.001) {
        scale = 1 + (cfg.activeScale - 1) * emphasis;
        y = baseY - cfg.activeLift * emphasis;
      }

      const xDepth = Math.max(1, Math.round((width - x) * 10));

      tile.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      tile.style.clipPath = "none";
      tile.style.zIndex = `${xDepth}`;
    });

    const displayIndex = isHoverActive ? activeDeckIndex : closestIndex;
    if (displayIndex !== state.focusedIndex) {
      state.focusedIndex = displayIndex;
      if (typeof onFocusChange === "function") {
        onFocusChange(displayIndex);
      }
    }

    if (!state.layerDiagnosticsLogged && !hasActiveDeck && tiles.length > 2) {
      const layerSnapshot = tiles
        .map((_, index) => {
          const metric = state.metrics[index];
          const x = computeTileX(metric, width, index, false);
          const z = Math.max(1, Math.round((width - x) * 10));
          return { index, x: Number(x.toFixed(2)), z };
        })
        .sort((a, b) => a.x - b.x);

      const hasZInversion = layerSnapshot.some((entry, index, list) => index > 0 && entry.z > list[index - 1].z);

      console.info("[deck] layer diagnostics", {
        hasZInversion,
        order: layerSnapshot,
      });

      state.layerDiagnosticsLogged = true;
    }
  };

  const onWheel = (event) => {
    if (!isProjectsTabActive()) {
      return;
    }

    event.preventDefault();
    if (!state.wheelGestureTimer) {
      state.gestureIndex = getCenterTileIndex(container);
    }

    if (state.wheelGestureTimer) {
      window.clearTimeout(state.wheelGestureTimer);
    }

    state.pauseUntil = performance.now() + cfg.pauseDelay * 1000;
    state.wheelGestureTimer = window.setTimeout(() => {
      state.wheelGestureTimer = 0;
      state.gestureIndex = -1;
    }, cfg.wheelGestureWindowMs);

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    state.offset -= delta * cfg.wheelScrollFactor;
    state.userVelocity += -delta * cfg.wheelVelocityFactor;
  };

  const onPointerDown = (event) => {
    if (!isProjectsTabActive()) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    state.pointerId = event.pointerId;
    state.pointerDownX = event.clientX;
    state.lastDragX = event.clientX;
    state.dragDistance = 0;
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== state.pointerId) {
      return;
    }

    if (!state.isDragging) {
      const totalDelta = Math.abs(event.clientX - state.pointerDownX);
      if (totalDelta < 3) {
        return;
      }

      state.isDragging = true;
      state.pauseUntil = performance.now() + cfg.pauseDelay * 1000;
      state.gestureIndex = getCenterTileIndex(container);
      setHoveredIndex(-1);
      container.classList.add("is-dragging");
      event.preventDefault();
    }

    const deltaX = event.clientX - state.lastDragX;
    state.lastDragX = event.clientX;
    state.dragDistance += Math.abs(deltaX);
    state.offset += deltaX * cfg.dragFactor;
    state.userVelocity = deltaX * cfg.dragVelocityFactor;
  };

  const endDrag = (event) => {
    if (event && event.pointerId !== undefined && event.pointerId !== state.pointerId) {
      return;
    }

    const wasDragging = state.isDragging;

    if (wasDragging && state.dragDistance > 6) {
      state.suppressClickUntil = performance.now() + 130;
    }

    state.isDragging = false;
    state.pointerId = null;
    state.pointerDownX = 0;
    state.dragDistance = 0;
    state.gestureIndex = -1;

    if (
      supportsHover.matches &&
      event &&
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY)
    ) {
      const hoveredNode = document.elementFromPoint(event.clientX, event.clientY);
      const hoveredTile = hoveredNode instanceof Element ? hoveredNode.closest(".project-tile") : null;
      const hoveredIndex = hoveredTile ? tiles.indexOf(hoveredTile) : -1;
      setHoveredIndex(hoveredIndex);
    }

    container.classList.remove("is-dragging");
  };

  const animate = (now) => {
    const deltaSeconds = Math.min((now - state.lastTime) / 1000, 0.05);
    state.lastTime = now;

    if (!state.isDragging && now > state.pauseUntil) {
      const autoStep = -cfg.autoSpeed * deltaSeconds;
      state.offset += autoStep;
    }

    state.offset += state.userVelocity * deltaSeconds;
    state.userVelocity *= Math.pow(cfg.velocityDamping, deltaSeconds * 60);

    if (Math.abs(state.userVelocity) < 0.5) {
      state.userVelocity = 0;
    }

    renderPositions();
    state.rafId = window.requestAnimationFrame(animate);
  };

  recalcMetrics();
  bindMediaLoadRefresh();
  renderPositions();

  container.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("pointermove", onPointerMove);
  container.addEventListener("click", (event) => {
    const tile = event.target.closest(".project-tile");
    if (!tile || state.isDragging) {
      return;
    }

    if (performance.now() < state.suppressClickUntil) {
      return;
    }

    const tileIndex = tiles.indexOf(tile);
    if (tileIndex >= 0) {
      const projectId = tile._projectDataId;
      if (projectId) {
        const originalIndex = projects.findIndex(function (p) { return p.id === projectId; });
        showDetail(originalIndex >= 0 ? originalIndex : tileIndex % projects.length, activePanelId, tile);
      }
    }
  });

  container.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", recalcMetrics);

  state.rafId = window.requestAnimationFrame(animate);

  return {
    setHovered(index) {
      setHoveredIndex(index);
    },
    shouldSuppressClick() {
      return performance.now() < state.suppressClickUntil;
    },
    destroy() {
      if (state.wheelGestureTimer) {
        window.clearTimeout(state.wheelGestureTimer);
      }

      window.cancelAnimationFrame(state.rafId);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("resize", recalcMetrics);
      cleanupFns.forEach((fn) => fn());
    },
  };
}

var IMG_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function tryImageExtensions(imgEl, originalSrc) {
  if (!originalSrc) return;
  var base = originalSrc.replace(/\.[^.]+$/, "");
  var tried = [originalSrc.substring(base.length)];
  imgEl.onerror = function () {
    var next = IMG_EXTENSIONS.find(function (ext) { return tried.indexOf(ext) === -1; });
    if (next) {
      tried.push(next);
      this.src = base + next;
    } else {
      this.onerror = null;
    }
  };
}

function createTileMedia(media) {
  var image = document.createElement("img");
  image.className = "tile-media";
  image.src = media.poster || media.src;
  tryImageExtensions(image, image.src);
  image.alt = "";
  image.loading = "eager";
  image.decoding = "async";
  return image;
}

function setupDetailPanel() {
  if (!detailBackBtn) {
    return;
  }

  detailBackBtn.addEventListener("click", () => {
    hideDetail();
  });

  const prevBtn = document.getElementById("detail-prev");
  const nextBtn = document.getElementById("detail-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const newIndex = (selectedProjectIndex - 1 + projects.length) % projects.length;
      showDetail(newIndex, detailSource || "projects");
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const newIndex = (selectedProjectIndex + 1) % projects.length;
      showDetail(newIndex, detailSource || "projects");
    });
  }
}

function showDetail(index, source, tileElement) {
  selectedProjectIndex = index;
  detailSource = source || activePanelId;
  const project = projects[index];
  const cfg = PORTFOLIO_CONFIG.tiles;

  function fillDetailContent() {
    detailTitle.textContent = project.title;
    detailDescription.textContent = project.description;
    if (detailSubtitle) {
      detailSubtitle.textContent = project.subtitle || "";
    }
    if (detailTags) {
      detailTags.textContent = (project.tags || []).join(" / ");
    }
    if (detailBackBtn) {
      detailBackBtn.textContent = detailSource === "index" ? "back to index" : "back to overview";
    }

    detailMedia.innerHTML = "";

    if (project.media.type === "video" && project.media.src) {
      const video = document.createElement("video");
      video.src = project.media.src;
      video.poster = project.media.poster;
      video.preload = "metadata";
      video.playsInline = true;
      video.id = "detail-video";
      detailMedia.appendChild(video);

      video.addEventListener("loadedmetadata", () => {
        if (video.videoWidth && video.videoHeight) {
          video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        }
      });

      if (detailVideoControls) {
        detailVideoControls.style.display = "";
        bindVideoControls(video);
      }
    } else {
      const image = document.createElement("img");
      image.src = project.media.poster || project.media.src;
      tryImageExtensions(image, image.src);
      image.alt = `${project.title} cover`;
      detailMedia.appendChild(image);

      if (detailVideoControls) {
        detailVideoControls.style.display = "none";
      }
    }
  }

  function showDetailPanel() {
    panels.forEach((p) => p.classList.remove("is-active"));
    detailPanel.classList.remove("is-leaving");
    detailPanel.style.display = "";
    void detailPanel.offsetWidth;
    detailPanel.classList.add("is-active");
    activePanelId = "detail";
    const vs = document.querySelector(".view-switch");
    if (vs) vs.style.display = "none";
  }

  if (cfg.detailReveal && tileElement) {
    const overlay = document.getElementById("reveal-overlay");
    const revealImg = document.getElementById("reveal-image");
    if (overlay && revealImg) {
      const tileImg = tileElement.querySelector(".tile-media");
      const imgSrc = tileImg ? (tileImg.currentSrc || tileImg.src) : (project.media.poster || project.media.src);
      revealImg.src = imgSrc;

      const tileRect = tileElement.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tileCX = tileRect.left + tileRect.width / 2;
      const tileCY = tileRect.top + tileRect.height / 2;
      const scaleFrom = tileRect.width / vw;
      const translateX = tileCX - vw / 2;
      const translateY = tileCY - vh / 2;

      revealImg.style.transition = "none";
      revealImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleFrom})`;
      revealImg.style.opacity = "0.7";
      overlay.classList.add("is-active");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const speed = cfg.detailRevealSpeed + "ms";
          revealImg.style.transition = `transform ${speed} ease, opacity ${speed} ease`;
          revealImg.style.transform = "translate(0, 0) scale(1)";
          revealImg.style.opacity = "1";
        });
      });

      fillDetailContent();

      setTimeout(() => {
        overlay.classList.remove("is-active");
        revealImg.style.transition = "none";
        revealImg.style.transform = "";
        revealImg.style.opacity = "";
        requestAnimationFrame(() => showDetailPanel());
      }, cfg.detailRevealSpeed + cfg.detailRevealDuration);
      return;
    }
  }

  fillDetailContent();
  showDetailPanel();
}

function bindVideoControls(video) {
  const playBtn = document.getElementById("detail-video-play");
  const playIcon = document.getElementById("detail-play-icon");
  const pauseIcon = document.getElementById("detail-pause-icon");
  const fullscreenBtn = document.getElementById("detail-video-fullscreen");

  function showPlay() { playIcon.style.display = ""; pauseIcon.style.display = "none"; }
  function showPause() { playIcon.style.display = "none"; pauseIcon.style.display = ""; }

  if (playBtn) {
    playBtn.onclick = () => {
      if (video.paused) {
        video.play();
        showPause();
      } else {
        video.pause();
        showPlay();
      }
    };
  }

  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      }
    };
  }

  video.onplay = () => showPause();
  video.onpause = () => showPlay();
  video.onended = () => showPlay();
  video.onclick = () => {
    if (video.paused) { video.play(); showPause(); }
    else { video.pause(); showPlay(); }
  };

  showPlay();
}

function hideDetail() {
  const video = document.getElementById("detail-video");
  if (video) video.pause();

  detailPanel.classList.remove("is-active");
  detailPanel.classList.add("is-leaving");

  setTimeout(() => {
    detailPanel.classList.remove("is-leaving");
    detailPanel.style.display = "none";

    const target = detailSource || "projects";
    detailSource = null;
    setActivePanel(target);
  }, 120);
}

function setupHeadScene(stage) {
  if (!stage) {
    return;
  }

  const scene = new THREE.Scene();
  scene.background = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

  stage.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.3, 4.2);

  let headWidthWorld = 1.8;

  const updateCameraFraming = () => {
    const cfg = PORTFOLIO_CONFIG.head;
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const aspect = Math.max(camera.aspect, 0.1);
    const targetWidth = THREE.MathUtils.clamp(cfg.targetViewportWidth, 0.2, 0.9);
    const idealDistance = headWidthWorld / (2 * Math.tan(fovRad / 2) * aspect * targetWidth);
    const distance = THREE.MathUtils.clamp(idealDistance, cfg.cameraMinZ, cfg.cameraMaxZ);

    camera.position.set(0, 0.3, distance);
    camera.lookAt(0, cfg.cameraLookAtY, 0);
  };

  const exp = PORTFOLIO_CONFIG.head.headExposure;

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1 * exp);
  keyLight.position.set(4, 3, 6);

  const fillLight = new THREE.DirectionalLight(0xffe6cf, 0.7 * exp);
  fillLight.position.set(-4, 1, 3);

  const ambient = new THREE.AmbientLight(0xfff3e6, 0.95 * exp);
  scene.add(keyLight, fillLight, ambient);

  const group = new THREE.Group();
  group.position.set(
    PORTFOLIO_CONFIG.head.basePosition.x,
    PORTFOLIO_CONFIG.head.basePosition.y,
    PORTFOLIO_CONFIG.head.basePosition.z
  );
  group.rotation.set(
    PORTFOLIO_CONFIG.head.baseRotation.x,
    PORTFOLIO_CONFIG.head.baseRotation.y,
    PORTFOLIO_CONFIG.head.baseRotation.z
  );
  scene.add(group);

  const loader = new GLTFLoader();
  loader.load(
    PORTFOLIO_CONFIG.head.modelPath,
    (gltf) => {
      const model = gltf.scene;
      const cfg = PORTFOLIO_CONFIG.head;

      const fitScale = normalizeModel(model, cfg.autoFitHeight);
      model.scale.multiplyScalar(fitScale * cfg.scale);
      const centered = centerObjectAtOrigin(model);

      let meshCount = 0;
      model.traverse((child) => {
        if (child.isMesh) {
          meshCount += 1;
          child.castShadow = false;
          child.receiveShadow = false;

          if (cfg.debugMaterial) {
            child.material = new THREE.MeshNormalMaterial({ flatShading: true });
          } else {
            // Force all materials to respond to scene lights
            const mat = child.material;
            if (mat && (mat.isMeshBasicMaterial || !mat.isMeshStandardMaterial)) {
              const newMat = new THREE.MeshStandardMaterial({
                color: mat.color || 0xddccbb,
                map: mat.map || null,
                roughness: 0.7,
                metalness: 0.05,
              });
              child.material = newMat;
            }
          }
        }
      });

      group.add(model);

      const detectedWidth = getObjectWidth(model);
      if (detectedWidth) {
        headWidthWorld = detectedWidth;
        updateCameraFraming();
      }

      const diag = captureHeadDiagnostics(group, camera, stage);

      if (cfg.diagnostics) {
        console.info("[head] GLB loaded", {
          modelPath: cfg.modelPath,
          fitScale,
          baseScale: cfg.scale,
          centered,
          meshCount,
          diagnostics: diag,
        });
      }
    },
    (event) => {
      const cfg = PORTFOLIO_CONFIG.head;
      if (!cfg.diagnostics || !event.total) {
        return;
      }

      const percent = Math.round((event.loaded / event.total) * 100);
      if (percent % 25 === 0 || percent === 100) {
        console.info(`[head] Loading ${percent}%`);
      }
    },
    (error) => {
      const fallback = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 2),
        new THREE.MeshStandardMaterial({ color: 0xd0b398, flatShading: true, metalness: 0.02, roughness: 0.92 })
      );
      group.add(fallback);

      const fallbackWidth = getObjectWidth(fallback);
      if (fallbackWidth) {
        headWidthWorld = fallbackWidth;
        updateCameraFraming();
      }

      if (PORTFOLIO_CONFIG.head.diagnostics) {
        console.error("[head] Failed to load GLB. Showing fallback mesh.", error);
      }

    }
  );

  const pointer = { x: 0, y: 0 };

  const setPointerFromClient = (clientX, clientY) => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    const x = (clientX - rect.left) / width;
    const y = (clientY - rect.top) / height;
    pointer.x = THREE.MathUtils.clamp((x - 0.5) * 2, -1, 1);
    pointer.y = THREE.MathUtils.clamp((y - 0.5) * 2, -1, 1);
  };

  window.addEventListener("pointermove", (event) => {
    if (!isProjectsTabActive()) {
      return;
    }

    setPointerFromClient(event.clientX, event.clientY);
  });

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!isProjectsTabActive()) {
        return;
      }

      if (event.touches[0]) {
        setPointerFromClient(event.touches[0].clientX, event.touches[0].clientY);
      }
    },
    { passive: true }
  );

  window.addEventListener("blur", () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  const resize = (reason = "window-resize") => {
    const rect = stage.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    if (width < 2 || height < 2) {
      if (PORTFOLIO_CONFIG.head.diagnostics) {
        console.info("[head] resize skipped", { reason, panel: activePanelId, width, height });
      }
      return;
    }

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateCameraFraming();

    if (PORTFOLIO_CONFIG.head.diagnostics) {
      const diag = captureHeadDiagnostics(group, camera, stage);
      if (diag) {
        console.info("[head] resize diagnostics", {
          reason,
          panel: activePanelId,
          ...diag,
        });
      }
    }
  };

  const stageResizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          resize("stage-observer");
        })
      : null;

  if (stageResizeObserver) {
    stageResizeObserver.observe(stage);
  }

  const clock = new THREE.Clock();

  function animate(targetModel, cfg) {
    const frame = () => {
      const elapsed = clock.getElapsedTime();
      const activePointerX = isProjectsTabActive() ? pointer.x : 0;
      const activePointerY = isProjectsTabActive() ? pointer.y : 0;

      const isMobile = window.innerWidth < 641;
      const baseY = isMobile ? cfg.mobileBaseY : cfg.basePosition.y;

      const targetY = cfg.baseRotation.y + activePointerX * cfg.lookAt.rangeX;
      const targetX = cfg.baseRotation.x + activePointerY * cfg.lookAt.rangeY;

      targetModel.rotation.y = THREE.MathUtils.lerp(targetModel.rotation.y, targetY, cfg.lookAt.lerp);
      targetModel.rotation.x = THREE.MathUtils.lerp(targetModel.rotation.x, targetX, cfg.lookAt.lerp);

      targetModel.position.y = baseY + Math.sin(elapsed * cfg.bob.speed) * cfg.bob.amplitude;

      renderer.render(scene, camera);
      window.requestAnimationFrame(frame);
    };

    resize("init");
    frame();
  }

  animate(group, PORTFOLIO_CONFIG.head);
  window.addEventListener("resize", () => {
    resize("window-resize");
  });

  window.addEventListener("resize", () => {
    updateSliderKnob(activePanelId);
  });
}

function captureHeadDiagnostics(object, camera, stage) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const ndc = center.clone().project(camera);
  const centerInFrustum =
    Number.isFinite(ndc.x) &&
    Number.isFinite(ndc.y) &&
    Number.isFinite(ndc.z) &&
    ndc.x >= -1 &&
    ndc.x <= 1 &&
    ndc.y >= -1 &&
    ndc.y <= 1 &&
    ndc.z >= -1 &&
    ndc.z <= 1;

  return {
    stageSize: `${Math.round(stage.clientWidth)}x${Math.round(stage.clientHeight)}`,
    center: center.toArray().map((v) => Number(v.toFixed(3))),
    size: size.toArray().map((v) => Number(v.toFixed(3))),
    ndc: ndc.toArray().map((v) => Number(v.toFixed(3))),
    centerInFrustum,
    cameraPosition: camera.position.toArray().map((v) => Number(v.toFixed(3))),
  };
}

function normalizeModel(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);

  if (box.isEmpty()) {
    return 1;
  }

  const size = box.getSize(new THREE.Vector3());

  const currentHeight = size.y > 0.001 ? size.y : Math.max(size.x, size.z, 1);
  return targetHeight > 0 ? targetHeight / currentHeight : 1;
}

function centerObjectAtOrigin(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  const centeredBox = new THREE.Box3().setFromObject(object);
  const centeredCenter = centeredBox.getCenter(new THREE.Vector3());

  return {
    beforeCenter: center.toArray().map((v) => Number(v.toFixed(3))),
    afterCenter: centeredCenter.toArray().map((v) => Number(v.toFixed(3))),
  };
}

function getObjectWidth(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  const size = box.getSize(new THREE.Vector3());
  return Math.max(size.x, size.z, 0.001);
}
