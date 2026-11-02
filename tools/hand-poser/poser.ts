import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import leftGlb from '@webxr-input-profiles/assets/dist/profiles/generic-hand/left.glb?url';
import rightGlb from '@webxr-input-profiles/assets/dist/profiles/generic-hand/right.glb?url';
import { type Finger, type KeyDef, LAYOUTS } from '../../src/keyboard/layouts';
import { type HandIndex, POSE_NAME, type Side, VIEW, poseName, readHandSvg } from '../../src/ui/hand-svg';
import { HANDS_CHANNEL } from '../../src/ui/hands';
import { FINGER_COLORS } from '../../src/ui/keyboard-guide';
import { type JointTurn, type PoseFile, readPose } from './pose-file';

/**
 * The hand poser: a local page (dev server only, /tools/hand-poser/) where the owner poses a 3D hand (the WebXR generic hand,
 * MIT) seen from above over Tapko's keyboard and saves its outline as the SVG Tapko draws. The outline comes from two renders:
 * which part of the hand each pixel shows (palm, a finger, a nail) and how deep it is; a line is drawn where the part changes
 * between fingers, at the hand's edge, and where the depth jumps (a finger over the palm or a curled one). The pose is kept in
 * the SVG, so it can be loaded and tuned later.
 */

const UNIT = 58, GAP = 4, KEY_H = 46;
/** Export pixels per keyboard unit: the traced outline's precision. */
const EXPORT_PX = 4;
/** The camera's depth range in keyboard units, and the depth step that draws a line (a finger over the palm). */
const NEAR = 1, FAR = 3000, DEPTH_JUMP = 5;
/** A surface this steep (depth units per unit across) is a slope, not a step: it matters when a pixel is wider than a unit. */
const SLOPE = 8;
const LINE_COLOR = new THREE.Color('#5a5560');
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
type FingerName = (typeof FINGERS)[number];
const FINGER_LABEL: Record<FingerName, string> = { thumb: 'Palec', index: 'Ukazovák', middle: 'Prostredník', ring: 'Prstenník', pinky: 'Malíček' };
/** The parts a pixel can show; a nail is NAIL + its finger's part. */
const PART: Record<'palm' | FingerName, number> = { palm: 1, thumb: 2, index: 3, middle: 4, ring: 5, pinky: 6 };
const NAIL = 10;
/** Tapko's finger number (its nail colour) of a finger of a hand. */
const appFinger = (side: Side, f: FingerName): Finger => (side === 'left' ? 6 - PART[f] : PART[f] + 3) as Finger;

const chainOf = (f: FingerName): string[] => (f === 'thumb'
  ? ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip']
  : ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map((j) => `${f}-finger-${j}`));
const tipOf = (f: FingerName) => chainOf(f).at(-1)!;
const distalOf = (f: FingerName) => chainOf(f).at(-2)!;

/** The sliders of a finger: joint, turn, label, range in degrees. */
type Control = [joint: string, turn: keyof JointTurn, label: string, min: number, max: number];
function controlsOf(f: FingerName): Control[] {
  if (f === 'thumb') return [
    ['thumb-metacarpal', 'bend', 'Koreň ohnutie', -40, 60], ['thumb-metacarpal', 'spread', 'Koreň do strany', -50, 50],
    ['thumb-metacarpal', 'twist', 'Koreň otočenie', -60, 60], ['thumb-phalanx-proximal', 'bend', 'Stred ohnutie', -30, 90],
    ['thumb-phalanx-distal', 'bend', 'Koniec ohnutie', -30, 90],
  ];
  const j = (n: string) => `${f}-finger-${n}`;
  return [
    [j('metacarpal'), 'bend', 'Záprstie', -15, 25], [j('phalanx-proximal'), 'bend', 'Kĺb ohnutie', -30, 100],
    [j('phalanx-proximal'), 'spread', 'Kĺb do strany', -30, 30], [j('phalanx-intermediate'), 'bend', 'Stred ohnutie', -10, 110],
    [j('phalanx-distal'), 'bend', 'Koniec ohnutie', -20, 90],
  ];
}
/** How a fingertip drag bends the finger's joints (degrees per degree of the drag's curl). */
const CURL: Record<string, number> = { 'phalanx-proximal': 0.5, 'phalanx-intermediate': 1, 'phalanx-distal': 0.6, 'thumb-phalanx-proximal': 0.8, 'thumb-phalanx-distal': 0.8 };
const curlShare = (joint: string) => CURL[joint] ?? CURL[joint.replace(/^\w+-finger-/, '')] ?? 0;
const spreadJoint = (f: FingerName) => (f === 'thumb' ? 'thumb-metacarpal' : `${f}-finger-phalanx-proximal`);

/** A first pose, before the home position of a hand is saved: fingers over the home keys, gently bent. */
function defaultPose(side: Side, name: string): PoseFile {
  const joints: Record<string, JointTurn> = {};
  for (const f of FINGERS) {
    if (f === 'thumb') continue;
    joints[`${f}-finger-phalanx-proximal`] = { bend: 25 };
    joints[`${f}-finger-phalanx-intermediate`] = { bend: 45 };
    joints[`${f}-finger-phalanx-distal`] = { bend: 15 };
  }
  joints['thumb-metacarpal'] = { bend: -20 };
  joints['thumb-phalanx-proximal'] = { bend: 10 };
  const left: PoseFile = { v: 1, side: 'left', name, hand: { x: 222, y: 440, yaw: 4, pitch: 20, roll: 0, scale: 2565 }, joints, line: 2.4 };
  return side === 'left' ? left : mirrored(left);
}

/** Between the F and J keys: a pose mirrored over it lies on the other hand's home keys. */
const MIRROR_X = 389.5;
/** The same pose for the other hand: mirrored over MIRROR_X, sideways turns the other way. */
function mirrored(p: PoseFile): PoseFile {
  const joints = Object.fromEntries(Object.entries(p.joints).map(([j, t]) => [j, { ...t, spread: t.spread && -t.spread, twist: t.twist && -t.twist }]));
  const h = p.hand;
  return { ...p, side: p.side === 'left' ? 'right' : 'left', hand: { ...h, x: 2 * MIRROR_X - h.x, yaw: -h.yaw, roll: -h.roll }, joints };
}

// ---- page ----

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('view');
const keysSvg = document.getElementById('keys') as unknown as SVGSVGElement;
const status = $<HTMLParagraphElement>('status');
const nameInput = $<HTMLInputElement>('name');
const savedSelect = $<HTMLSelectElement>('saved');
const show = { shade: $<HTMLInputElement>('showShade'), lines: $<HTMLInputElement>('showLines'), nails: $<HTMLInputElement>('showNails'), other: $<HTMLInputElement>('showOther') };

const say = (text: string, error = false) => {
  status.textContent = text;
  status.classList.toggle('error', error);
};

// ---- the keyboard under the hand ----

/**
 * Tapko's keyboard (English or Slovak, chosen on the page), every key named as its pose is saved (poseName), with the
 * bottom row's modifiers that Tapko leaves out.
 */
const MODIFIERS: KeyDef[] = [
  ['ControlLeft', 0], ['MetaLeft', 0], ['AltLeft', 4], ['Space', 4, 6.25], ['AltRight', 5], ['MetaRight', 9], ['ContextMenu', 9], ['ControlRight', 9],
].map(([code, finger, w]) => ({ code: code as string, base: code === 'Space' ? ' ' : '', shift: '', finger: finger as Finger, w: (w as number) ?? 1.25 }));
const layoutSelect = $<HTMLSelectElement>('layout');
const NS = 'http://www.w3.org/2000/svg';
function svgEl(name: string, attrs: Record<string, string | number>, parent: Element): SVGElement {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}
keysSvg.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
const keysG = svgEl('g', {}, keysSvg);
const keyRects = new Map<string, SVGElement>();
const names = $<HTMLDataListElement>('names');
function drawKeys(): void {
  const layout = LAYOUTS[layoutSelect.value as 'us-qwerty' | 'sk-qwertz'];
  const rows = [...layout.rows.slice(0, 4), MODIFIERS];
  const layoutWithMods = { ...layout, rows };
  keysG.replaceChildren();
  keyRects.clear();
  names.replaceChildren();
  for (const [value, label] of [['home', 'základná pozícia'], ['rest', 'ruky vedľa klávesnice']]) names.append(Object.assign(document.createElement('option'), { value, label }));
  for (const [r, row] of rows.entries()) {
    let x = 0;
    for (const d of row) {
      x += (d.x ?? 0) * UNIT;
      const w = (d.w ?? 1) * UNIT - GAP, y = r * (KEY_H + GAP);
      const name = poseName(layoutWithMods, d.code) ?? '';
      const rect = svgEl('rect', { x, y, width: w, height: KEY_H, rx: 6 }, keysG);
      // The ISO Enter's two parts are one key.
      if (!keyRects.has(name)) keyRects.set(name, rect);
      else rect.dataset.also = name;
      svgEl('rect', { class: 'stripe', x: x + 4, y: y + KEY_H - 7, width: w - 8, height: 3, rx: 1.5, fill: FINGER_COLORS[d.finger] }, keysG);
      svgEl('text', { x: x + w / 2, y: y + (KEY_H - 9) / 2, class: name.length > 1 ? 'word' : '' }, keysG).textContent = name;
      if (!names.querySelector(`option[value="${name}"]`)) names.append(Object.assign(document.createElement('option'), { value: name, label: d.base.length === 1 ? d.base : '' }));
      x += (d.w ?? 1) * UNIT;
    }
  }
  markKey();
}
// Where Tapko fades the wrists out.
for (const y of [283, 354]) svgEl('line', { class: 'fade', x1: VIEW.x, x2: VIEW.x + VIEW.w, y1: y, y2: y }, keysSvg);
// The grips on the fingertips, over the hand.
const tipsSvg = document.getElementById('tips') as unknown as SVGSVGElement;
tipsSvg.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
const other = { lines: svgEl('path', { class: 'other' }, keysSvg), nails: svgEl('g', { opacity: 0.3 }, keysSvg) };

function markKey(): void {
  for (const rect of keysG.querySelectorAll<SVGElement>('rect:not(.stripe)')) {
    const on = keyRects.get(nameInput.value) === rect || rect.dataset.also === nameInput.value;
    rect.style.fill = on ? '#fff3b8' : '';
  }
}
layoutSelect.addEventListener('change', drawKeys);
drawKeys();

// ---- three.js ----

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x886655, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-300, 1000, -400);
scene.add(sun);
// Straight from above: world x is the keyboard's x, world z its y (down the page), world y the height.
const camera = new THREE.OrthographicCamera(VIEW.x, VIEW.x + VIEW.w, -VIEW.y, -(VIEW.y + VIEW.h), NEAR, FAR);
camera.position.set(0, FAR / 2, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

const partMaterial = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    #include <common>
    #include <skinning_pars_vertex>
    attribute float partId;
    varying float vPart;
    void main() {
      vPart = partId;
      #include <skinbase_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      #include <project_vertex>
    }`,
  fragmentShader: /* glsl */ `
    varying float vPart;
    void main() {
      float z = floor(gl_FragCoord.z * 65535.0);
      float hi = floor(z / 256.0);
      gl_FragColor = vec4(vPart / 255.0, hi / 255.0, (z - hi * 256.0) / 255.0, 1.0);
    }`,
});

const edgeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tPart: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 1 }, jump: { value: 0 },
    mask: { value: false }, showLines: { value: true }, showNails: { value: true }, lineColor: { value: LINE_COLOR },
    nailColors: { value: FINGERS.map(() => new THREE.Color()) },
  },
  transparent: true,
  depthTest: false,
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tPart; uniform vec2 texel; uniform float radius; uniform float jump;
    uniform bool mask; uniform bool showLines; uniform bool showNails; uniform vec3 lineColor; uniform vec3 nailColors[5];
    varying vec2 vUv;
    float idOf(vec4 c) { return floor(c.r * 255.0 + 0.5); }
    float zOf(vec4 c) { return floor(c.g * 255.0 + 0.5) * 256.0 + floor(c.b * 255.0 + 0.5); }
    float baseOf(float id) { return id > 10.0 ? id - 10.0 : id; }
    // Two neighbouring pixels on two sides of a line: the hand's edge; two fingers side by side (a finger meets the palm
    // without a line); a step in depth (a finger over the palm, a curled tip).
    bool differ(vec4 a, vec4 b) {
      float ia = idOf(a), ib = idOf(b);
      if ((ia == 0.0) != (ib == 0.0)) return true;
      if (ia == 0.0) return false;
      float ba = baseOf(ia), bb = baseOf(ib);
      return (ba != bb && ba != 1.0 && bb != 1.0) || abs(zOf(a) - zOf(b)) > jump;
    }
    bool edgeAt(vec2 uv) {
      vec4 c = texture2D(tPart, uv);
      return differ(c, texture2D(tPart, uv + vec2(texel.x, 0.0))) || differ(c, texture2D(tPart, uv + vec2(0.0, texel.y)));
    }
    void main() {
      vec4 c = texture2D(tPart, vUv);
      float id = idOf(c), b = baseOf(id);
      // Ink within the line's half width of an edge: the same thickness everywhere.
      bool line = false;
      int r = int(ceil(radius));
      for (int i = -r; i <= r; i++) for (int j = -r; j <= r; j++) {
        if (line || float(i * i + j * j) > radius * radius) continue;
        line = edgeAt(vUv + vec2(float(i), float(j)) * texel);
      }
      if (mask) { gl_FragColor = vec4(vec3(line ? 0.0 : 1.0), 1.0); return; }
      if (line && showLines) gl_FragColor = vec4(lineColor, 1.0);
      else if (id > 10.0 && showNails) gl_FragColor = vec4(nailColors[int(b) - 2], 0.45);
      else discard;
    }`,
});
const edgeScene = new THREE.Scene();
edgeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMaterial));
const edgeCamera = new THREE.Camera();

const targetOf = (w: number, h: number) => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const partTarget = targetOf(1, 1);

// ---- the hand ----

interface Hand {
  side: Side;
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  bones: Map<string, THREE.Bone>;
  rest: Map<string, THREE.Quaternion>;
  nails: THREE.Mesh[];
  shade: THREE.Material;
}

const loader = new GLTFLoader();
const hands: Partial<Record<Side, Promise<Hand>>> = {};

async function buildHand(side: Side): Promise<Hand> {
  const gltf = await loader.loadAsync(side === 'left' ? leftGlb : rightGlb);
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => { if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone); });
  // The WebXR hand's joints are all siblings (an XR system places each); here each joint turns the ones after it.
  for (const f of FINGERS) ['wrist', ...chainOf(f)].reduce((parent, child) => (bones.get(parent)!.attach(bones.get(child)!), child));
  const rest = new Map([...bones].map(([n, b]) => [n, b.quaternion.clone()]));
  // The wrist at the origin, its fingers up the page (-z) and the back of the hand to the camera (+y).
  const wrist = bones.get('wrist')!;
  const align = new THREE.Group();
  align.quaternion.copy(wrist.getWorldQuaternion(new THREE.Quaternion())).invert();
  align.position.copy(wrist.getWorldPosition(new THREE.Vector3())).applyQuaternion(align.quaternion).negate();
  align.add(model);
  const root = new THREE.Group();
  root.add(align);
  root.visible = false;
  scene.add(root);

  let mesh: THREE.SkinnedMesh | null = null;
  model.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh; });
  const skinned = mesh as unknown as THREE.SkinnedMesh;
  skinned.frustumCulled = false;
  // Every triangle is one part (the bone that moves it most), so a part's edge is sharp.
  const geo = skinned.geometry.toNonIndexed();
  skinned.geometry = geo;
  const index = geo.getAttribute('skinIndex'), weight = geo.getAttribute('skinWeight');
  const part = new Float32Array(geo.getAttribute('position').count);
  const partOfBone = (name: string) => (name === 'wrist' || name.includes('metacarpal') ? PART.palm : PART[name.split('-')[0] as FingerName]);
  for (let t = 0; t < part.length; t += 3) {
    const sum = new Map<number, number>();
    for (let v = t; v < t + 3; v++) for (let k = 0; k < 4; k++) sum.set(index.getComponent(v, k), (sum.get(index.getComponent(v, k)) ?? 0) + weight.getComponent(v, k));
    const bone = [...sum].sort((a, b) => b[1] - a[1])[0][0];
    part.fill(partOfBone(skinned.skeleton.bones[bone].name), t, t + 3);
  }
  geo.setAttribute('partId', new THREE.BufferAttribute(part, 1));
  const shade = new THREE.MeshStandardMaterial({ color: 0xeac8ae, roughness: 0.75, transparent: true, opacity: 0.8 });
  skinned.material = shade;

  // A nail on each last bone: a flat ellipsoid on the back of the finger, so the depth render hides it when the tip curls.
  root.updateMatrixWorld(true);
  const nails = FINGERS.map((f) => {
    const distal = bones.get(distalOf(f))!, tip = bones.get(tipOf(f))!;
    const len = tip.position.length(), dir = tip.position.clone().normalize();
    const pts: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < part.length; i++) {
      const b = skinned.skeleton.bones[index.getComponent(i, 0)].name;
      if (b !== distalOf(f) && b !== tipOf(f)) continue;
      skinned.getVertexPosition(i, v);
      pts.push(distal.worldToLocal(skinned.localToWorld(v.clone())));
    }
    const along = (p: THREE.Vector3) => p.dot(dir) / len;
    const mid = pts.filter((p) => along(p) > 0.35 && along(p) < 0.85);
    const across = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    const width = Math.max(...mid.map((p) => p.dot(across))) - Math.min(...mid.map((p) => p.dot(across)));
    const top = Math.max(...mid.map((p) => p.y));
    const geoN = new THREE.SphereGeometry(1, 20, 10);
    geoN.setAttribute('partId', new THREE.BufferAttribute(new Float32Array(geoN.getAttribute('position').count).fill(NAIL + PART[f]), 1));
    const nail = new THREE.Mesh(geoN, new THREE.MeshBasicMaterial({ color: FINGER_COLORS[appFinger(side, f)], transparent: true, opacity: 0.7 }));
    nail.scale.set(width * 0.34, 0.0012, len * 0.3);
    nail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    nail.position.copy(dir).multiplyScalar(len * 0.6).add(new THREE.Vector3(0, top - 0.0006, 0));
    nail.frustumCulled = false;
    distal.add(nail);
    return nail;
  });
  return { side, root, mesh: skinned, bones, rest, nails, shade };
}

// ---- posing ----

const D = THREE.MathUtils.DEG2RAD;
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const turnQ = (axis: THREE.Vector3, deg: number) => new THREE.Quaternion().setFromAxisAngle(axis, deg * D);

/** Puts the hand where the pose says. A joint turns on its own axes (WebXR: -z along the bone, +y out of the back of the hand). */
function applyPose(hand: Hand, p: PoseFile): void {
  const h = p.hand;
  hand.root.position.set(h.x, 0, h.y);
  // Yaw: clockwise on the page; pitch: the fingers down; roll: around the hand's length.
  hand.root.rotation.set(-h.pitch * D, -h.yaw * D, h.roll * D, 'YXZ');
  hand.root.scale.setScalar(h.scale);
  for (const [name, rest] of hand.rest) {
    const t = p.joints[name] ?? {};
    // Spread: to the right on the page; bend: towards the palm.
    hand.bones.get(name)!.quaternion.copy(rest).multiply(turnQ(Y, -(t.spread ?? 0))).multiply(turnQ(X, -(t.bend ?? 0))).multiply(turnQ(Z, t.twist ?? 0));
  }
  hand.root.updateMatrixWorld(true);
}

/** A fingertip grip catches the pointer this near (keyboard units). */
const GRIP = 16;

/** A fingertip on the page, in keyboard units. */
function tipAt(hand: Hand, f: FingerName): [number, number] {
  const v = hand.bones.get(tipOf(f))!.getWorldPosition(new THREE.Vector3());
  return [v.x, v.z];
}

const rangeOf = (joint: string, turn: keyof JointTurn): [number, number] => {
  for (const f of FINGERS) for (const c of controlsOf(f)) if (c[0] === joint && c[1] === turn) return [c[3], c[4]];
  return [-180, 180];
};
const clampTurn = (joint: string, turn: keyof JointTurn, v: number) => {
  const [lo, hi] = rangeOf(joint, turn);
  return Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10;
};

// ---- state ----

let current: Hand | null = null;
let pose: PoseFile = defaultPose('left', 'home');
let saved = '';
let history: string[] = [];
let index: HandIndex = { left: [], right: [] };
const side = (): Side => (document.querySelector<HTMLInputElement>('input[name=side]:checked')!.value as Side);

function setPose(p: PoseFile, asSaved: boolean): void {
  pose = structuredClone(p);
  if (asSaved) saved = JSON.stringify(pose);
  history = [JSON.stringify(pose)];
  refresh();
}
/** The pose changed: the hand, the sliders, the picture. */
function refresh(): void {
  if (current) {
    applyPose(current, pose);
    const hand = current;
    tipsSvg.replaceChildren();
    for (const f of FINGERS) {
      const [cx, cy] = tipAt(hand, f);
      svgEl('circle', { cx, cy, r: 6, 'data-finger': f }, tipsSvg);
    }
  }
  for (const s of sliders) s.sync();
  markKey();
  say(JSON.stringify(pose) === saved ? '' : 'Neuložené zmeny');
  redraw();
}
/** A finished change (a slider let go, a drag ended): one step for Ctrl+Z. */
function commit(): void {
  const now = JSON.stringify(pose);
  if (history.at(-1) !== now) history.push(now);
}
function undo(): void {
  if (history.length < 2) return;
  history.pop();
  pose = JSON.parse(history.at(-1)!) as PoseFile;
  refresh();
}

// ---- drawing ----

let queued = false;
function redraw(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    draw();
  });
}

function useMaterials(parts: boolean): void {
  if (!current) return;
  current.mesh.material = parts ? partMaterial : current.shade;
  for (const n of current.nails) {
    n.userData.shade ??= n.material;
    n.material = parts ? partMaterial : n.userData.shade;
  }
}
function drawParts(target: THREE.WebGLRenderTarget): void {
  useMaterials(true);
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  useMaterials(false);
}
function drawEdges(parts: THREE.WebGLRenderTarget, px: number, mask: boolean): void {
  const u = edgeMaterial.uniforms;
  u.tPart.value = parts.texture;
  u.texel.value.set(1 / parts.width, 1 / parts.height);
  u.radius.value = Math.max(0.5, (pose.line / 2) * px);
  u.mask.value = mask;
  u.jump.value = Math.max(DEPTH_JUMP, SLOPE / px) / ((FAR - NEAR) / 65535);
  u.showLines.value = show.lines.checked;
  u.showNails.value = show.nails.checked;
  FINGERS.forEach((f, i) => u.nailColors.value[i].set(FINGER_COLORS[appFinger(pose.side, f)]));
  renderer.render(edgeScene, edgeCamera);
}

function draw(): void {
  if (!current) return;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  partTarget.setSize(canvas.width, canvas.height);
  drawParts(partTarget);
  renderer.setRenderTarget(null);
  renderer.clear();
  if (show.shade.checked) renderer.render(scene, camera);
  drawEdges(partTarget, canvas.width / VIEW.w, false);
}

/** The outline and each visible nail as black on white PNGs over VIEW, EXPORT_PX pixels per unit. */
function exportPngs(): { lines: string; nails: { f: number; png: string }[] } {
  const w = VIEW.w * EXPORT_PX, h = VIEW.h * EXPORT_PX;
  const parts = targetOf(w, h), out = targetOf(w, h);
  drawParts(parts);
  renderer.setRenderTarget(out);
  renderer.clear();
  drawEdges(parts, EXPORT_PX, true);
  const read = (t: THREE.WebGLRenderTarget) => {
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(t, 0, 0, w, h, px);
    return px;
  };
  const linePx = read(out), partPx = read(parts);
  renderer.setRenderTarget(null);
  parts.dispose();
  out.dispose();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const png = (ink: (i: number) => boolean) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // The render's rows go up from the bottom.
      const v = ink(((h - 1 - y) * w + x) * 4) ? 0 : 255, o = (y * w + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  };
  const lines = png((i) => linePx[i] < 128);
  const nails = FINGERS.flatMap((f) => {
    const id = NAIL + PART[f];
    let any = false;
    for (let i = 0; i < partPx.length && !any; i += 4) any = partPx[i] === id;
    return any ? [{ f: appFinger(pose.side, f), png: png((i) => partPx[i] === id) }] : [];
  });
  draw();
  return { lines, nails };
}

// ---- sliders ----

interface Slider { sync(): void }
const sliders: Slider[] = [];
function slider(parent: HTMLElement, label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void): void {
  const row = document.createElement('label');
  row.className = 'slider';
  const input = Object.assign(document.createElement('input'), { type: 'range', min, max, step });
  const out = document.createElement('output');
  row.append(label, input, out);
  parent.append(row);
  input.addEventListener('input', () => {
    set(Number(input.value));
    refresh();
  });
  input.addEventListener('change', commit);
  // A double click puts the turn back to zero.
  input.addEventListener('dblclick', () => {
    set(min <= 0 && max >= 0 ? 0 : min);
    refresh();
    commit();
  });
  sliders.push({ sync: () => {
    input.value = String(get());
    out.textContent = String(Math.round(get() * 10) / 10);
  } });
}
function group(title: string): HTMLFieldSetElement {
  const fs = document.createElement('fieldset');
  fs.append(Object.assign(document.createElement('legend'), { textContent: title }));
  $('controls').append(fs);
  return fs;
}
{
  const g = group('Ruka');
  const hand = (key: keyof PoseFile['hand'], label: string, min: number, max: number, step = 1) =>
    slider(g, label, min, max, step, () => pose.hand[key], (v) => { pose.hand[key] = v; });
  hand('x', 'Zápästie x', VIEW.x, VIEW.x + VIEW.w);
  hand('y', 'Zápästie y', 0, VIEW.y + VIEW.h + 200);
  hand('yaw', 'Otočenie', -60, 60, 0.5);
  hand('pitch', 'Sklon prstov', -40, 40, 0.5);
  hand('roll', 'Náklon', -40, 40, 0.5);
  hand('scale', 'Veľkosť', 1500, 3600, 5);
  slider(g, 'Hrúbka čiary', 1, 5, 0.1, () => pose.line, (v) => { pose.line = v; });
}
for (const f of FINGERS) {
  const g = group(FINGER_LABEL[f]);
  for (const [joint, turn, label, min, max] of controlsOf(f)) {
    slider(g, label, min, max, 0.5, () => pose.joints[joint]?.[turn] ?? 0, (v) => { pose.joints[joint] = { ...pose.joints[joint], [turn]: v }; });
  }
}

// ---- dragging ----

const units = (e: PointerEvent): [number, number] => {
  const r = canvas.getBoundingClientRect();
  return [VIEW.x + ((e.clientX - r.left) / r.width) * VIEW.w, VIEW.y + ((e.clientY - r.top) / r.height) * VIEW.h];
};
function partUnder(e: PointerEvent): number {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * partTarget.width), y = Math.floor(((e.clientY - r.top) / r.height) * partTarget.height);
  const px = new Uint8Array(4);
  renderer.readRenderTargetPixels(partTarget, x, partTarget.height - 1 - y, 1, 1, px);
  return px[0];
}

/** Bends and turns a finger so its tip comes to `to`: one sideways turn and one curl shared over its joints. */
function dragFinger(f: FingerName, to: [number, number], start: PoseFile): void {
  const hand = current!;
  const at = (s: number, c: number): [number, number] => {
    const joints = structuredClone(start.joints);
    const sj = spreadJoint(f);
    joints[sj] = { ...joints[sj], spread: clampTurn(sj, 'spread', (joints[sj]?.spread ?? 0) + s) };
    for (const j of chainOf(f)) {
      const share = curlShare(j);
      if (share) joints[j] = { ...joints[j], bend: clampTurn(j, 'bend', (joints[j]?.bend ?? 0) + c * share) };
    }
    pose.joints = joints;
    applyPose(hand, pose);
    return tipAt(hand, f);
  };
  let s = 0, c = 0;
  for (let i = 0; i < 10; i++) {
    const p = at(s, c), ex = to[0] - p[0], ey = to[1] - p[1];
    if (Math.hypot(ex, ey) < 0.3) break;
    const ps = at(s + 1, c), pc = at(s, c + 1);
    const a = ps[0] - p[0], b = pc[0] - p[0], cc = ps[1] - p[1], d = pc[1] - p[1], det = a * d - b * cc;
    if (Math.abs(det) < 1e-6) break;
    const step = (v: number) => Math.max(-15, Math.min(15, v));
    s += step((d * ex - b * ey) / det);
    c += step((a * ey - cc * ex) / det);
  }
  at(s, c);
}

let drag: { kind: 'finger' | 'hand' | 'turn'; f?: FingerName; from: [number, number]; start: PoseFile } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!current) return;
  const at = units(e);
  const near = FINGERS.map((f) => {
    const [x, y] = tipAt(current!, f);
    return { f, d: Math.hypot(x - at[0], y - at[1]) };
  }).sort((a, b) => a.d - b.d)[0];
  const start = structuredClone(pose);
  if (near.d < GRIP) drag = { kind: 'finger', f: near.f, from: at, start };
  else if (partUnder(e)) drag = { kind: e.shiftKey ? 'turn' : 'hand', from: at, start };
  else return;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const at = units(e), s = drag.start.hand;
  if (drag.kind === 'finger') dragFinger(drag.f!, at, drag.start);
  else if (drag.kind === 'hand') {
    pose.hand.x = Math.round((s.x + at[0] - drag.from[0]) * 10) / 10;
    pose.hand.y = Math.round((s.y + at[1] - drag.from[1]) * 10) / 10;
  } else {
    const angle = (p: [number, number]) => Math.atan2(p[1] - s.y, p[0] - s.x) / D;
    pose.hand.yaw = Math.round((s.yaw + angle(at) - angle(drag.from)) * 10) / 10;
  }
  refresh();
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  canvas.classList.remove('dragging');
  commit();
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---- files ----

async function loadIndex(): Promise<void> {
  try {
    const r = await fetch(`/hands/index.json?t=${Date.now()}`);
    if (r.ok) index = (await r.json()) as HandIndex;
  } catch { /* nothing saved yet */ }
  savedSelect.replaceChildren(...index[side()].map((n) => Object.assign(document.createElement('option'), { value: n, textContent: n })));
  if (index[side()].includes(nameInput.value)) savedSelect.value = nameInput.value;
}
/** A saved file (only names in the list: the dev server answers a missing file with the app's page). */
async function fetchSvg(s: Side, name: string): Promise<string | null> {
  if (!index[s].includes(name)) return null;
  const r = await fetch(`/hands/${s}/${name}.svg?t=${Date.now()}`);
  return r.ok ? r.text() : null;
}
async function homeOf(s: Side): Promise<PoseFile> {
  const svg = await fetchSvg(s, 'home');
  return (svg && readPose(svg)) || defaultPose(s, 'home');
}

/** The other hand, faint, as Tapko would draw it with this key: its outline of the same name, else its home. */
async function showOther(): Promise<void> {
  const s: Side = side() === 'left' ? 'right' : 'left';
  const svg = show.other.checked ? (await fetchSvg(s, nameInput.value)) ?? (await fetchSvg(s, 'home')) : null;
  const shape = svg ? readHandSvg(svg) : { lines: '', nails: [] };
  other.lines.setAttribute('d', shape.lines);
  other.nails.replaceChildren();
  for (const n of shape.nails) svgEl('path', { d: n.d, fill: FINGER_COLORS[n.f as Finger] }, other.nails);
}

async function open(name: string): Promise<void> {
  const svg = await fetchSvg(side(), name);
  const p = svg && readPose(svg);
  if (!p) return say(`${name} sa nedá načítať`, true);
  nameInput.value = name;
  setPose(p, true);
  void showOther();
}

/** Tells an open Tapko (same dev server) that an outline changed, so it shows it at once. */
const tapko = new BroadcastChannel(HANDS_CHANNEL);

/** Renders the pose shown and saves it; the saved file's path, or null when it failed (said on the page). */
async function post(): Promise<string | null> {
  const r = await fetch('/__hand-poser/save', { method: 'POST', body: JSON.stringify({ pose, px: EXPORT_PX, ...exportPngs() }) });
  const res = (await r.json()) as { ok: boolean; file?: string; error?: string; index?: HandIndex };
  if (!res.ok) {
    say(res.error ?? 'Uloženie zlyhalo', true);
    return null;
  }
  if (res.index) index = res.index;
  return res.file ?? null;
}

async function save(): Promise<void> {
  const name = nameInput.value.trim();
  if (!POSE_NAME.test(name)) return say('Názov ako na klávese: malé písmená a číslice (napríklad r, spac, lshi, l1, home, rest)', true);
  pose.name = name;
  pose.side = side();
  say('Ukladám…');
  const file = await post();
  if (!file) return;
  saved = JSON.stringify(pose);
  await loadIndex();
  tapko.postMessage(file);
  say(`Uložené ${file}`);
}

/** The steps saved between rest and home, so the hands come onto the keys smoothly. */
const STEPS = 4;
/** A pose `t` of the way from `a` to `b` (every turn and the hand's place mixed). */
function between(a: PoseFile, b: PoseFile, t: number): PoseFile {
  const mix = (x = 0, y = 0) => Math.round((x + (y - x) * t) * 10) / 10;
  const hand = { ...a.hand };
  for (const k of Object.keys(hand) as (keyof PoseFile['hand'])[]) hand[k] = mix(a.hand[k], b.hand[k]);
  const joints: Record<string, JointTurn> = {};
  for (const j of new Set([...Object.keys(a.joints), ...Object.keys(b.joints)])) {
    const [x, y] = [a.joints[j] ?? {}, b.joints[j] ?? {}];
    joints[j] = { bend: mix(x.bend, y.bend), spread: mix(x.spread, y.spread), twist: mix(x.twist, y.twist) };
  }
  return { ...a, hand, joints, line: mix(a.line, b.line) };
}

async function saveSteps(): Promise<void> {
  const s = side();
  const [rest, home] = await Promise.all(['rest', 'home'].map(async (n) => {
    const svg = await fetchSvg(s, n);
    return svg && readPose(svg);
  }));
  if (!rest || !home) return say('Najprv ulož rest aj home tejto ruky', true);
  const keep = pose;
  for (let i = 1; i <= STEPS; i++) {
    pose = { ...between(rest, home, i / (STEPS + 1)), name: `rest${i}`, side: s };
    applyPose(current!, pose);
    say(`Ukladám rest${i}…`);
    if (!(await post())) break;
  }
  pose = keep;
  refresh();
  await loadIndex();
  tapko.postMessage(`${s}/rest`);
  say(`Uložené kroky rest1 až rest${STEPS}`);
}

async function remove(): Promise<void> {
  const name = nameInput.value.trim();
  if (!index[side()].includes(name) || !confirm(`Zmazať ${side()}/${name}.svg?`)) return;
  await fetch('/__hand-poser/delete', { method: 'POST', body: JSON.stringify({ pose: { ...pose, name, side: side() } }) });
  await loadIndex();
  tapko.postMessage(name);
  saved = '';
  say(`Zmazané ${name}`);
}

async function chooseSide(): Promise<void> {
  const s = side();
  hands[s] ??= buildHand(s);
  const hand = await hands[s];
  if (current) current.root.visible = false;
  current = hand;
  hand.root.visible = true;
  await loadIndex();
  const name = nameInput.value.trim() || 'home';
  if (index[s].includes(name)) await open(name);
  else {
    // A pose not saved yet starts from the home position.
    nameInput.value = name;
    setPose({ ...(await homeOf(s)), name }, false);
    say(`Nová póza ${name} zo základnej pozície`);
    void showOther();
  }
}

for (const r of document.querySelectorAll<HTMLInputElement>('input[name=side]')) r.addEventListener('change', () => void chooseSide());
$('load').addEventListener('click', () => void open(savedSelect.value));
$('fresh').addEventListener('click', async () => {
  setPose({ ...(await homeOf(side())), name: nameInput.value }, false);
  say('Nová póza zo základnej pozície');
});
$('mirror').addEventListener('click', async () => {
  const from: Side = side() === 'left' ? 'right' : 'left';
  const svg = await fetchSvg(from, nameInput.value);
  const p = svg && readPose(svg);
  if (!p) return say(`Druhá ruka nemá ${nameInput.value}`, true);
  setPose({ ...mirrored(p), name: nameInput.value }, false);
  say(`Zrkadlené z ${from}/${nameInput.value}`);
});
$('save').addEventListener('click', () => void save());
$('steps').addEventListener('click', () => void saveSteps());
$('remove').addEventListener('click', () => void remove());
nameInput.addEventListener('input', () => {
  markKey();
  void showOther();
});
for (const c of Object.values(show)) c.addEventListener('change', () => (c === show.other ? void showOther() : redraw()));
window.addEventListener('resize', redraw);
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === 'z') {
    e.preventDefault();
    undo();
  } else if (e.key === 's') {
    e.preventDefault();
    void save();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (JSON.stringify(pose) !== saved) e.preventDefault();
});

// Tapko's free typing opens the poser on the outline of the key typed last: `?pose=<side>/<name>`.
const [wantSide, wantName] = (new URLSearchParams(location.search).get('pose') ?? '').split('/');
if (wantSide === 'left' || wantSide === 'right') document.querySelector<HTMLInputElement>(`input[name=side][value=${wantSide}]`)!.checked = true;
if (wantName && POSE_NAME.test(wantName)) nameInput.value = wantName;
void chooseSide();
