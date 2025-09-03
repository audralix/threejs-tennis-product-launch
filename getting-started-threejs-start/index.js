// index.js — Section-3 Technical View + Spec/Materials + Hover (refactored, finalized)

import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { gsap } from "gsap";
// import { RGBELoader } from "jsm/loaders/RGBELoader.js"; // (unused)

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ============================================================================
   CONFIG / CONSTANTS
============================================================================ */
const FLAGS = {
  DEBUG_AXES: false, // show world & model axes if true
  SHOW_GIZMO: false, // corner gizmo inset if true
};

const COLORS = {
  brand: 0x71d904,
  brandAccent: 0x9eff0a,
  cyan: 0x00cfff,
  court: 0x3e8c5e,
  techFrame: 0x9fb8b3,
  techGrip: 0x6a7a71,
  white: 0xffffff,
};

const PHYSICS = {
  stringSurfaceOffset: 0.2, // fudge so ball "kisses" strings
  gravity: -0.02,
  bounce: 0.6,
};

const SELECTORS = {
  canvas: "#three-canvas",
  s1: ".section-1",
  s2: ".section-2",
  s3: ".section-3",
  techToggle: "#techViewToggle",
  specPanel: "#panel-spec",
  shotFeedbackBox: ".shot-feedback-box",
  fabUp: ".fab-up",
  fabDown: ".fab-down",
  tabSpec: "#tab-spec",
  tabMaterials: "#tab-materials",
  tabPerformance: "#tab-performance",
};

/* ============================================================================
   CLICK INDICATOR (auto-injected DOM + CSS)
============================================================================ */
const INDICATOR_CSS = `
#click-indicator{position:fixed;left:0;top:0;transform:translate(-50%,-50%);display:none;z-index:50;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
#click-indicator .pulse{width:16px;height:16px;border-radius:999px;background:#71D904;box-shadow:0 0 0 0 rgba(113,217,4,.55);animation:pulse-ring 1.6s ease-out infinite}
@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(113,217,4,.55);transform:scale(.9)}70%{box-shadow:0 0 0 22px rgba(113,217,4,0);transform:scale(1)}100%{box-shadow:0 0 0 22px rgba(113,217,4,0);transform:scale(.9)}}
#click-indicator .hint{position:absolute;top:-36px;left:20px;padding:6px 10px;border-radius:10px;background:rgba(20,24,22,.85);color:#F2F5F2;font:500 12px/1.2 system-ui,sans-serif;white-space:nowrap;pointer-events:none;animation:hint-bob 2.2s ease-in-out infinite}
@keyframes hint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
`;

function ensureIndicatorDom() {
  if (!document.getElementById("click-indicator-style")) {
    const style = document.createElement("style");
    style.id = "click-indicator-style";
    style.textContent = INDICATOR_CSS;
    document.head.appendChild(style);
  }
  let el = document.querySelector("#click-indicator");
  if (!el) {
    el = document.createElement("div");
    el.id = "click-indicator";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Try interacting with the strings");
    el.innerHTML = `<span class="pulse"></span><span class="hint">Drag to test strings</span>`;
    document.body.appendChild(el);
  }
  return el;
}

/* ============================================================================
   SCENE / CAMERA / RENDERER
============================================================================ */
const scene = new THREE.Scene();

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

const spotL = new THREE.SpotLight(COLORS.brand, 1.2, 25, Math.PI / 5, 0.3);
spotL.position.set(-6, 8, 6);
scene.add(spotL);

const spotR = new THREE.SpotLight(COLORS.cyan, 1.2, 25, Math.PI / 5, 0.3);
spotR.position.set(6, 8, 6);
scene.add(spotR);

gsap.to(spotL.position, {
  x: "+=2",
  yoyo: true,
  repeat: -1,
  duration: 4,
  ease: "sine.inOut",
});
gsap.to(spotR.position, {
  x: "-=2",
  yoyo: true,
  repeat: -1,
  duration: 4,
  ease: "sine.inOut",
});

if (FLAGS.DEBUG_AXES) scene.add(new THREE.AxesHelper(2)); // world axes (hidden by default)

const camera = new THREE.PerspectiveCamera(
  85,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 4, 8);

gsap.from(camera.position, { z: 14, y: 6, duration: 1, ease: "power3.out" });
gsap.from(camera, {
  fov: 100,
  duration: 1.6,
  ease: "power1.inOut",
  onUpdate: () => camera.updateProjectionMatrix(),
});

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector(SELECTORS.canvas),
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearAlpha(0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 4, 0);
controls.enableDamping = true;
controls.update();

/* ============================================================================
   CORNER GIZMO (OFF by default)
============================================================================ */
let gizmoScene, gizmoCam, __originalRender;
if (FLAGS.SHOW_GIZMO) {
  gizmoScene = new THREE.Scene();
  gizmoCam = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
  gizmoCam.position.set(0, 0, 3);
  if (FLAGS.DEBUG_AXES) gizmoScene.add(new THREE.AxesHelper(1));

  __originalRender = renderer.render.bind(renderer);
  renderer.render = function (sceneArg, cameraArg) {
    __originalRender(sceneArg, cameraArg);
    this.clearDepth();
    const s = this.getSize(new THREE.Vector2());
    this.setViewport(16, s.y - 116, 100, 100);
    this.setScissor(16, s.y - 116, 100, 100);
    this.setScissorTest(true);
    __originalRender(gizmoScene, gizmoCam);
    this.setScissorTest(false);
    this.setViewport(0, 0, s.x, s.y);
  };
}

/* ============================================================================
   UTILS
============================================================================ */
const loader = new GLTFLoader();
const $ = (sel) =>
  /** @type {HTMLElement|null} */ (document.querySelector(sel));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const deg = (d) => THREE.MathUtils.degToRad(d);

function quatFromWorldXYZ(axDeg, ayDeg, azDeg) {
  const qx = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    deg(axDeg)
  );
  const qy = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    deg(ayDeg)
  );
  const qz = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    deg(azDeg)
  );
  return new THREE.Quaternion().multiply(qz).multiply(qy).multiply(qx);
}

/* ============================================================================
   TECHNICAL VIEW (material swap + edges + local axes)
============================================================================ */
const __TECH_PREPARED = new WeakSet();
const __EDGE_MAT = new THREE.LineBasicMaterial({
  color: COLORS.brandAccent,
  transparent: true,
  opacity: 0.85,
});

function __guessPart(name = "") {
  const n = name.toLowerCase();
  if (/(string|net|mesh|bed)/.test(n)) return "strings";
  if (/(grip|handle|tape)/.test(n)) return "grip";
  return "frame";
}

function __makeTechMaterial(part) {
  if (part === "strings")
    return new THREE.MeshStandardMaterial({
      color: COLORS.white,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0,
    });
  if (part === "grip")
    return new THREE.MeshStandardMaterial({
      color: COLORS.techGrip,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
    });
  return new THREE.MeshStandardMaterial({
    color: COLORS.techFrame,
    roughness: 0.65,
    metalness: 0.1,
    flatShading: true,
  });
}

function __prepareTech(racketRoot) {
  if (__TECH_PREPARED.has(racketRoot)) return;
  __TECH_PREPARED.add(racketRoot);

  const axes = new THREE.AxesHelper(1.5);
  axes.name = "__techAxes";
  axes.visible = false; // only shows during tech mode
  racketRoot.add(axes);

  racketRoot.traverse((o) => {
    if (!o.isMesh) return;
    o.userData._origMat = o.material;
    o.userData._techMat = __makeTechMaterial(__guessPart(o.name));

    if (o.geometry && !o.getObjectByName("__techEdges")) {
      try {
        const egeom = new THREE.EdgesGeometry(o.geometry, 20);
        const edges = new THREE.LineSegments(egeom, __EDGE_MAT.clone());
        edges.name = "__techEdges";
        edges.visible = false;
        o.add(edges);
      } catch {}
    }
  });
}

function setTechnicalView(racketRoot, on) {
  __prepareTech(racketRoot);

  const axes = racketRoot.getObjectByName("__techAxes");
  if (axes) axes.visible = on;

  racketRoot.traverse((o) => {
    if (!o.isMesh) return;
    const edges = o.getObjectByName("__techEdges");
    if (edges) edges.visible = on;

    const techMat = o.userData._techMat;
    const origMat = o.userData._origMat;
    if (techMat && origMat) {
      o.material = on ? techMat : origMat;
      o.material.needsUpdate = true;
    }
  });
}

function enableTechToggleInSection(
  racketRoot,
  sectionSel = SELECTORS.s3,
  checkboxSel = SELECTORS.techToggle
) {
  const toggle = /** @type {HTMLInputElement|null} */ ($(checkboxSel));
  if (!toggle) {
    console.warn(`Tech toggle not found at ${checkboxSel}`);
    return;
  }

  toggle.addEventListener("change", (e) =>
    setTechnicalView(racketRoot, e.target.checked)
  );

  const resetOff = () => {
    if (toggle.checked) toggle.checked = false;
    setTechnicalView(racketRoot, false);
  };

  ScrollTrigger.create({
    trigger: sectionSel,
    start: "top bottom",
    end: "bottom top",
    onToggle(self) {
      if (!self.isActive) resetOff();
    },
  });

  resetOff();
}

/* ============================================================================
   SPEC / MATERIALS TABS
============================================================================ */
function __partKind(name = "") {
  const n = name.toLowerCase();
  if (/(string|net|mesh|bed|pattern)/.test(n)) return "strings";
  if (/(grip|handle|tape|overgrip)/.test(n)) return "grip";
  return "frame";
}

function __buildDimensionHelpers(stringMesh, THREE_) {
  if (!stringMesh) return null;

  const existing = stringMesh.getObjectByName("__dimHelpers");
  if (existing) return existing;

  const localBox = new THREE_.Box3();
  stringMesh.traverse((c) => {
    if (c.isMesh && c.geometry) {
      c.geometry.computeBoundingBox();
      localBox.union(c.geometry.boundingBox);
    }
  });

  const group = new THREE_.Group();
  group.name = "__dimHelpers";
  group.visible = false;
  stringMesh.add(group);

  const lineMat = new THREE_.LineBasicMaterial({
    color: COLORS.brandAccent,
    transparent: true,
    opacity: 0.95,
  });
  const makeGeo = (pts) => new THREE_.BufferGeometry().setFromPoints(pts);

  const zMid = (localBox.min.z + localBox.max.z) * 0.5;
  const xMid = (localBox.min.x + localBox.max.x) * 0.5;

  const widthGeo = makeGeo([
    new THREE_.Vector3(localBox.min.x, localBox.max.y, zMid),
    new THREE_.Vector3(localBox.max.x, localBox.max.y, zMid),
  ]);
  const widthLine = new THREE_.Line(widthGeo, lineMat.clone());
  widthLine.name = "__dimWidth";
  group.add(widthLine);

  const heightGeo = makeGeo([
    new THREE_.Vector3(xMid, localBox.min.y, zMid),
    new THREE_.Vector3(xMid, localBox.max.y, zMid),
  ]);
  const heightLine = new THREE_.Line(heightGeo, lineMat.clone());
  heightLine.name = "__dimHeight";
  group.add(heightLine);

  stringMesh.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.getObjectByName("__dimEdges")) return;
    try {
      const egeom = new THREE_.EdgesGeometry(o.geometry, 20);
      const edges = new THREE_.LineSegments(
        egeom,
        new THREE_.LineBasicMaterial({
          color: COLORS.brandAccent,
          transparent: true,
          opacity: 0.35,
        })
      );
      edges.name = "__dimEdges";
      edges.visible = false;
      o.add(edges);
    } catch {}
  });

  return group;
}

function __setDimensionsVisible(stringMesh, on) {
  if (!stringMesh) return;
  const grp = stringMesh.getObjectByName("__dimHelpers");
  if (grp) grp.visible = !!on;
  stringMesh.traverse((o) => {
    if (!o.isMesh) return;
    const de = o.getObjectByName("__dimEdges");
    if (de) de.visible = !!on;
  });
}

function __prepareMaterialsHighlight(root) {
  if (!root) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const m = o.material;
    if (m.color && !o.userData._origColor)
      o.userData._origColor = m.color.clone();
    if ("emissive" in m && !o.userData._origEmissive)
      o.userData._origEmissive = m.emissive.clone();
  });
}

function __setMaterialsHighlight(root, on) {
  if (!root) return;
  __prepareMaterialsHighlight(root);

  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const m = o.material;
    const kind = __partKind(o.name);

    if (on) {
      if (kind === "strings") {
        m.color?.set(COLORS.white);
        if ("emissive" in m) m.emissive.setHex(0x666666);
      } else if (kind === "grip") {
        m.color?.set(COLORS.techGrip);
        if ("emissive" in m) m.emissive.setHex(0x2a2a2a);
      } else {
        m.color?.set(COLORS.techFrame);
        if ("emissive" in m) m.emissive.setHex(0x1a3b34);
      }
      m.needsUpdate = true;
    } else {
      if (o.userData._origColor) m.color?.copy(o.userData._origColor);
      if (o.userData._origEmissive && "emissive" in m)
        m.emissive.copy(o.userData._origEmissive);
      m.needsUpdate = true;
    }
  });
}

function findStringMesh(root) {
  if (!root) return null;

  let hit = null;
  root.traverse((o) => {
    const n = (o.name || "").toLowerCase();
    if (o.isMesh && /(string|net|mesh|bed|pattern)/.test(n)) hit = o;
  });
  if (hit) return hit;

  let best = null,
    bestScore = -Infinity;
  root.updateMatrixWorld(true);

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox.clone();
    const m = new THREE.Matrix4()
      .copy(root.matrixWorld)
      .invert()
      .multiply(o.matrixWorld);
    bb.applyMatrix4(m);

    const dx = bb.max.x - bb.min.x;
    const dy = bb.max.y - bb.min.y;
    const dz = bb.max.z - bb.min.z;
    if (dx <= 0 || dy <= 0 || dz <= 0) return;

    const areaXY = dx * dy;
    const thinness = Math.min(dz / Math.max(dx, dy), dz / (dx + dy));
    const score = areaXY - thinness * 1000;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  });

  return best || null;
}

function attachSpecMaterials2(racketRoot, stringMeshMaybe) {
  if (!racketRoot) return;

  const specR = /** @type {HTMLInputElement|null} */ ($(SELECTORS.tabSpec));
  const matR = /** @type {HTMLInputElement|null} */ ($(SELECTORS.tabMaterials));
  const perfR = /** @type {HTMLInputElement|null} */ (
    $(SELECTORS.tabPerformance)
  );
  if (!specR || !matR) {
    console.warn("attachSpecMaterials2: radios not found.");
    return;
  }

  const sMesh = stringMeshMaybe || findStringMesh(racketRoot) || racketRoot;
  if (sMesh && !sMesh.getObjectByName("__dimHelpers"))
    __buildDimensionHelpers(sMesh, THREE);

  const applyMode = () => {
    const spec = !!specR.checked;
    const mats = !!matR.checked;
    if (sMesh) __setDimensionsVisible(sMesh, spec);
    __setMaterialsHighlight(racketRoot, mats);

    if (perfR && perfR.checked) {
      if (sMesh) __setDimensionsVisible(sMesh, false);
      __setMaterialsHighlight(racketRoot, false);
    }
  };

  specR.addEventListener("change", applyMode);
  matR.addEventListener("change", applyMode);
  perfR && perfR.addEventListener("change", applyMode);
  applyMode();
}

/* ============================================================================
   SPEC HOVERS
============================================================================ */
function ensureHoverEdges(
  root,
  name = "__hoverEdges",
  color = COLORS.brandAccent,
  opacity = 0.9
) {
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.getObjectByName(name)) return;
    try {
      const geo = new THREE.EdgesGeometry(o.geometry, 20);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      const edges = new THREE.LineSegments(geo, mat);
      edges.name = name;
      edges.visible = false;
      o.add(edges);
    } catch {}
  });
}
function setEdgesVisible(root, name = "__hoverEdges", on = false) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const e = o.getObjectByName(name);
    if (e) e.visible = on;
  });
}
function ensureHeadEllipse(stringMesh) {
  const existing = stringMesh.getObjectByName("__headEllipse");
  if (existing) return existing;

  const box = new THREE.Box3();
  stringMesh.traverse((c) => {
    if (c.isMesh && c.geometry) {
      c.geometry.computeBoundingBox();
      box.union(c.geometry.boundingBox);
    }
  });

  const rx = (box.max.x - box.min.x) * 0.49;
  const ry = (box.max.y - box.min.y) * 0.49;
  const z = (box.min.z + box.max.z) * 0.5;

  const pts = [];
  const N = 96;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, z));
  }

  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({
    color: COLORS.brandAccent,
    transparent: true,
    opacity: 0.95,
  });
  const line = new THREE.LineLoop(g, m);
  line.name = "__headEllipse";
  line.visible = false;
  stringMesh.add(line);
  return line;
}
function setHeadHighlight(stringMesh, on) {
  ensureHeadEllipse(stringMesh);
  const ellipse = stringMesh.getObjectByName("__headEllipse");
  if (ellipse) ellipse.visible = on;
  stringMesh.traverse((o) => {
    if (!o.isMesh) return;
    const e = o.getObjectByName("__hoverEdges");
    if (e) e.visible = on;
  });
}
function computeLocalBox(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const box = new THREE.Box3();
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    const b = child.geometry.boundingBox.clone();
    const m = new THREE.Matrix4().multiplyMatrices(inv, child.matrixWorld);
    b.applyMatrix4(m);
    box.union(b);
  });
  return box;
}
function ensureBalanceSphere(racketRoot) {
  const existing = racketRoot.getObjectByName("__balanceSphere");
  if (existing) return existing;

  const rackBox = computeLocalBox(racketRoot);
  const L = rackBox.max.y - rackBox.min.y;
  const r = Math.max(0.02 * L, 0.03);

  const g = new THREE.SphereGeometry(r, 24, 16);
  const m = new THREE.MeshStandardMaterial({
    color: COLORS.brandAccent,
    emissive: 0x88ff66,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.95,
  });
  const s = new THREE.Mesh(g, m);
  s.name = "__balanceSphere";
  s.visible = false;
  racketRoot.add(s);
  return s;
}
function showBalancePoint(
  racketRoot,
  cmFromButt = 32.5,
  totalCm = 68.58,
  on = true
) {
  const sph = ensureBalanceSphere(racketRoot);
  const box = computeLocalBox(racketRoot);
  const xMid = (box.min.x + box.max.x) * 0.5;
  const zMid = (box.min.z + box.max.z) * 0.5;
  const lenUnits = box.max.y - box.min.y;
  const cmToUnits = lenUnits / totalCm;
  const y = box.min.y + clamp(cmFromButt, 0, totalCm) * cmToUnits;

  sph.position.set(xMid, y, zMid);
  sph.visible = !!on;
}
function setStringsHighlight(stringMesh, on) {
  stringMesh.traverse((o) => {
    if (!o.isMesh) return;
    const e = o.getObjectByName("__hoverEdges");
    if (e) e.visible = on;
    const m = o.material;
    if (m && "emissive" in m) {
      if (!o.userData._origEm) o.userData._origEm = m.emissive.clone();
      m.emissive.setHex(
        on ? 0x88aaff : o.userData._origEm?.getHex() ?? 0x000000
      );
      m.needsUpdate = true;
    }
  });
}
function setWholeRacketHighlight(racketRoot, on) {
  setEdgesVisible(racketRoot, "__hoverEdges", on);
}
function wireSpecHover(
  racketRoot,
  sMesh,
  { balanceCm = 32.5, racketLengthCm = 68.58 } = {}
) {
  if (!racketRoot || !sMesh) return;

  ensureHoverEdges(racketRoot, "__hoverEdges");
  ensureHoverEdges(sMesh, "__hoverEdges");
  ensureHeadEllipse(sMesh);
  ensureBalanceSphere(racketRoot);

  const panel =
    document.querySelector(".section-2 .segment-card") ||
    $(SELECTORS.specPanel)?.closest(".segment-card");
  if (panel && controls) {
    panel.addEventListener("pointerenter", () => (controls.enabled = false));
    panel.addEventListener("pointerleave", () => (controls.enabled = true));
  }

  const rootEl = $(SELECTORS.specPanel);
  if (!rootEl) return;

  const rowHead = rootEl.querySelector('[data-key="head"]');
  const rowWeight = rootEl.querySelector('[data-key="weight"]');
  const rowBalance = rootEl.querySelector('[data-key="balance"]');
  const rowStrings = rootEl.querySelector('[data-key="strings"]');

  const offAll = () => {
    setHeadHighlight(sMesh, false);
    setWholeRacketHighlight(racketRoot, false);
    setStringsHighlight(sMesh, false);
    showBalancePoint(racketRoot, balanceCm, racketLengthCm, false);
  };

  const bind = (el, enter3D) => {
    if (!el) return;
    const enter = () => {
      offAll();
      el.classList.add("is-hovered");
      enter3D();
    };
    const leave = () => {
      el.classList.remove("is-hovered");
      offAll();
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    el.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        enter();
      },
      { passive: false }
    );
    el.addEventListener("touchend", leave);
  };

  bind(rowHead, () => setHeadHighlight(sMesh, true));
  bind(rowWeight, () => setWholeRacketHighlight(racketRoot, true));
  bind(rowBalance, () => {
    const txt = rowBalance?.querySelector(".value")?.textContent || "";
    const num = parseFloat(txt);
    const cm = isFinite(num) ? num : balanceCm;
    showBalancePoint(racketRoot, cm, racketLengthCm, true);
  });
  bind(rowStrings, () => setStringsHighlight(sMesh, true));
}

/* ============================================================================
   RACKET + BALL
============================================================================ */
let racket, stringMesh, ball;
let ballRadius = 0.25;
let velocityY = 0;
let ballActive = false;
let ballAtRest = false;

// === Hero finalization control (prevents pop-in when skipping S1)
let finalizeHeroImmediately = () => {};
let heroPlayed = false;

// ====== Indicator (Section-2): pin near strings, hide on click for 5s, reappear if still in S2 ======
const CLICK_INDICATOR_SEL = "#click-indicator";
const clickIndicatorEl = ensureIndicatorDom();

let indicatorActive = false; // Section-2 visibility gate
const INDICATOR_HIDE_MS = 5000; // cooldown duration
let indicatorHideUntil = 0; // timestamp (ms)

const nowMs = () => performance.now();
const canDisplayIndicator = () =>
  indicatorActive && nowMs() >= indicatorHideUntil;

/** Get a stable anchor on the string bed (local center), converted to world space */
function getStringCenterWorld() {
  if (!stringMesh || !racket) return null;

  const box = new THREE.Box3();
  stringMesh.traverse((c) => {
    if (c.isMesh && c.geometry) {
      c.geometry.computeBoundingBox();
      box.union(c.geometry.boundingBox);
    }
  });

  const cx = (box.min.x + box.max.x) * 0.5;
  const cy = (box.min.y + box.max.y) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;

  const local = new THREE.Vector3(cx, cy, cz);
  const world = local.clone();
  stringMesh.localToWorld(world);

  // nudge toward camera and offset slightly to the side
  const dir = new THREE.Vector3()
    .subVectors(camera.position, world)
    .normalize();
  world.addScaledVector(dir, 0.15);
  world.x += 0.12;

  return world;
}

/** Project a world point to screen (pixels) relative to the canvas */
function worldToScreen(world) {
  const v = world.clone().project(camera); // NDC
  const rect = renderer.domElement.getBoundingClientRect();
  const x = rect.left + (v.x * 0.5 + 0.5) * rect.width;
  const y = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
  return { x, y, behind: v.z > 1 || v.z < -1 };
}

function showClickIndicator() {
  if (!clickIndicatorEl) return;
  clickIndicatorEl.style.display = "block";
}
function hideClickIndicator() {
  if (!clickIndicatorEl) return;
  clickIndicatorEl.style.display = "none";
}
function updateClickIndicator() {
  if (!canDisplayIndicator() || !clickIndicatorEl) {
    hideClickIndicator();
    return;
  }
  const world = getStringCenterWorld();
  if (!world) return;
  const { x, y, behind } = worldToScreen(world);
  if (behind) {
    hideClickIndicator();
    return;
  }
  clickIndicatorEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  if (clickIndicatorEl.style.display !== "block") showClickIndicator();
}

// Show only while Section-2 is in view; hide otherwise
ScrollTrigger.create({
  trigger: SELECTORS.s2,
  start: "top 70%",
  end: "bottom top",
  onEnter: () => {
    indicatorActive = true;
    if (canDisplayIndicator()) {
      showClickIndicator();
      updateClickIndicator();
    }
  },
  onEnterBack: () => {
    indicatorActive = true;
    if (canDisplayIndicator()) {
      showClickIndicator();
      updateClickIndicator();
    }
  },
  onLeave: () => {
    indicatorActive = false;
    hideClickIndicator();
  },
  onLeaveBack: () => {
    indicatorActive = false;
    hideClickIndicator();
  },
});

// Each click hides for 5s; if still in S2 afterwards, it reappears
renderer.domElement.addEventListener("pointerdown", () => {
  indicatorHideUntil = nowMs() + INDICATOR_HIDE_MS;
  hideClickIndicator();
});

function getStringTopWorldY() {
  if (!stringMesh) return null;
  const localTop = new THREE.Vector3(
    0,
    stringMesh.userData.localStringTopY ?? 0,
    0
  );
  const topWorld = localTop.clone();
  stringMesh.localToWorld(topWorld);
  return topWorld.y + PHYSICS.stringSurfaceOffset;
}

loader.load("./assets/wilson_blade_team_tennis_racket.glb", (gltf) => {
  // ===== Rig → ScrollScale → Racket =====
  racket = gltf.scene;

  const racketRig = new THREE.Group(); // hero & idle swing parent
  racketRig.name = "racketRig";
  racketRig.position.set(-6, 4, 0);

  const racketScroll = new THREE.Group(); // scroll-scaling parent
  racketScroll.name = "racketScroll";

  racketScroll.add(racket);
  racketRig.add(racketScroll);
  scene.add(racketRig);

  // Model axes (hidden unless DEBUG_AXES)
  if (FLAGS.DEBUG_AXES) racket.add(new THREE.AxesHelper(1.5));

  // Strings
  stringMesh =
    racket.getObjectByName("Object_5") || findStringMesh(racket) || racket;
  if (stringMesh) {
    const localBox = new THREE.Box3();
    stringMesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.computeBoundingBox();
        localBox.union(child.geometry.boundingBox);
      }
    });
    stringMesh.userData.localStringTopY = localBox.max.y;
  }

  // Start orientation
  racket.rotation.set(deg(90), 0, 0);

  // Quaternion path across S2→S3
  gsap.killTweensOf([
    racket.rotation,
    racket.quaternion,
    racketRig.position,
    racketRig.scale,
    racket.position,
  ]);

  const qInit = quatFromWorldXYZ(90, 0, -45);
  const qS2 = quatFromWorldXYZ(-10, -60, 0);
  const qS3 = quatFromWorldXYZ(165, -10, -30);
  racket.quaternion.copy(qInit);

  const s2El = $(SELECTORS.s2);
  const s3El = $(SELECTORS.s3);
  const qTmp = new THREE.Quaternion();

  function getRatios() {
    const h2 = s2El?.offsetHeight || 1;
    const h3 = s3El?.offsetHeight || 1;
    const total = h2 + h3;
    return { d2: h2 / total, d3: h3 / total };
  }
  let ratios = getRatios();

  ScrollTrigger.create({
    trigger: s2El,
    start: "top bottom",
    endTrigger: s3El,
    end: "bottom top",
    scrub: true,
    invalidateOnRefresh: true,
    onRefresh: () => (ratios = getRatios()),
    onUpdate: (self) => {
      const p = self.progress;
      const { d2, d3 } = ratios;
      if (p <= d2) {
        qTmp.copy(qInit).slerp(qS2, d2 > 0 ? p / d2 : 0);
      } else {
        qTmp.copy(qS2).slerp(qS3, d3 > 0 ? (p - d2) / d3 : 1);
      }
      racket.quaternion.copy(qTmp);
    },
  });

  // ONE-TIME HERO (S1)
  const isSmall = window.matchMedia("(max-width: 768px)").matches;
  const HERO_SCALE = isSmall ? 1.08 : 1.14;
  const APPROACH = 1.2;
  const SWING_DEG = 30;

  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  const baseRigScale = racketRig.scale.clone();

  heroTl.fromTo(
    racketRig.scale,
    {
      x: baseRigScale.x * 0.92,
      y: baseRigScale.y * 0.92,
      z: baseRigScale.z * 0.92,
    },
    {
      x: baseRigScale.x * HERO_SCALE,
      y: baseRigScale.y * HERO_SCALE,
      z: baseRigScale.z * HERO_SCALE,
      duration: 0.9,
      ease: "back.out(1.4)",
    },
    0
  );

  heroTl.to(
    racketRig.position,
    { x: -0.5, y: 4, duration: 1.2, ease: "power4.out" },
    0
  );

  heroTl.to(
    racketRig.position,
    {
      duration: 1,
      ease: "power2.out",
      onStart() {
        const worldPos = new THREE.Vector3();
        racketRig.getWorldPosition(worldPos);
        const dirToCam = new THREE.Vector3()
          .subVectors(camera.position, worldPos)
          .normalize();
        const end = racketRig.position
          .clone()
          .add(dirToCam.multiplyScalar(APPROACH));
        this.vars.x = end.x;
        this.vars.y = end.y;
        this.vars.z = end.z;
      },
    },
    "-=0.35"
  );

  // swing helpers
  let swingTween;
  function startSwing() {
    if (swingTween?.isActive()) return;
    swingTween = gsap.to(racketRig.rotation, {
      y: deg(SWING_DEG),
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    gsap.set(racketRig.rotation, { y: deg(-SWING_DEG) });
  }
  function stopSwing() {
    swingTween?.pause();
  }

  // play hero only if S1 enters
  const s1El = $(SELECTORS.s1);
  ScrollTrigger.create({
    trigger: s1El,
    start: "top top",
    once: true,
    onEnter: () => heroTl.play(0),
  });

  // swing while S1 visible; finalize hero when leaving (prevents pop-in)
  heroTl.eventCallback("onComplete", () => {
    heroPlayed = true;
  });

  finalizeHeroImmediately = () => {
    if (heroPlayed) return;
    heroTl.kill();
    stopSwing();

    racketRig.scale.set(
      baseRigScale.x * HERO_SCALE,
      baseRigScale.y * HERO_SCALE,
      baseRigScale.z * HERO_SCALE
    );

    const oldZ = racketRig.position.z;
    racketRig.position.set(-0.5, 4, oldZ);

    const worldPos = new THREE.Vector3();
    racketRig.getWorldPosition(worldPos);
    const dirToCam = new THREE.Vector3()
      .subVectors(camera.position, worldPos)
      .normalize();
    racketRig.position.add(dirToCam.multiplyScalar(APPROACH));

    heroPlayed = true;
  };

  ScrollTrigger.create({
    trigger: s1El,
    start: "top 80%",
    end: "bottom top",
    onEnter: startSwing,
    onEnterBack: startSwing,
    onLeave: () => {
      stopSwing();
      finalizeHeroImmediately();
    },
    onLeaveBack: stopSwing,
  });

  // SCROLL ZOOM on middle group
  const scrollTargetScale = isSmall ? 1.08 : 1.14;
  const setScrollScale = (s) => racketScroll.scale.set(s, s, s);

  ScrollTrigger.create({
    trigger: s1El,
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) =>
      setScrollScale(THREE.MathUtils.lerp(1, scrollTargetScale, self.progress)),
  });

  ScrollTrigger.create({
    trigger: s2El,
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) =>
      setScrollScale(THREE.MathUtils.lerp(scrollTargetScale, 1, self.progress)),
  });

  // Feature modules
  enableTechToggleInSection(racket, SELECTORS.s3, SELECTORS.techToggle);
  attachSpecMaterials2(racket, stringMesh);
  wireSpecHover(racket, stringMesh, { balanceCm: 32.5 });

  // Safety: if S2 becomes active (e.g., load mid-page), finalize hero
  ScrollTrigger.create({
    trigger: SELECTORS.s2,
    start: "top bottom",
    once: true,
    onEnter: () => finalizeHeroImmediately(),
  });

  ScrollTrigger.refresh();
});

loader.load("./assets/tennis_ball2.glb", (gltf) => {
  ball = gltf.scene;
  ball.scale.set(6, 6, 6);
  ball.traverse((c) => {
    if (c.isMesh) {
      c.material.transparent = true;
      c.material.opacity = 0;
    }
  });
  scene.add(ball);

  const box = new THREE.Box3().setFromObject(ball);
  const size = new THREE.Vector3();
  box.getSize(size);
  ballRadius = Math.max(size.x, size.y, size.z) / 2;

  ScrollTrigger.create({
    trigger: SELECTORS.s2,
    start: "top bottom",
    end: "bottom top",
    onEnter: () => {
      if (!stringMesh) return;
      showBallInstant();
      ballActive = true;
      velocityY = 0;

      const stringY = getStringTopWorldY();
      if (stringY == null) return;

      const DROP = 1.0;
      const wp = stringMesh.getWorldPosition(new THREE.Vector3());
      ball.position.set(wp.x + 1.2, stringY + ballRadius + DROP, wp.z - 0.7);
    },
    onEnterBack: () => {
      if (!stringMesh) return;
      showBallInstant();
      ballActive = true;
      velocityY = 0;

      const stringY = getStringTopWorldY();
      if (stringY == null) return;

      const DROP = 1.0;
      const wp = stringMesh.getWorldPosition(new THREE.Vector3());
      ball.position.set(wp.x, stringY + ballRadius + DROP, wp.z);
    },
    onLeave: hideBallInstant,
    onLeaveBack: hideBallInstant,
  });
});

/* ============================================================================
   UI HELPERS
============================================================================ */
function showBallInstant() {
  if (!ball) return;
  ball.traverse((c) => {
    if (c.isMesh) {
      c.material.opacity = 1;
      c.material.transparent = false;
    }
  });
  ballAtRest = false;
}
function hideBallInstant() {
  if (!ball) return;
  ball.traverse((c) => {
    if (c.isMesh) {
      c.material.opacity = 0;
      c.material.transparent = true;
    }
  });
  ballActive = false;
}

// Drag & Flick
let dragging = false,
  dragStartY = 0;
function enableBallDragging() {
  if (!ball) return;
  renderer.domElement.style.cursor = "pointer";
  renderer.domElement.addEventListener("pointerdown", dragStart);
}
function dragStart(e) {
  dragging = true;
  dragStartY = e.clientY;
  window.addEventListener("pointerup", dragEnd);
}
function dragEnd(e) {
  if (!dragging) return;
  dragging = false;

  const dy = e.clientY - dragStartY;
  velocityY = Math.max(-dy * 0.04, 0.25);
  ballAtRest = false;
  ballActive = true;

  triggerShotFeedback();
  window.removeEventListener("pointerup", dragEnd);
}

// Shot feedback micro-interaction
function triggerShotFeedback() {
  const box = document.querySelector(SELECTORS.shotFeedbackBox);
  if (!box) return;

  box.querySelectorAll(".progress-fill").forEach((bar) => {
    gsap.fromTo(
      bar,
      { scaleX: 1 },
      {
        scaleX: 1.05,
        transformOrigin: "left center",
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
      }
    );
  });

  box.querySelectorAll(".label, .value").forEach((el) => {
    gsap.fromTo(
      el,
      { fontWeight: "800", color: "#F5F5F5" },
      {
        fontWeight: "400",
        color: "#F5F5F5",
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
      }
    );
  });
}

/* ============================================================================
   RENDER LOOP
============================================================================ */
function animate() {
  requestAnimationFrame(animate);

  if (ballActive && !ballAtRest && stringMesh && ball) {
    velocityY += PHYSICS.gravity;
    ball.position.y += velocityY;

    const stringY = getStringTopWorldY();
    if (stringY != null && ball.position.y - ballRadius <= stringY) {
      ball.position.y = stringY + ballRadius;
      velocityY *= -PHYSICS.bounce;

      if (Math.abs(velocityY) < 0.01) {
        velocityY = 0;
        ballAtRest = true;
        enableBallDragging();
      }
    }
  }

  // Keep the indicator pinned near the strings every frame
  updateClickIndicator();

  renderer.render(scene, camera);
}
animate();

/* ============================================================================
   RESIZE
============================================================================ */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  computeStates();
  ScrollTrigger.refresh();
  updateClickIndicator(); // re-project immediately on resize
});

/* ============================================================================
   COURT LINES (decor)
============================================================================ */
(function addCourtLines() {
  const courtGeometry = new THREE.BufferGeometry();
  const s = 4.5,
    d = 5.5,
    L = 11.885,
    S = 6.4;

  const verts = new Float32Array([
    -d,
    0,
    -L,
    d,
    0,
    -L,
    d,
    0,
    -L,
    d,
    0,
    L,
    d,
    0,
    L,
    -d,
    0,
    L,
    -d,
    0,
    L,
    -d,
    0,
    -L,
    -s,
    0,
    -L,
    s,
    0,
    -L,
    s,
    0,
    -L,
    s,
    0,
    L,
    s,
    0,
    L,
    -s,
    0,
    L,
    -s,
    0,
    L,
    -s,
    0,
    -L,
    -s,
    0,
    S,
    s,
    0,
    S,
    -s,
    0,
    -S,
    s,
    0,
    -S,
    0,
    0,
    0,
    0,
    0,
    S,
    0,
    0,
    0,
    0,
    0,
    -S,
    -d,
    0,
    0,
    d,
    0,
    0,
  ]);
  courtGeometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));

  const mat = new THREE.LineBasicMaterial({
    color: COLORS.court,
    transparent: true,
    opacity: 0.8,
  });
  const lines = new THREE.LineSegments(courtGeometry, mat);
  lines.position.y = -3;
  lines.rotation.y = -Math.PI / 3;
  scene.add(lines);
})();

/* ============================================================================
   FAB (state + unified listeners)
============================================================================ */
const upBtn = $(SELECTORS.fabUp);
const downBtn = $(SELECTORS.fabDown);

function scrollToSel(sel) {
  const target = document.querySelector(sel);
  if (!target) return;
  gsap.to(window, {
    duration: 1.1,
    scrollTo: { y: target, autoKill: true },
    ease: "power2.inOut",
  });
}

function setFABState({ showUp, showDown, upTarget, downTarget }) {
  if (showUp !== undefined && upBtn)
    upBtn.style.display = showUp ? "inline-flex" : "none";
  if (showDown !== undefined && downBtn)
    downBtn.style.display = showDown ? "inline-flex" : "none";
  if (upTarget && upBtn) upBtn.dataset.target = upTarget;
  if (downTarget && downBtn) downBtn.dataset.target = downTarget;
}

function handleFabClick(e) {
  const btn = e.currentTarget;
  const sel = btn?.dataset?.target;
  if (!sel) return;

  // If jumping straight to Section-2, finalize hero first (prevents pop-in)
  if (sel === SELECTORS.s2 && typeof finalizeHeroImmediately === "function") {
    finalizeHeroImmediately();
  }

  scrollToSel(sel);
}
upBtn?.addEventListener("click", handleFabClick);
downBtn?.addEventListener("click", handleFabClick);

ScrollTrigger.create({
  trigger: SELECTORS.s1,
  start: "top center",
  end: "bottom center",
  onToggle: (self) => {
    if (self.isActive)
      setFABState({ showUp: false, showDown: true, downTarget: SELECTORS.s2 });
  },
});
ScrollTrigger.create({
  trigger: SELECTORS.s2,
  start: "top center",
  end: "bottom center",
  onToggle: (self) => {
    if (self.isActive)
      setFABState({
        showUp: true,
        showDown: true,
        upTarget: SELECTORS.s1,
        downTarget: SELECTORS.s3,
      });
  },
});
ScrollTrigger.create({
  trigger: SELECTORS.s3,
  start: "top center",
  end: "bottom center",
  onToggle: (self) => {
    if (self.isActive)
      setFABState({ showUp: true, showDown: false, upTarget: SELECTORS.s2 });
  },
});

/* ============================================================================
   CAMERA PATH PER SECTION (S1 → S2 → S3)
============================================================================ */
const hasControls = !!controls;
const focus = hasControls
  ? controls.target.clone()
  : new THREE.Vector3(0, 1, 0);
const lerp = (a, b, t) => a + (b - a) * t;

function applyCam(from, to, t) {
  camera.position.set(
    lerp(from.pos.x, to.pos.x, t),
    lerp(from.pos.y, to.pos.y, t),
    lerp(from.pos.z, to.pos.z, t)
  );
  focus.set(
    lerp(from.target.x, to.target.x, t),
    lerp(from.target.y, to.target.y, t),
    lerp(from.target.z, to.target.z, t)
  );
  if (hasControls) {
    controls.target.copy(focus);
    controls.update();
  } else {
    camera.lookAt(focus);
  }

  camera.fov = lerp(from.fov, to.fov, t);
  camera.updateProjectionMatrix();
}

let S1A, S1B, S2A, S3A;
function computeStates() {
  const basePos = camera.position.clone();
  const baseTarget = hasControls ? controls.target.clone() : focus.clone();
  const baseFov = camera.fov;

  S1A = { pos: basePos.clone(), target: baseTarget.clone(), fov: baseFov };
  S1B = {
    pos: basePos.clone().add(new THREE.Vector3(0, 0.25, -2.0)),
    target: baseTarget.clone(),
    fov: baseFov - 6,
  };

  S2A = {
    pos: basePos.clone().add(new THREE.Vector3(2.4, -0.1, -1.6)),
    target: baseTarget.clone().add(new THREE.Vector3(0.35, 0.1, 0.0)),
    fov: baseFov - 4,
  };

  S3A = {
    pos: basePos.clone().add(new THREE.Vector3(-1.4, 1.0, -0.6)),
    target: baseTarget.clone().add(new THREE.Vector3(0.0, 0.2, 0.0)),
    fov: baseFov - 7,
  };
}
computeStates();

function lockZoom(lock) {
  if (!hasControls) return;
  controls.enableZoom = !lock;
  controls.enablePan = !lock;
  controls.enableRotate = !lock;
}

ScrollTrigger.create({
  trigger: SELECTORS.s1,
  start: "top top",
  end: "bottom top",
  scrub: true,
  invalidateOnRefresh: true,
  onEnter: () => lockZoom(true),
  onEnterBack: () => lockZoom(true),
  onLeave: () => lockZoom(false),
  onLeaveBack: () => lockZoom(false),
  onUpdate: (self) => applyCam(S1A, S1B, self.progress),
});
ScrollTrigger.create({
  trigger: SELECTORS.s2,
  start: "top top",
  end: "bottom top",
  scrub: true,
  invalidateOnRefresh: true,
  onUpdate: (self) => applyCam(S1B, S2A, self.progress),
});
ScrollTrigger.create({
  trigger: SELECTORS.s3,
  start: "top top",
  end: "bottom top",
  scrub: true,
  invalidateOnRefresh: true,
  onUpdate: (self) => applyCam(S2A, S3A, self.progress),
});

ScrollTrigger.refresh();
