import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const PORTFOLIO_CONFIG = {
  head: {
    modelPath: "./models/head.glb",
    basePosition: { x: 0, y: 0.25, z: 0 },
    baseRotation: { x: 0.05, y: -0.08, z: 0 },
    scale: 1,
    autoFitHeight: 1,
    bob: { amplitude: 0.07, speed: 1.1 },
    lookAt: { lerp: 0.08, rangeX: 0.45, rangeY: 0.3 },
    targetViewportWidth: 0.5,
    cameraMinZ: 2.8,
    cameraMaxZ: 8.5,
    cameraLookAtY: 0,
    diagnostics: true,
    debugMaterial: false,
  },
  tiles: {
    mediaScale: 1,
    maxLaneHeightFactor: 0.62,
    minTileHeight: 130,
    maxTileHeight: 280,
    alignmentMode: "middle",
    fallbackWidth: 320,
    fallbackHeight: 220,
    gap: 14,
    overlapFactor: 0.16,
    activeScale: 1.08,
    inactiveScale: 0.92,
    activeLift: 26,
    inactiveDrop: 14,
    emphasisLerp: 0.14,
    wheelGestureWindowMs: 170,
    autoSpeed: 20,
    dragFactor: 1,
    dragVelocityFactor: 55,
    wheelScrollFactor: 0.62,
    wheelVelocityFactor: 0.2,
    velocityDamping: 0.9,
  },
};

const gallerySources = [
  "./media/face0.png",
  "./media/example.jpg",
  "./media/Generated Image March 25, 2026 - 7_50PM(1).jpg",
  "./media/285844320e1483d2d7fb5fb912ac5082.jpg",
  "./media/950f644d5b61c97b8b3139a6323147e7.jpg",
  "./media/3cf5d653cdfdfbcad92c59d59061c310.jpg",
];

const galleryTags = [
  ["AI", "3D"],
  ["Brand", "Motion"],
  ["Design", "WebGL"],
  ["Render", "Code"],
  ["Studio", "Identity"],
  ["Visual", "Prototype"],
];

const projects = gallerySources.map((source, index) => {
  const titleIndex = String(index + 1).padStart(2, "0");
  const tags = galleryTags[index % galleryTags.length];
  return {
    id: `project-${index + 1}`,
    title: `Gallery ${titleIndex}`,
    subtitle: tags.join(" / "),
    tags,
    description: "Placeholder gallery panel. Replace title, copy, and link for final project content.",
    link: `https://example.com/project-${index + 1}`,
    media: {
      type: "image",
      src: source,
      poster: source,
      previewVideo: "",
    },
  };
});

const tabs = Array.from(document.querySelectorAll(".tab"));
const viewButtons = Array.from(document.querySelectorAll(".view-btn"));
const panels = Array.from(document.querySelectorAll(".panel"));
const projectsPanel = panels.find((panel) => panel.dataset.panel === "projects");
const orientationMedia = window.matchMedia("(orientation: landscape)");

const orbit = document.getElementById("tiles-orbit");
const projectsList = document.getElementById("projects-list");
const headMetaName = document.getElementById("head-meta-name");
const headMetaTags = document.getElementById("head-meta-tags");

const dialog = document.getElementById("project-dialog");
const closeDialogBtn = document.getElementById("dialog-close");
const detailMedia = document.getElementById("detail-media");
const detailTitle = document.getElementById("detail-title");
const detailIndex = document.getElementById("detail-index");
const detailDescription = document.getElementById("detail-description");
const detailLink = document.getElementById("detail-link");
const prevProjectBtn = document.getElementById("prev-project");
const nextProjectBtn = document.getElementById("next-project");

let selectedProjectIndex = 0;
let tilesMotionController = null;
let activePanelId = panels.find((panel) => panel.classList.contains("is-active"))?.dataset.panel || "projects";
let activeMetaIndex = -1;

setupTabs();
setupViewSwitch();
setupResponsiveLayout();
setActivePanel(activePanelId);
renderProjects();
setupDialog();
setupHeadScene(document.getElementById("head-stage"));

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
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetView = button.dataset.view;
      if (!targetView) {
        return;
      }

      setActivePanel(targetView);
    });
  });
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

function setActivePanel(id) {
  activePanelId = id;

  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === id));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === id));

  viewButtons.forEach((button) => {
    const buttonTarget = button.dataset.view;
    const activeView = id === "projects" || id === "index" ? id : null;
    button.classList.toggle("is-active", buttonTarget === activeView);
  });

  if (id === "projects") {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }
}

function updateHeadMeta(index) {
  if (!headMetaName || !headMetaTags) {
    return;
  }

  const safeIndex = Number.isInteger(index) && index >= 0 && index < projects.length ? index : 0;
  if (safeIndex === activeMetaIndex) {
    return;
  }

  const project = projects[safeIndex];
  activeMetaIndex = safeIndex;
  headMetaName.textContent = project.title;
  headMetaTags.textContent = project.tags.join(" / ");
}

function renderProjects() {
  orbit.innerHTML = "";
  projectsList.innerHTML = "";
  const motionTiles = [];

  if (tilesMotionController) {
    tilesMotionController.destroy();
    tilesMotionController = null;
  }

  projects.forEach((project, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "project-tile";
    tile.setAttribute("aria-label", project.title);

    const mediaEl = createTileMedia(project.media);
    tile.append(mediaEl);

    tile.addEventListener("mouseenter", () => {
      if (tilesMotionController) {
        tilesMotionController.setHovered(index);
      }
      updateHeadMeta(index);

      if (mediaEl.tagName === "VIDEO") {
        mediaEl.play().catch(() => {});
      }
    });

    tile.addEventListener("mouseleave", () => {
      if (tilesMotionController) {
        tilesMotionController.setHovered(-1);
      }

      if (mediaEl.tagName === "VIDEO") {
        mediaEl.pause();
      }
    });

    tile.addEventListener("click", (event) => {
      if (tilesMotionController && tilesMotionController.shouldSuppressClick()) {
        event.preventDefault();
        return;
      }

      openProject(index);
    });

    motionTiles.push(tile);
    orbit.appendChild(tile);

    const listItem = document.createElement("li");
    listItem.className = "projects-list-item";
    listItem.innerHTML = `
      <button class="projects-list-btn" type="button">
        <span>${project.title}<br><small>${project.subtitle}</small></span>
        <span>View</span>
      </button>
    `;

    listItem.firstElementChild.addEventListener("click", () => openProject(index));
    projectsList.appendChild(listItem);
  });

  updateHeadMeta(0);
  tilesMotionController = setupTilesMotion(orbit, motionTiles, (focusedIndex) => {
    updateHeadMeta(focusedIndex);
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
    const minX = -metric.width;
    const maxX = viewportWidth + metric.width;
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

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const span = Math.max(state.trackLength, 1);

    state.metrics.forEach((metric, index) => {
      const x = computeTileX(metric, width, index, false);
      const baseCenter = x + metric.width * 0.5;
      const candidates = [baseCenter - span, baseCenter, baseCenter + span];

      candidates.forEach((centerX) => {
        const distance = Math.abs(centerX - localX);
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
      const width = Math.max(Math.round(Math.sqrt(targetArea * safeAspect)), 1);
      const height = Math.max(Math.round(Math.sqrt(targetArea / safeAspect)), 1);

      state.metrics[index].width = width;
      state.metrics[index].height = height;
      state.metrics[index].start = cursor;

      tile.style.width = `${width}px`;
      tile.style.height = `${height}px`;

      const step = Math.max(width - overlapPx - overlapBoost, Math.round(width * 0.34));
      cursor += step;
    });

    state.trackLength = Math.max(cursor, 1);
    state.renderX.fill(Number.NaN);
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

      const cardCenterX = x + metric.width * 0.5;
      const distanceToCenter = Math.abs(cardCenterX - centerX);
      if (distanceToCenter < closestDistance) {
        closestDistance = distanceToCenter;
        closestIndex = index;
      }

      const target = hasActiveDeck && index === activeDeckIndex ? 1 : 0;
      state.emphasis[index] += (target - state.emphasis[index]) * cfg.emphasisLerp;

      const emphasis = state.emphasis[index];
      let scale = 1;
      let y = baseY;

      if (isGestureActive) {
        scale = 1 + (cfg.activeScale - 1) * emphasis;
        y = baseY - cfg.activeLift * emphasis;
      } else if (isHoverActive) {
        scale = 1 + (cfg.activeScale - 1) * emphasis;
        y = baseY - cfg.activeLift * emphasis;
      }

      const xDepth = Math.max(1, Math.round((width - x) * 10));
      const activeBoost = hasActiveDeck && index === activeDeckIndex ? 25000 : Math.round(emphasis * 800);

      tile.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      tile.style.clipPath = "none";
      tile.style.zIndex = `${xDepth + activeBoost}`;
    });

    const displayIndex = hasActiveDeck ? activeDeckIndex : closestIndex;
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
      state.gestureIndex = getNearestIndexByClientX(event.clientX);
    }

    if (state.wheelGestureTimer) {
      window.clearTimeout(state.wheelGestureTimer);
    }

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

    state.isDragging = true;
    state.pointerId = event.pointerId;
    state.lastDragX = event.clientX;
    state.dragDistance = 0;
    state.gestureIndex = getNearestIndexByClientX(event.clientX);
    setHoveredIndex(-1);
    container.classList.add("is-dragging");

    if (container.setPointerCapture) {
      container.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event) => {
    if (!state.isDragging || event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.lastDragX;
    state.lastDragX = event.clientX;
    state.dragDistance += Math.abs(deltaX);
    state.offset += deltaX * cfg.dragFactor;
    state.userVelocity = deltaX * cfg.dragVelocityFactor;
  };

  const endDrag = (event) => {
    if (!state.isDragging) {
      return;
    }

    if (event && event.pointerId !== undefined && event.pointerId !== state.pointerId) {
      return;
    }

    if (state.dragDistance > 6) {
      state.suppressClickUntil = performance.now() + 130;
    }

    state.isDragging = false;
    state.pointerId = null;
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

    const autoStep = -cfg.autoSpeed * deltaSeconds;
    state.offset += autoStep + state.userVelocity * deltaSeconds;
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
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
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
      container.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("resize", recalcMetrics);
      cleanupFns.forEach((fn) => fn());
    },
  };
}

function createTileMedia(media) {
  if (media.type === "video" && media.previewVideo) {
    const video = document.createElement("video");
    video.className = "tile-media";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = media.poster;
    video.dataset.src = media.previewVideo;

    lazyLoadVideo(video);
    return video;
  }

  const image = document.createElement("img");
  image.className = "tile-media";
  image.src = media.poster || media.src;
  image.alt = "";
  image.loading = "eager";
  image.decoding = "async";
  return image;
}

function lazyLoadVideo(video) {
  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        if (video.dataset.src) {
          video.src = video.dataset.src;
          video.removeAttribute("data-src");
          video.load();
        }

        io.unobserve(video);
      });
    },
    { rootMargin: "200px" }
  );

  observer.observe(video);
}

function setupDialog() {
  closeDialogBtn.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    const isInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!isInside) {
      dialog.close();
    }
  });

  prevProjectBtn.addEventListener("click", () => {
    const nextIndex = (selectedProjectIndex - 1 + projects.length) % projects.length;
    openProject(nextIndex);
  });

  nextProjectBtn.addEventListener("click", () => {
    const nextIndex = (selectedProjectIndex + 1) % projects.length;
    openProject(nextIndex);
  });
}

function openProject(index) {
  selectedProjectIndex = index;
  const project = projects[index];

  detailTitle.textContent = project.title;
  detailIndex.textContent = `${index + 1} / ${projects.length}`;
  detailDescription.textContent = project.description;
  detailLink.href = project.link;
  detailLink.textContent = project.link.includes("example.com") ? "Replace with your URL" : "Open project";

  detailMedia.innerHTML = "";

  if (project.media.type === "video" && project.media.src) {
    const video = document.createElement("video");
    video.src = project.media.src;
    video.poster = project.media.poster;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    detailMedia.appendChild(video);
  } else {
    const image = document.createElement("img");
    image.src = project.media.poster || project.media.src;
    image.alt = `${project.title} cover`;
    detailMedia.appendChild(image);
  }

  if (!dialog.open) {
    dialog.showModal();
  }
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

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(4, 3, 6);

  const fillLight = new THREE.DirectionalLight(0xffe6cf, 0.7);
  fillLight.position.set(-4, 1, 3);

  const ambient = new THREE.AmbientLight(0xfff3e6, 0.95);
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

      const targetY = cfg.baseRotation.y + activePointerX * cfg.lookAt.rangeX;
      const targetX = cfg.baseRotation.x + activePointerY * cfg.lookAt.rangeY;

      targetModel.rotation.y = THREE.MathUtils.lerp(targetModel.rotation.y, targetY, cfg.lookAt.lerp);
      targetModel.rotation.x = THREE.MathUtils.lerp(targetModel.rotation.x, targetX, cfg.lookAt.lerp);

      targetModel.position.y = cfg.basePosition.y + Math.sin(elapsed * cfg.bob.speed) * cfg.bob.amplitude;

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
