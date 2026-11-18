import * as THREE from 'three';
import { BEATS, beatAt } from './story';
import { SACKS } from './sack3d';

// Scene 3D low-poly alur shift. Semua pose adalah fungsi murni dari waktu loop t (detik),
// jadi loncat babak, gambar diam (reduced motion), dan pengulangan cukup "render di t".
// Area (sumbu x): kantor planning −14 · warehouse −8 · jalur forklift · meja material 5 · tungku 8,3.

const COL = {
  floor: 0x0f1315, pad: 0x1b2125, path: 0x2c353a, struct: 0x3a444a, steel: 0x7d878b, light: 0xb3bbbe,
  sack: SACKS.default.color, paper: 0xece9e2, amber: 0xf0a32a, danger: 0xeb6a5f, molten: 0xe8742a, screen: 0x1f3a52,
};
const AMBER = new THREE.Color(COL.amber);
const SHIFT_COL = { Red: new THREE.Color(COL.danger), White: new THREE.Color(COL.paper) };

const clamp01 = x => Math.max(0, Math.min(1, x));
const seg = (l, a, b) => clamp01((l - a) / (b - a));
const easeOut = x => 1 - (1 - x) ** 3;
const smooth = x => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const bez = (out, p0, p1, p2, k) => out.set(
  (1 - k) ** 2 * p0.x + 2 * (1 - k) * k * p1.x + k * k * p2.x,
  (1 - k) ** 2 * p0.y + 2 * (1 - k) * k * p1.y + k * k * p2.y,
  (1 - k) ** 2 * p0.z + 2 * (1 - k) * k * p1.z + k * k * p2.z,
);

const FORK = { warehouse: -8, melting: 2.4, z: 0.7 };
const SACK = { w: 0.42, h: SACKS.default.d, d: 0.42 }; // karung tidur di palet: tebal = tebal karung berdiri
const BIN = { w: 0.42, h: 0.5, d: 0.38, cols: 5 };
const MEJA = new THREE.Vector3(5, 0, 0.4);
const FURNACE = new THREE.Vector3(8.3, 0, 0.2);
const TABLET = new THREE.Vector3(7, 0, -1.5);
const MONITOR = new THREE.Vector3(3.2, 0, -1.7);

// Target kamera per babak; null = ikuti forklift.
const CAM = [
  { x: -13.6, z: 0.2, zoom: 1.45 }, { x: -13.4, z: 0.4, zoom: 1.45 }, { x: -13.6, z: 0.2, zoom: 1.5 },
  null,
  { x: 4.3, z: 0.5, zoom: 1.35 }, { x: 6.4, z: 0.3, zoom: 1.2 }, { x: 6.8, z: -1.1, zoom: 1.6 },
  { x: 4.8, z: -0.7, zoom: 1.1 }, { x: 3, z: -0.4, zoom: 0.8 },
];
const ACTIVE = ['desk', 'desk', 'desk', 'forklift', 'meja', 'furnace', 'tablet', 'monitor', 'lamp'];

const box = (w, h, d, color, opts = {}) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...opts }));
const cyl = (r, h, color, opts = {}) =>
  new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...opts }));
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const disposeMesh = m => { m.geometry.dispose(); m.material.dispose(); };

export function createStoryScene(container, data, { maxDpr = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x0e1214, 1);
  renderer.domElement.style.display = 'block';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe6ea, 0x0a0c0d, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const CAM_OFF = new THREE.Vector3(10, 11, 10);
  const VIEW_H = 7.5;
  const look = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

  const active = {}; // nama objek → material yang diberi emissive amber saat babaknya
  const mark = (name, ...meshes) => { active[name] = (active[name] ?? []).concat(meshes.map(m => m.material)); };

  // Lantai dan area
  scene.add(at(box(44, 0.1, 12, COL.floor), -3, -0.05, 0));
  for (const [x, w] of [[-14, 4], [-8, 3.4], [6, 7.4]]) scene.add(at(box(w, 0.02, 4.6, COL.pad), x, 0.01, -0.2));
  scene.add(at(box(FORK.melting - FORK.warehouse + 1.2, 0.02, 0.9, COL.path), (FORK.melting + FORK.warehouse) / 2, 0.02, FORK.z));

  // Kantor planning: meja kerja, papan planning (bar produk), printer, bon, stempel, tumpukan saran.
  const desk = at(box(1.8, 0.08, 0.9, COL.struct), -14, 0.75, 0);
  for (const [dx, dz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) scene.add(at(box(0.06, 0.75, 0.06, COL.struct), -14 + dx, 0.375, dz));
  const board = at(box(1.3, 0.85, 0.05, 0x161b1e), -14.1, 1.32, -0.35);
  scene.add(desk, board);
  mark('desk', desk, board);
  const boardBars = data.boardBars.map((b, i) => {
    const m = box(0.18, 0.6, 0.02, b.color, { emissive: b.color, emissiveIntensity: 0.25 });
    m.geometry.translate(0, 0.3, 0);
    scene.add(at(m, -14.55 + i * 0.3, 0.95, -0.31));
    return m;
  });
  const paper = at(box(0.28, 0.01, 0.36, COL.paper, { emissive: COL.paper, emissiveIntensity: 0.15 }), -13.4, 0.8, 0.1);
  const stamp = cyl(0.07, 0.16, COL.amber);
  scene.add(at(box(0.4, 0.2, 0.32, COL.light), -13.4, 0.89, 0.1), paper, stamp);
  const saranPiles = [0, 1, 2].map(i => {
    const g = new THREE.Group();
    for (let k = 0; k <= i; k++) g.add(at(box(SACK.w * 0.6, SACK.h * 0.6, SACK.d * 0.6, COL.sack), 0, 0.05 + k * 0.1, 0));
    scene.add(at(g, -12.7 + i * 0.4, 0, 0.9 - i * 0.15));
    return g;
  });

  // Warehouse: rak dengan stok karung (statis).
  const rack = new THREE.Group();
  for (const dx of [-1.2, 1.2]) rack.add(at(box(0.08, 2, 0.08, COL.steel), dx, 1, 0));
  for (const y of [0.1, 1]) {
    rack.add(at(box(2.5, 0.06, 0.9, COL.struct), 0, y, 0));
    for (let k = 0; k < 8; k++) rack.add(at(box(SACK.w, SACK.h, SACK.d, COL.sack), -0.9 + (k % 4) * 0.6, y + 0.12 + Math.floor(k / 4) * 0.16, 0));
  }
  scene.add(at(rack, -8, 0, -1.7));

  // Forklift (menghadap +x) dengan palet + tumpukan karung (2×2 per lapis).
  const forklift = new THREE.Group();
  const body = at(box(1, 0.6, 0.8, COL.light), -0.25, 0.5, 0);
  forklift.add(body, at(box(0.55, 0.06, 0.75, COL.struct), -0.35, 1.5, 0));
  for (const dz of [-0.33, 0.33]) forklift.add(at(box(0.05, 0.75, 0.05, COL.struct), -0.55, 1.12, dz), at(box(0.05, 0.75, 0.05, COL.struct), -0.12, 1.12, dz));
  for (const dz of [-0.25, 0.25]) forklift.add(at(box(0.07, 1.6, 0.07, COL.steel), 0.3, 0.8, dz));
  for (const [dx, dz] of [[-0.55, -0.42], [-0.55, 0.42], [0.1, -0.42], [0.1, 0.42]]) {
    const w = cyl(0.17, 0.12, 0x2c353a);
    w.rotation.x = Math.PI / 2;
    forklift.add(at(w, dx, 0.17, dz));
  }
  const carriage = new THREE.Group();
  for (const dz of [-0.2, 0.2]) carriage.add(at(box(0.8, 0.04, 0.1, COL.steel), 0.75, 0, dz));
  carriage.add(at(box(0.9, 0.1, 0.9, 0x6b5a45), 0.78, 0.07, 0));
  const palletSacks = new THREE.InstancedMesh(new THREE.BoxGeometry(SACK.w, SACK.h, SACK.d), new THREE.MeshStandardMaterial({ color: COL.sack, roughness: 0.9, flatShading: true }), 12);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    const layer = Math.floor(i / 4), k = i % 4;
    tmp.position.set(0.78 + (k % 2 - 0.5) * 0.44, 0.13 + SACK.h / 2 + layer * (SACK.h + 0.01), (Math.floor(k / 2) - 0.5) * 0.44);
    tmp.rotation.y = (i % 3 - 1) * 0.06;
    tmp.updateMatrix();
    palletSacks.setMatrixAt(i, tmp.matrix);
  }
  carriage.add(palletSacks);
  forklift.add(carriage);
  scene.add(forklift);
  mark('forklift', body);

  // Karung yang dipindah dari palet ke meja (babak 5).
  const hop = [0, 1, 2].map(() => { const m = box(SACK.w * 0.8, SACK.h, SACK.d * 0.8, COL.sack); scene.add(m); return m; });

  // Meja material + kompartemen (dibuat di setData).
  const mejaTop = at(box(2.7, 0.08, 1.1, COL.struct), MEJA.x, 0.85, MEJA.z);
  scene.add(mejaTop);
  for (const [dx, dz] of [[-1.25, -0.45], [1.25, -0.45], [-1.25, 0.45], [1.25, 0.45]]) scene.add(at(box(0.07, 0.85, 0.07, COL.struct), MEJA.x + dx, 0.425, MEJA.z + dz));
  mark('meja', mejaTop);
  const binsGroup = new THREE.Group();
  scene.add(binsGroup);
  let bins = [];

  // Tungku melting + partikel material.
  const furnace = at(cyl(0.75, 1.3, COL.struct), FURNACE.x, 0.65, FURNACE.z);
  const molten = at(cyl(0.62, 0.04, COL.molten, { emissive: COL.molten, emissiveIntensity: 0.8 }), FURNACE.x, 1.31, FURNACE.z);
  scene.add(furnace, molten);
  mark('furnace', furnace);
  const flowGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const flowMat = new THREE.MeshStandardMaterial({ color: COL.light, emissive: COL.amber, emissiveIntensity: 0.4 });
  const flow = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(flowGeo, flowMat); scene.add(m); return m; });

  // Tablet aplikasi produksi.
  scene.add(at(box(0.05, 1.1, 0.05, COL.steel), TABLET.x, 0.55, TABLET.z));
  const tablet = at(box(0.6, 0.42, 0.05, COL.struct), TABLET.x, 1.25, TABLET.z + 0.05);
  tablet.rotation.x = -0.35;
  const tabletScreen = at(new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.34), new THREE.MeshStandardMaterial({ color: COL.screen, emissive: COL.screen, emissiveIntensity: 0.6 })), 0, 0, 0.03);
  tablet.add(tabletScreen);
  const tabletRows = [0, 1, 2].map(i => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.05), new THREE.MeshBasicMaterial({ color: COL.paper }));
    m.geometry.translate(0.18, 0, 0);
    tablet.add(at(m, -0.22, 0.09 - i * 0.09, 0.031));
    return m;
  });
  scene.add(tablet);
  mark('tablet', tablet);

  // Monitor MatPrep: bar stok yang tercatat di sistem.
  scene.add(at(box(0.06, 1.2, 0.06, COL.steel), MONITOR.x, 0.6, MONITOR.z));
  const monitor = at(box(1.05, 0.65, 0.06, COL.struct), MONITOR.x, 1.45, MONITOR.z);
  const monitorScreen = at(new THREE.Mesh(new THREE.PlaneGeometry(0.97, 0.57), new THREE.MeshStandardMaterial({ color: 0x0e1214, emissive: 0x0e1214 })), 0, 0, 0.035);
  monitor.add(monitorScreen);
  scene.add(monitor);
  mark('monitor', monitor);
  let monitorBars = [];

  const signal = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: COL.amber }));
  scene.add(signal);

  // Lampu shift.
  scene.add(at(box(0.06, 2.3, 0.06, COL.steel), 5.9, 1.15, -2.3));
  const lamp = at(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissiveIntensity: 1.2 })), 5.9, 2.4, -2.3);
  scene.add(lamp);

  for (const mats of Object.values(active)) for (const m of mats) { m.userData.base = m.emissive.clone(); m.userData.baseI = m.emissiveIntensity; }

  let d = data;
  function setData(next) {
    d = next;
    next.boardBars.forEach((b, i) => { boardBars[i].material.color.set(b.color); boardBars[i].material.emissive.set(b.color); });
    for (const b of bins) { disposeMesh(b.shell); disposeMesh(b.fill); }
    binsGroup.clear();
    for (const m of monitorBars) { disposeMesh(m); monitor.remove(m); }
    const n = next.bars.length, cols = Math.min(BIN.cols, Math.max(1, n)), rows = Math.ceil(n / cols);
    bins = next.bars.map((bar, i) => {
      const cx = MEJA.x + ((i % cols) - (cols - 1) / 2) * (BIN.w + 0.06);
      const cz = MEJA.z + (Math.floor(i / cols) - (rows - 1) / 2) * (BIN.d + 0.08);
      const shell = at(box(BIN.w, BIN.h, BIN.d, 0x22292e, { transparent: true, opacity: 0.55 }), cx, 0.89 + BIN.h / 2, cz);
      const fill = box(BIN.w - 0.05, BIN.h - 0.04, BIN.d - 0.05, COL.light);
      fill.geometry.translate(0, (BIN.h - 0.04) / 2, 0);
      binsGroup.add(shell, at(fill, cx, 0.91, cz));
      return { bar, shell, fill };
    });
    const gap = n > 1 ? 0.8 / (n - 1) : 0;
    monitorBars = next.bars.map((_, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), new THREE.MeshBasicMaterial({ color: COL.light }));
      m.geometry.translate(0, 0.2, 0);
      monitor.add(at(m, n > 1 ? -0.4 + i * gap : 0, -0.24, 0.04));
      return m;
    });
  }
  setData(data);

  // ---------- pose(t) ----------
  function forkX(i, l) {
    if (i < 3) return FORK.warehouse;
    if (i === 3) return lerp(FORK.warehouse, FORK.melting, smooth(seg(l, 0.12, 0.92)));
    if (i < 8) return FORK.melting;
    return lerp(FORK.melting, FORK.warehouse, smooth(seg(l, 0.1, 0.95)));
  }
  const camTarget = (i, l) => CAM[i] ?? { x: forkX(i, l), z: FORK.z - 0.3, zoom: 1.05 };
  // physical = isi meja (turun saat dipakai, babak 6); selain itu layar MatPrep (turun setelah input, babak 8)
  function level(bar, i, l, physical) {
    if (i < 4) return bar.before;
    if (i === 4) return lerp(bar.before, bar.full, easeOut(seg(l, 0.25, 0.9)));
    const drop = physical ? 5 : 7;
    if (i < drop) return bar.full;
    if (i === drop) return lerp(bar.full, bar.after, easeOut(seg(l, physical ? 0.15 : 0.4, 0.9)));
    return bar.after;
  }

  function setTime(t) {
    const { index: i, local: l } = beatAt(t);
    const sec = l * BEATS[i].dur;

    boardBars.forEach((m, k) => { m.scale.y = Math.max(0.02, d.boardBars[k].v * (i === 0 ? easeOut(seg(l, 0.1 + k * 0.08, 0.6 + k * 0.08)) : 1)); });
    saranPiles.forEach((g, k) => {
      const s = i === 1 ? easeOut(seg(l, 0.1 + k * 0.12, 0.45 + k * 0.12)) : i === 2 ? 1 - seg(l, 0.55, 0.85) : 0;
      g.scale.setScalar(Math.max(0.001, s));
      g.visible = s > 0.01;
    });
    paper.visible = stamp.visible = i === 2;
    paper.position.z = 0.1 + 0.32 * easeOut(seg(l, 0, 0.45));
    stamp.position.set(-13.4, 0.88 + 0.35 * Math.abs(Math.cos(Math.PI * seg(l, 0.5, 0.85))), 0.42);

    forklift.position.set(forkX(i, l), 0, FORK.z);
    carriage.position.y = 0.15 + (i === 3 ? 0.25 * (seg(l, 0, 0.12) - seg(l, 0.92, 1)) : 0);
    const sacks = i <= 3 ? d.palletSacks : i === 4 ? Math.round(d.palletSacks * (1 - seg(l, 0.1, 0.85))) : 0;
    palletSacks.count = sacks;
    palletSacks.visible = sacks > 0;

    v1.set(FORK.melting + 0.78, 1, FORK.z);
    v2.set((FORK.melting + MEJA.x) / 2, 1.9, (FORK.z + MEJA.z) / 2);
    hop.forEach((m, k) => {
      m.visible = i === 4 && l > 0.08 && l < 0.88;
      if (!m.visible) return;
      const p = (l * 3 + k / 3) % 1;
      bez(m.position, v1, v2, v3.set(MEJA.x - 0.6 + k * 0.6, 1.2, MEJA.z), p);
      m.rotation.z = p * Math.PI;
    });

    for (const b of bins) {
      b.fill.scale.y = Math.max(0.02, level(b.bar, i, l, true));
      b.fill.material.color.set(b.bar.low && (i > 5 || (i === 5 && l > 0.6)) ? COL.danger : COL.light);
    }
    monitorBars.forEach((m, k) => {
      const bar = d.bars[k];
      m.scale.y = Math.max(0.03, level(bar, i, l, false));
      m.material.color.set(bar.low && (i > 7 || (i === 7 && l > 0.6)) ? COL.danger : COL.light);
    });
    monitorScreen.material.emissive.set(i === 7 ? 0x14202a : 0x0e1214);

    v1.set(MEJA.x + 0.9, 1.3, MEJA.z);
    v2.set((MEJA.x + FURNACE.x) / 2 + 0.4, 2.2, (MEJA.z + FURNACE.z) / 2);
    v3.set(FURNACE.x, 1.4, FURNACE.z);
    flow.forEach((m, k) => {
      m.visible = i === 5 && l > 0.1 && l < 0.95;
      if (m.visible) bez(m.position, v1, v2, v3, (l * 2.2 + k / flow.length) % 1);
    });
    molten.material.emissiveIntensity = 0.7 + (i === 5 ? 0.35 * Math.sin(sec * 6) ** 2 : 0);

    tabletScreen.material.emissiveIntensity = i === 6 ? 0.9 + 0.6 * seg(l, 0.78, 0.86) * (1 - seg(l, 0.86, 1)) : 0.4;
    tabletRows.forEach((m, k) => {
      m.scale.x = Math.max(0.001, i === 6 ? easeOut(seg(l, 0.1 + k * 0.18, 0.3 + k * 0.18)) : i === 7 ? 1 : 0);
      m.visible = m.scale.x > 0.01;
    });

    signal.visible = i === 7 && l < 0.45;
    if (signal.visible) {
      v1.set(TABLET.x, 1.35, TABLET.z);
      v3.set(MONITOR.x, 1.5, MONITOR.z);
      v2.copy(v1).lerp(v3, 0.5).setY(2.6);
      bez(signal.position, v1, v2, v3, easeOut(seg(l, 0, 0.4)));
    }

    lamp.material.color.copy(SHIFT_COL[d.shiftFrom] ?? SHIFT_COL.Red).lerp(SHIFT_COL[d.shiftTo] ?? SHIFT_COL.White, i === 8 ? smooth(seg(l, 0.3, 0.7)) : 0);
    lamp.material.emissive.copy(lamp.material.color);

    for (const [name, mats] of Object.entries(active)) {
      const on = ACTIVE[i] === name;
      for (const m of mats) { m.emissive.copy(on ? AMBER : m.userData.base); m.emissiveIntensity = on ? 0.22 : m.userData.baseI; }
    }

    // Kamera: dari target babak sebelumnya ke babak ini dalam 0,8 detik pertama.
    const p = camTarget((i + BEATS.length - 1) % BEATS.length, 1), c = camTarget(i, l), k = smooth(clamp01(sec / 0.8));
    look.set(lerp(p.x, c.x, k), 0.9, lerp(p.z, c.z, k));
    camera.zoom = lerp(p.zoom, c.zoom, k);
    camera.position.copy(look).add(CAM_OFF);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  }

  function resize(w, h) {
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = (-VIEW_H * aspect) / 2;
    camera.right = (VIEW_H * aspect) / 2;
    camera.top = VIEW_H / 2;
    camera.bottom = -VIEW_H / 2;
    camera.updateProjectionMatrix();
  }

  return {
    setData,
    setTime,
    render: () => renderer.render(scene, camera),
    resize,
    dispose() {
      scene.traverse(o => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
