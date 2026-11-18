import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BEATS, beatAt } from './story';
import { SACKS } from './sack3d';
import { fmtNum } from './calc';

// Scene 3D alur shift. Semua pose adalah fungsi murni dari waktu loop t (detik),
// jadi loncat babak, gambar diam (reduced motion), dan pengulangan cukup "render di t".
// Area (sumbu x, meter): kantor planning −14 · warehouse −8 · lorong forklift · meja material 5 ·
// stasiun tungku induksi 9,6 (bentuk mengikuti furnace-machine/tungku-induksi.html).

const C = {
  floor: 0x171c1f, seam: 0x101417, aisle: 0xb8922c, steel: 0x5d676d, steelDark: 0x2e353a, steelLight: 0xb3bbbe,
  panel: 0xcfd3d4, desk: 0x3a4246, sack: SACKS.default.color, kraft: 0xc8b48c, wood: 0x7a6247, paper: 0xece9e2,
  amber: 0xf0a32a, danger: 0xeb6a5f, ok: 0x4dbe8a, copper: 0xb8733a, refractory: 0xa7a197, molten: 0xffa53a,
  rubber: 0x15181a, forklift: 0xc99a2e, rackUpright: 0x3c5470, rackBeam: 0xb0632c, screenBg: 0x0e1214,
};
const SHIFT_COL = { Red: new THREE.Color(C.danger), White: new THREE.Color(0xf4f1ea) };
const AMBER = new THREE.Color(C.amber);

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

const OFFICE = new THREE.Vector3(-14, 0, 0);
const FORK = { warehouse: -8, melting: 2.3, z: 0.75, wheelF: 0.27, wheelR: 0.22 };
const MEJA = new THREE.Vector3(5, 0, 0.4);
const FC = new THREE.Vector3(9.6, 0, 0); // pusat tungku
const DECK_Y = 1.72;
const TABLET = new THREE.Vector3(7.3, 0, -1.25);
const MONITOR = new THREE.Vector3(3.2, 0, -1.7);
const BIN = { w: 0.42, h: 0.5, d: 0.38, cols: 5 };
const SACK = { w: 0.44, h: 0.14, d: 0.42 };

// Target kamera per babak; null = ikuti forklift.
const CAM = [
  { x: -14.1, z: -0.15, zoom: 2.6 }, { x: -14.1, z: -0.15, zoom: 2.6 }, { x: -13.5, z: 0, zoom: 2.05 },
  null,
  { x: 4.4, z: 0.5, zoom: 1.4 }, { x: 8.7, z: -0.1, zoom: 0.92 }, { x: 7.3, z: -1, zoom: 1.9 },
  { x: 5, z: -0.8, zoom: 1.1 }, { x: 8.9, z: -1.2, zoom: 1.15 },
];

export function createStoryScene(container, data, { maxDpr = 1.5, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0e1214, 1);
  renderer.domElement.style.display = 'block';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xdfe6ea, 0x0a0c0d, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const CAM_OFF = new THREE.Vector3(10, 11, 10);
  const SUN_OFF = new THREE.Vector3(5, 12, 7);
  const VIEW_H = 7.5;
  const look = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const textures = [envTex];

  // ---------- pembuat bentuk ----------
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${JSON.stringify(o)}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1, ...o }));
    return mats.get(key);
  };
  const own = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1, ...o }); // material yang dianimasikan
  const mesh = (geo, m) => new THREE.Mesh(geo, m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
  const rbox = (w, h, d, r, m) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
  const cyl = (rt, rb, h, m, seg = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  // silinder dari titik a ke b (pipa, batang, tiang miring)
  const rod = (a, b, r, m, seg = 12) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const o = cyl(r, r, dir.length(), m, seg);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return o;
  };
  const canvasTex = (w, h, draw) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.push(t);
    return { t, ctx, cv };
  };

  const active = {}; // nama area → material yang diberi emissive amber saat babaknya aktif
  const mark = (name, ...ms) => { active[name] = (active[name] ?? []).concat(ms); };

  // ---------- lantai beton + garis lorong forklift ----------
  const floorTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#171c1f'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    ctx.strokeStyle = '#0f1316'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, w, h);
  }).t;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(23, 7);
  const floor = mesh(new THREE.PlaneGeometry(46, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(at(floor, -2, 0, 0));
  for (const dz of [-0.62, 0.62]) {
    const line = mesh(new THREE.PlaneGeometry(FORK.melting - FORK.warehouse + 2.4, 0.06), mat(C.aisle, { roughness: 0.6 }));
    line.rotation.x = -Math.PI / 2;
    scene.add(at(line, (FORK.melting + FORK.warehouse) / 2 + 0.2, 0.004, FORK.z + dz));
  }

  // ---------- palet kayu + karung (dipakai rak dan forklift) ----------
  const sackGeo = new RoundedBoxGeometry(SACK.w, SACK.h, SACK.d, 2, 0.05);
  const sackMat = mat(C.sack, { roughness: 0.95 });
  function pallet(nSacks) {
    const g = new THREE.Group();
    const wood = mat(C.wood, { roughness: 0.9 });
    for (let i = 0; i < 5; i++) g.add(at(box(0.98, 0.025, 0.14, wood), 0, 0.125, -0.42 + i * 0.21));
    for (const dz of [-0.42, 0, 0.42]) g.add(at(box(0.98, 0.09, 0.1, wood), 0, 0.065, dz));
    for (const dx of [-0.42, 0.42]) g.add(at(box(0.12, 0.02, 0.98, wood), dx, 0.01, 0));
    const sacks = new THREE.InstancedMesh(sackGeo, sackMat, 12);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < 12; i++) {
      const layer = Math.floor(i / 4), k = i % 4;
      const turn = layer % 2 ? Math.PI / 2 : 0; // lapis selang-seling seperti tumpukan karung asli
      o.position.set((k % 2 - 0.5) * 0.46, 0.14 + SACK.h / 2 + layer * (SACK.h + 0.005), (Math.floor(k / 2) - 0.5) * 0.44);
      o.rotation.set(0, turn + ((i * 37) % 7 - 3) * 0.015, 0);
      o.updateMatrix();
      sacks.setMatrixAt(i, o.matrix);
      sacks.setColorAt(i, col.set(i % 3 === 1 ? C.kraft : C.sack));
    }
    sacks.count = Math.min(12, nSacks);
    g.add(sacks);
    g.userData.sacks = sacks;
    return g;
  }

  // ---------- kantor planning ----------
  const office = new THREE.Group();
  office.position.copy(OFFICE);
  const deskMat = own(C.desk, { roughness: 0.6 });
  office.add(at(box(1.9, 0.05, 0.85, deskMat), 0, 0.76, 0));
  const legMat = mat(C.steelDark, { metalness: 0.6, roughness: 0.4 });
  for (const dx of [-0.88, 0.88]) {
    office.add(at(box(0.05, 0.74, 0.05, legMat), dx, 0.37, 0), at(box(0.06, 0.03, 0.75, legMat), dx, 0.015, 0));
  }
  office.add(at(box(1.7, 0.4, 0.02, mat(0x2a3135)), 0, 0.5, -0.38));
  mark('desk', deskMat);

  // monitor besar: layar plan produksi (CanvasTexture dari data shift)
  const screen = canvasTex(1024, 600, () => {});
  const mon = new THREE.Group();
  mon.add(at(box(0.32, 0.02, 0.22, legMat), 0, 0.79, 0), at(box(0.05, 0.36, 0.04, legMat), 0, 0.97, -0.03));
  mon.add(at(rbox(1.2, 0.72, 0.05, 0.015, mat(0x111416, { roughness: 0.4, metalness: 0.3 })), 0, 1.34, 0));
  const screenMesh = mesh(new THREE.PlaneGeometry(1.14, 0.665), new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false }));
  mon.add(at(screenMesh, 0, 1.34, 0.027));
  mon.position.set(-0.05, 0, -0.18);
  mon.rotation.y = 0.45;
  office.add(mon);
  const kb = at(box(0.48, 0.02, 0.16, mat(0x22282b, { roughness: 0.5 })), 0.05, 0.79, 0.16);
  kb.rotation.y = 0.45;
  office.add(kb, at(rbox(0.06, 0.03, 0.1, 0.012, mat(0x22282b)), 0.42, 0.79, 0.1));
  office.add(at(box(0.22, 0.48, 0.48, mat(0x1e2427, { metalness: 0.4, roughness: 0.45 })), -0.62, 0.25, -0.12)); // PC
  // kursi kantor
  const chair = new THREE.Group();
  const chairMat = mat(0x1d2124, { roughness: 0.85 });
  chair.add(at(rbox(0.5, 0.08, 0.48, 0.03, chairMat), 0, 0.48, 0), at(rbox(0.48, 0.55, 0.07, 0.03, chairMat), 0, 0.8, 0.24));
  chair.add(at(cyl(0.03, 0.03, 0.38, legMat), 0, 0.27, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    chair.add(rod(new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3), 0.018, legMat, 6));
  }
  office.add(at(chair, 0.05, 0, 0.75));
  // lemari samping + printer bon
  office.add(at(box(0.6, 0.7, 0.5, mat(0x4a5459)), 1.35, 0.35, 0.05));
  office.add(at(rbox(0.46, 0.22, 0.38, 0.03, mat(C.panel, { roughness: 0.5 })), 1.35, 0.81, 0.05));
  office.add(at(box(0.3, 0.012, 0.05, mat(0x15181a)), 1.35, 0.86, 0.25));
  const bonPaper = at(box(0.21, 0.005, 0.3, mat(C.paper, { roughness: 0.9 })), 1.35, 0.865, 0.1);
  const stamp = new THREE.Group();
  stamp.add(cyl(0.035, 0.035, 0.1, mat(0x2a2f33)), at(cyl(0.055, 0.055, 0.03, mat(C.amber, { roughness: 0.5 })), 0, -0.06, 0));
  office.add(bonPaper, stamp);
  // tanaman kecil
  office.add(at(cyl(0.09, 0.07, 0.16, mat(0x50585c)), -0.78, 0.86, -0.25));
  office.add(at(mesh(new THREE.IcosahedronGeometry(0.14, 0), mat(0x3f6b4f, { roughness: 0.9, flatShading: true })), -0.78, 1.02, -0.25));
  scene.add(office);

  // ---------- warehouse: rak palet ----------
  const rack = new THREE.Group();
  const uprightMat = mat(C.rackUpright, { metalness: 0.5, roughness: 0.5 });
  const beamMat = mat(C.rackBeam, { metalness: 0.4, roughness: 0.5 });
  for (const dx of [-1.25, 0, 1.25]) for (const dz of [-0.5, 0.5]) rack.add(at(box(0.08, 2.6, 0.08, uprightMat), dx, 1.3, dz));
  for (const y of [1.15, 2.3]) for (const dz of [-0.5, 0.5]) rack.add(at(box(2.58, 0.1, 0.06, beamMat), 0, y, dz));
  for (const [x, y] of [[-0.62, 0], [0.62, 0], [-0.62, 1.2], [0.62, 1.2], [-0.62, 2.35]]) rack.add(at(pallet(8), x, y, 0));
  scene.add(at(rack, FORK.warehouse, 0, -1.8));

  // ---------- forklift (menghadap +x) ----------
  const forklift = new THREE.Group();
  const bodyMat = own(C.forklift, { roughness: 0.45, metalness: 0.3 });
  const darkMat = mat(0x22272a, { roughness: 0.6, metalness: 0.4 });
  forklift.add(at(rbox(1.25, 0.5, 0.92, 0.06, bodyMat), -0.15, 0.48, 0));        // sasis
  forklift.add(at(rbox(0.42, 0.62, 0.96, 0.1, darkMat), -0.78, 0.6, 0));         // counterweight
  forklift.add(at(rbox(0.55, 0.12, 0.86, 0.04, bodyMat), -0.32, 0.79, 0));       // kap mesin
  forklift.add(at(rbox(0.38, 0.1, 0.42, 0.04, mat(0x15181a, { roughness: 0.9 })), -0.32, 0.9, 0)); // jok
  forklift.add(at(rbox(0.08, 0.42, 0.42, 0.04, mat(0x15181a, { roughness: 0.9 })), -0.52, 1.12, 0));
  forklift.add(rod(new THREE.Vector3(0.12, 0.75, 0), new THREE.Vector3(0.02, 1.15, 0), 0.025, darkMat));
  const wheel = mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 20), darkMat);
  wheel.rotation.set(0, Math.PI / 2, 0.5);
  forklift.add(at(wheel, 0.0, 1.17, 0));
  const guardMat = mat(0x2a2f33, { metalness: 0.6, roughness: 0.4 });
  for (const [dx, dz] of [[-0.68, -0.42], [-0.68, 0.42], [0.2, -0.42], [0.2, 0.42]]) forklift.add(at(box(0.05, 1.3, 0.05, guardMat), dx, 1.37, dz));
  forklift.add(at(box(0.95, 0.05, 0.9, guardMat), -0.24, 2.03, 0));
  for (let i = 0; i < 4; i++) forklift.add(at(box(0.9, 0.03, 0.03, guardMat), -0.24, 2.06, -0.3 + i * 0.2));
  const beaconMat = own(C.amber, { emissive: C.amber, emissiveIntensity: 0.2, roughness: 0.3 });
  forklift.add(at(cyl(0.06, 0.07, 0.1, beaconMat, 12), -0.6, 2.12, 0));
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false });
  for (const dz of [-0.32, 0.32]) forklift.add(at(cyl(0.04, 0.04, 0.03, lightMat, 10).rotateZ(Math.PI / 2), 0.24, 1.6, dz));
  const wheels = [];
  for (const [dx, dz, r, w] of [[0.3, -0.42, FORK.wheelF, 0.2], [0.3, 0.42, FORK.wheelF, 0.2], [-0.62, -0.4, FORK.wheelR, 0.16], [-0.62, 0.4, FORK.wheelR, 0.16]]) {
    const wg = new THREE.Group();
    const tyre = cyl(r, r, w, mat(C.rubber, { roughness: 0.95 }), 20);
    tyre.rotation.x = Math.PI / 2;
    const hub = cyl(r * 0.55, r * 0.55, w + 0.01, mat(0x8a9196, { metalness: 0.7, roughness: 0.35 }), 6);
    hub.rotation.x = Math.PI / 2;
    wg.add(tyre, hub);
    wg.userData.r = r;
    forklift.add(at(wg, dx, r, dz));
    wheels.push(wg);
  }
  // mast bertingkat + rantai + silinder angkat
  const mastMat = mat(0x2b3034, { metalness: 0.7, roughness: 0.35 });
  for (const dz of [-0.3, 0.3]) forklift.add(at(box(0.07, 2.1, 0.09, mastMat), 0.46, 1.05, dz));
  const innerMast = new THREE.Group();
  for (const dz of [-0.22, 0.22]) innerMast.add(at(box(0.06, 1.9, 0.07, mastMat), 0.52, 0.95, dz));
  innerMast.add(at(box(0.06, 0.08, 0.5, mastMat), 0.52, 1.88, 0));
  forklift.add(innerMast);
  forklift.add(at(cyl(0.045, 0.045, 1.6, mat(0x9aa1a5, { metalness: 0.8, roughness: 0.25 })), 0.42, 0.85, 0));
  const chains = [-0.1, 0.1].map(dz => { const ch = at(box(0.02, 1.4, 0.03, mat(0x111416, { metalness: 0.6 })), 0.5, 1.1, dz); forklift.add(ch); return ch; });
  const carriage = new THREE.Group();
  carriage.add(at(box(0.06, 0.38, 0.86, mastMat), 0.6, 0.2, 0));
  for (let i = 0; i < 6; i++) carriage.add(at(box(0.03, 0.55, 0.03, mastMat), 0.6, 0.66, -0.38 + i * 0.152)); // backrest
  carriage.add(at(box(0.03, 0.03, 0.86, mastMat), 0.6, 0.93, 0));
  for (const dz of [-0.25, 0.25]) {
    carriage.add(at(box(0.05, 0.42, 0.11, mastMat), 0.64, 0.21, dz));
    carriage.add(at(box(1.05, 0.04, 0.11, mastMat), 1.15, 0.02, dz));
  }
  const fkPallet = pallet(12);
  carriage.add(at(fkPallet, 1.2, 0.04, 0));
  forklift.add(carriage);
  scene.add(forklift);

  // karung yang dipindah dari palet ke meja (babak 5)
  const hop = [0, 1, 2].map(() => { const m = mesh(sackGeo, sackMat); scene.add(m); return m; });

  // ---------- meja material + kompartemen ----------
  const mejaTopMat = own(0x4a5459, { metalness: 0.5, roughness: 0.4 });
  scene.add(at(box(2.7, 0.08, 1.1, mejaTopMat), MEJA.x, 0.85, MEJA.z));
  for (const [dx, dz] of [[-1.25, -0.45], [1.25, -0.45], [-1.25, 0.45], [1.25, 0.45]]) scene.add(at(box(0.07, 0.85, 0.07, legMat), MEJA.x + dx, 0.425, MEJA.z + dz));
  mark('meja', mejaTopMat);
  const binsGroup = new THREE.Group();
  scene.add(binsGroup);
  let bins = [];

  // ---------- stasiun tungku induksi ----------
  const furnace = new THREE.Group();
  furnace.position.copy(FC);
  const steel = mat(C.steel, { metalness: 0.6, roughness: 0.45 });
  const steelDark = mat(C.steelDark, { metalness: 0.5, roughness: 0.5 });
  // rangka bawah + kaki
  furnace.add(at(box(1.5, 0.08, 1.5, steel), 0, 0.56, 0));
  for (const dx of [-0.66, 0.66]) for (const dz of [-0.66, 0.66]) furnace.add(at(box(0.12, 0.56, 0.12, steelDark), dx, 0.28, dz));
  // krusibel refraktori + kumparan tembaga + yoke di 4 sudut
  furnace.add(at(cyl(0.5, 0.5, 1.12, mat(C.refractory, { roughness: 1 }), 28), 0, 1.16, 0));
  const coilMat = own(C.copper, { metalness: 0.9, roughness: 0.32, emissive: 0x000000 });
  for (let i = 0; i < 9; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.57, 0.038, 10, 40), coilMat);
    ring.rotation.x = Math.PI / 2;
    furnace.add(at(ring, 0, 0.78 + i * 0.105, 0));
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const yk = box(0.13, 1.06, 0.24, steelDark);
    yk.position.set(Math.cos(a) * 0.69, 1.14, Math.sin(a) * 0.69);
    yk.rotation.y = -a;
    furnace.add(yk);
    for (const y of [0.68, 1.6]) { const b = box(0.02, 0.05, 0.05, steel); b.position.set(Math.cos(a) * 0.76, y, Math.sin(a) * 0.76); furnace.add(b); }
  }
  // dek atas dengan mulut bundar
  const deckShape = new THREE.Shape();
  deckShape.moveTo(-0.8, -0.8); deckShape.lineTo(0.8, -0.8); deckShape.lineTo(0.8, 0.8); deckShape.lineTo(-0.8, 0.8); deckShape.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.47, 0, Math.PI * 2, true); deckShape.holes.push(hole);
  const deckGeo = new THREE.ExtrudeGeometry(deckShape, { depth: 0.1, bevelEnabled: false, curveSegments: 32 });
  deckGeo.rotateX(-Math.PI / 2);
  const deckMat = own(C.steel, { metalness: 0.6, roughness: 0.45 });
  furnace.add(at(mesh(deckGeo, deckMat), 0, DECK_Y - 0.1, 0));
  mark('furnace', deckMat);
  const mouthRing = mesh(new THREE.TorusGeometry(0.47, 0.055, 10, 40), mat(0xc9c2b4, { roughness: 1 }));
  mouthRing.rotation.x = Math.PI / 2;
  furnace.add(at(mouthRing, 0, DECK_Y + 0.02, 0));
  const moltenMat = new THREE.MeshBasicMaterial({ color: C.molten, toneMapped: false });
  const molten = mesh(new THREE.CircleGeometry(0.44, 32), moltenMat);
  molten.rotation.x = -Math.PI / 2;
  furnace.add(at(molten, 0, DECK_Y - 0.03, 0));
  const glow = new THREE.PointLight(0xff8a2a, 2.5, 3.5, 1.6);
  furnace.add(at(glow, 0, DECK_Y + 0.5, 0));
  for (const dz of [-0.62, 0.62]) furnace.add(at(box(1.5, 0.05, 0.06, steelDark), -0.05, DECK_Y + 0.025, dz)); // rel tutup
  // corong tuang + tiang poros miring
  const spout = new THREE.Group();
  spout.add(at(box(0.6, 0.08, 0.28, steel), 0.3, 0, 0), at(box(0.58, 0.02, 0.14, mat(0x2a2522, { roughness: 1 })), 0.3, 0.045, 0));
  spout.position.set(0.72, DECK_Y - 0.02, 0);
  spout.rotation.z = -0.07;
  furnace.add(spout);
  for (const dz of [-0.55, 0.55]) {
    furnace.add(at(box(0.18, 1.78, 0.16, steelDark), 1.12, 0.89, dz), at(box(0.34, 0.04, 0.3, steel), 1.12, 0.02, dz));
  }
  const pin = cyl(0.05, 0.05, 1.3, steel);
  pin.rotation.x = Math.PI / 2;
  furnace.add(at(pin, 1.12, DECK_Y - 0.08, 0));
  // tutup (robuta): kap berusuk, berengsel di belakang mulut, dibuka saat charging
  const lid = new THREE.Group();
  lid.position.set(-0.78, DECK_Y + 0.06, 0);
  const lidBody = new THREE.Group();
  lidBody.add(at(rbox(1.2, 0.14, 1.12, 0.03, mat(0x7a8388, { metalness: 0.55, roughness: 0.4 })), 0.62, 0.07, 0));
  lidBody.add(at(cyl(0.42, 0.42, 0.07, mat(C.refractory, { roughness: 1 }), 28), 0.78, -0.02, 0));
  for (let i = 0; i < 4; i++) lidBody.add(at(box(0.06, 0.07, 1.06, steelDark), 0.2 + i * 0.3, 0.17, 0));
  lidBody.add(rod(new THREE.Vector3(1.24, 0.08, -0.25), new THREE.Vector3(1.24, 0.08, 0.25), 0.02, steel));
  lid.add(lidBody);
  for (const dz of [-0.45, 0.45]) lid.add(at(cyl(0.05, 0.05, 0.12, steel).rotateX(Math.PI / 2), 0, 0.03, dz));
  furnace.add(lid);
  // silinder hidrolik penggerak miring + tuas siku di lantai
  const hyd = mat(0x3d4549, { metalness: 0.6, roughness: 0.4 });
  const chrome = mat(0xc4cacd, { metalness: 0.9, roughness: 0.2 });
  furnace.add(rod(new THREE.Vector3(-1.95, 0.32, 0.45), new THREE.Vector3(-1.35, 0.42, 0.45), 0.08, hyd));
  furnace.add(rod(new THREE.Vector3(-1.35, 0.42, 0.45), new THREE.Vector3(-1.02, 0.47, 0.45), 0.035, chrome));
  furnace.add(at(box(0.2, 0.3, 0.16, steelDark), -1.98, 0.17, 0.45), at(box(0.22, 0.52, 0.12, steelDark), -0.98, 0.26, 0.45));
  furnace.add(rod(new THREE.Vector3(-0.98, 0.5, 0.45), new THREE.Vector3(-0.72, 0.95, 0.45), 0.035, steel));
  // selang berpendingin air dari rak kapasitor ke terminal kumparan
  const hoseMat = mat(0x30373b, { roughness: 0.55, metalness: 0.35 });
  for (const dz of [-0.08, 0.08]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.5, 0.35, -1.5 + dz), new THREE.Vector3(-1.0, 0.12, -1.1 + dz),
      new THREE.Vector3(-0.55, 0.3, -0.85 + dz), new THREE.Vector3(-0.4, 0.95 + dz, -0.68),
    ]);
    furnace.add(mesh(new THREE.TubeGeometry(curve, 40, 0.04, 8, false), hoseMat));
  }
  furnace.add(at(box(0.22, 0.32, 0.14, mat(C.copper, { metalness: 0.85, roughness: 0.35 })), -0.4, 1.0, -0.66));
  // platform operator berpagar + lemari kontrol + rak kapasitor
  furnace.add(at(box(3.0, 0.08, 1.4, mat(0x4a5459, { metalness: 0.5, roughness: 0.55 })), -0.65, 1.0, -1.9));
  for (const dx of [-2.05, -0.65, 0.75]) for (const dz of [-2.5, -1.3]) furnace.add(at(cyl(0.04, 0.04, 1.0, steelDark), dx, 0.5, dz));
  const railMat = mat(0x8a9196, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i <= 5; i++) furnace.add(at(box(0.035, 1.0, 0.035, railMat), -2.1 + i * 0.57, 1.54, -2.57));
  for (const y of [1.55, 2.02]) furnace.add(at(box(2.9, 0.035, 0.035, railMat), -0.65, y, -2.57), at(box(0.035, 0.035, 1.25, railMat), -2.12, y, -1.95));
  for (let i = 0; i <= 2; i++) furnace.add(at(box(0.035, 1.0, 0.035, railMat), -2.12, 1.54, -2.55 + i * 0.6));
  const capMat = mat(0xd9dcdd, { roughness: 0.45, metalness: 0.2 });
  for (let i = 0; i < 8; i++) furnace.add(at(cyl(0.09, 0.09, 0.5, capMat, 16), -1.75 + (i % 4) * 0.24, 0.3, -2.05 + Math.floor(i / 4) * 0.28));
  furnace.add(at(box(1.1, 0.04, 0.7, steelDark), -1.4, 0.03, -1.9));
  // lemari kontrol: layar kW/Hz, tombol, kenop, kisi ventilasi
  const cab = new THREE.Group();
  cab.add(at(rbox(0.78, 1.3, 0.46, 0.03, mat(C.panel, { roughness: 0.55, metalness: 0.15 })), 0, 0.65, 0));
  cab.add(at(box(0.82, 0.05, 0.5, mat(0xbfc3c4)), 0, 1.32, 0));
  const panelTex = canvasTex(256, 128, (ctx) => {
    ctx.fillStyle = '#0b0d0e'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffb347'; ctx.font = '600 44px ui-monospace, Consolas, monospace'; ctx.textAlign = 'right';
    ctx.fillText('650 kW', 240, 52); ctx.fillText('1000 Hz', 240, 112);
  }).t;
  cab.add(at(mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false })), -0.17, 1.05, 0.232));
  for (const [x, c] of [[0.1, C.ok], [0.18, C.danger], [0.26, 0x9aa1a5]]) cab.add(at(cyl(0.025, 0.025, 0.03, mat(c, { roughness: 0.4 }), 12).rotateX(Math.PI / 2), x, 1.08, 0.24));
  cab.add(at(cyl(0.05, 0.05, 0.04, mat(0x2a2f33, { metalness: 0.5 }), 16).rotateX(Math.PI / 2), 0.15, 0.88, 0.24));
  cab.add(at(box(0.02, 0.3, 0.03, mat(0x8a9196, { metalness: 0.7 })), 0.33, 0.75, 0.245));
  for (let i = 0; i < 6; i++) cab.add(at(box(0.5, 0.012, 0.01, mat(0x9aa1a5)), -0.08, 0.32 + i * 0.05, 0.236));
  // tiang lampu menara: hijau (normal), amber (charging), puncak = warna shift
  cab.add(at(cyl(0.02, 0.02, 0.45, steel), 0.25, 1.57, 0));
  const stackGreen = own(C.ok, { emissive: C.ok, emissiveIntensity: 0.6, roughness: 0.3 });
  const stackAmber = own(C.amber, { emissive: C.amber, emissiveIntensity: 0.1, roughness: 0.3 });
  const shiftLamp = own(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.3 });
  cab.add(at(cyl(0.055, 0.055, 0.09, stackGreen, 16), 0.25, 1.84, 0), at(cyl(0.055, 0.055, 0.09, stackAmber, 16), 0.25, 1.94, 0));
  cab.add(at(cyl(0.055, 0.055, 0.11, shiftLamp, 16), 0.25, 2.05, 0), at(cyl(0.03, 0.055, 0.03, mat(0x2a2f33), 16), 0.25, 2.12, 0));
  furnace.add(at(cab, -1.25, 1.04, -2.15));
  // ladle di bawah corong + kait crane
  const ladle = new THREE.Group();
  const ladleMat = mat(0x3a4044, { metalness: 0.5, roughness: 0.55 });
  ladle.add(at(mesh(new THREE.CylinderGeometry(0.38, 0.31, 0.82, 28, 1, true), ladleMat), 0, 0.45, 0));
  ladle.add(at(cyl(0.31, 0.31, 0.04, ladleMat, 28), 0, 0.05, 0));
  ladle.add(at(mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.7, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1a19, side: THREE.BackSide, roughness: 1 })), 0, 0.5, 0));
  const rim = mesh(new THREE.TorusGeometry(0.38, 0.04, 8, 32), ladleMat);
  rim.rotation.x = Math.PI / 2;
  ladle.add(at(rim, 0, 0.86, 0));
  for (const dz of [-0.42, 0.42]) ladle.add(at(cyl(0.06, 0.06, 0.1, steel).rotateX(Math.PI / 2), 0, 0.55, dz));
  const cable = mat(0x1b1f22, { metalness: 0.6 });
  ladle.add(at(rbox(0.3, 0.32, 0.2, 0.04, mat(C.amber, { roughness: 0.5 })), 0, 2.55, 0));
  for (const dz of [-0.42, 0.42]) ladle.add(rod(new THREE.Vector3(0, 2.4, dz * 0.25), new THREE.Vector3(0, 0.6, dz), 0.012, cable, 6));
  for (const dz of [-0.06, 0.06]) ladle.add(rod(new THREE.Vector3(0, 2.7, dz), new THREE.Vector3(0, 4.6, dz), 0.012, cable, 6));
  furnace.add(at(ladle, 1.85, 0, 0));
  furnace.add(at(box(1.05, 0.03, 1.05, mat(0x22272a, { roughness: 0.9 })), 1.85, 0.015, 0));
  scene.add(furnace);
  const MOUTH = FC.clone().setY(DECK_Y + 0.15);
  const flowGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const flowMat = mat(C.steelLight, { roughness: 0.6 });
  const flow = Array.from({ length: 9 }, () => { const m = mesh(flowGeo, flowMat); scene.add(m); return m; });

  // ---------- tablet aplikasi produksi + monitor MatPrep ----------
  scene.add(at(box(0.05, 1.1, 0.05, legMat), TABLET.x, 0.55, TABLET.z), at(box(0.32, 0.03, 0.32, legMat), TABLET.x, 0.015, TABLET.z));
  const tablet = new THREE.Group();
  tablet.position.set(TABLET.x, 1.25, TABLET.z + 0.05);
  tablet.rotation.set(-0.35, 0.5, 0);
  const tabletMat = own(0x22282b, { roughness: 0.4, metalness: 0.3 });
  tablet.add(rbox(0.62, 0.44, 0.04, 0.03, tabletMat));
  const tabletScreen = canvasTex(512, 360, () => {});
  const tabletMesh = mesh(new THREE.PlaneGeometry(0.56, 0.38), new THREE.MeshBasicMaterial({ map: tabletScreen.t, toneMapped: false }));
  tablet.add(at(tabletMesh, 0, 0, 0.022));
  scene.add(tablet);
  mark('tablet', tabletMat);

  scene.add(at(box(0.06, 1.2, 0.06, legMat), MONITOR.x, 0.6, MONITOR.z), at(box(0.4, 0.03, 0.3, legMat), MONITOR.x, 0.015, MONITOR.z));
  const monitorMat = own(0x22282b, { roughness: 0.4, metalness: 0.3 });
  const monitor = at(rbox(1.08, 0.68, 0.06, 0.02, monitorMat), MONITOR.x, 1.45, MONITOR.z);
  monitor.rotation.y = 0.35;
  const monitorScreen = mesh(new THREE.PlaneGeometry(0.98, 0.58), new THREE.MeshBasicMaterial({ color: C.screenBg, toneMapped: false }));
  monitor.add(at(monitorScreen, 0, 0, 0.032));
  scene.add(monitor);
  mark('monitor', monitorMat);
  let monitorBars = [];

  const signal = mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false }));
  scene.add(signal);

  scene.traverse(o => {
    if (!o.isMesh || o.material.isMeshBasicMaterial) return;
    o.castShadow = shadows;
    o.receiveShadow = shadows;
  });
  floor.castShadow = false;
  for (const ms of Object.values(active)) for (const m of ms) { m.userData.base = m.emissive.clone(); m.userData.baseI = m.emissiveIntensity; }

  // ---------- layar (CanvasTexture) ----------
  const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
  let d = data, screenKind = null, tabletKind = null;
  function drawScreen(kind) {
    const { ctx } = screen, S = d.screen, W = 1024, H = 600;
    ctx.fillStyle = '#0e1214'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#14191c'; ctx.fillRect(0, 0, W, 78);
    ctx.fillStyle = '#f0a32a'; ctx.fillRect(28, 24, 30, 30);
    ctx.fillStyle = '#090b0c'; ctx.font = `700 17px ${FONT}`; ctx.fillText('MP', 30, 45);
    ctx.fillStyle = '#ece9e2'; ctx.font = `600 30px ${FONT}`;
    ctx.fillText(kind === 'plan' ? 'Plan Produksi' : kind === 'saran' ? 'Saran Pengebonan' : 'Bon Material', 74, 50);
    ctx.font = `600 22px ${FONT}`; ctx.fillStyle = S.shift === 'Red' ? '#eb6a5f' : '#ece9e2';
    ctx.textAlign = 'right'; ctx.fillText(`Shift ${S.shift}`, W - 30, 48); ctx.textAlign = 'left';
    const row = (y, cells) => cells.forEach(([x, txt, style = {}]) => {
      ctx.font = `${style.w ?? 500} ${style.s ?? 24}px ${FONT}`; ctx.fillStyle = style.c ?? '#b3bbbe';
      ctx.textAlign = style.a ?? 'left'; ctx.fillText(txt, x, y); ctx.textAlign = 'left';
    });
    if (kind === 'plan') {
      row(122, [[40, 'PRODUK', { s: 16, c: '#808a8e', w: 600 }], [440, 'LOT KECIL', { s: 16, c: '#808a8e', w: 600, a: 'right' }], [640, 'LOT BESAR', { s: 16, c: '#808a8e', w: 600, a: 'right' }], [990, 'PCS', { s: 16, c: '#808a8e', w: 600, a: 'right' }]]);
      const max = Math.max(1, ...S.plan.map(x => x.lotKecil));
      S.plan.forEach((x, i) => {
        const y = 175 + i * 82;
        ctx.fillStyle = x.color; ctx.fillRect(40, y - 26, 12, 34);
        row(y, [[66, x.p, { w: 700, s: 30, c: '#ece9e2' }], [440, fmtNum(x.lotKecil), { w: 700, s: 34, c: '#ece9e2', a: 'right' }], [640, fmtNum(x.lotBesar), { s: 28, a: 'right' }], [990, fmtNum(x.pcs), { s: 28, a: 'right' }]]);
        ctx.fillStyle = '#22292d'; ctx.fillRect(66, y + 16, 900, 8);
        ctx.fillStyle = x.color; ctx.fillRect(66, y + 16, 900 * (x.lotKecil / max), 8);
      });
      ctx.fillStyle = '#1b2125'; ctx.fillRect(0, H - 70, W, 70);
      row(H - 26, [[40, 'Total', { s: 22, c: '#959ea2', w: 600 }], [640, `${fmtNum(S.total.lotBesar)} lot besar`, { s: 26, c: '#ece9e2', w: 700, a: 'right' }], [990, `${fmtNum(S.total.pcs)} pcs`, { s: 26, c: '#ece9e2', w: 700, a: 'right' }]]);
    } else if (kind === 'saran') {
      row(122, [[40, 'MATERIAL', { s: 16, c: '#808a8e', w: 600 }], [700, 'SARAN', { s: 16, c: '#808a8e', w: 600, a: 'right' }], [990, 'KARUNG', { s: 16, c: '#808a8e', w: 600, a: 'right' }]]);
      S.saran.forEach((x, i) => {
        const y = 172 + i * 76;
        row(y, [[40, x.material, { w: 600, s: 28, c: '#ece9e2' }], [700, `${fmtNum(x.kg)} kg`, { w: 700, s: 30, c: '#ece9e2', a: 'right' }], [990, `${fmtNum(x.karung)} krg`, { s: 28, c: '#f0a32a', w: 700, a: 'right' }]]);
        ctx.fillStyle = '#1b2125'; ctx.fillRect(40, y + 22, 950, 2);
      });
      if (!S.saran.length) row(200, [[40, 'Stok cukup, tidak ada saran bon', { s: 28 }]]);
    } else {
      row(170, [[40, 'Total bon', { s: 24, c: '#959ea2', w: 600 }]]);
      row(250, [[40, `${fmtNum(S.bon.kg)} kg`, { s: 76, c: '#ece9e2', w: 700 }]]);
      row(320, [[40, `${fmtNum(S.bon.karung)} karung · ${S.bon.materials} material`, { s: 30, c: '#b3bbbe' }]]);
      row(380, [[40, S.bon.delta ? `${S.bon.delta > 0 ? '+' : ''}${fmtNum(S.bon.delta)} karung disesuaikan operator` : 'Sesuai saran', { s: 26, c: S.bon.delta ? '#f0a32a' : '#4dbe8a', w: 600 }]]);
      ctx.fillStyle = '#4dbe8a'; ctx.fillRect(40, 440, 260, 64);
      row(482, [[66, 'BON TERSIMPAN', { s: 24, c: '#090b0c', w: 700 }]]);
      row(482, [[990, 'Cetak → gudang', { s: 24, c: '#959ea2', a: 'right' }]]);
    }
    screen.t.needsUpdate = true;
  }
  function drawTablet(kind) {
    const { ctx } = tabletScreen, W = 512, H = 360;
    ctx.fillStyle = '#10161b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1f3a52'; ctx.fillRect(0, 0, W, 56);
    ctx.fillStyle = '#ece9e2'; ctx.font = `600 24px ${FONT}`; ctx.fillText('Aplikasi Produksi', 20, 37);
    const rows = d.inputRows ?? [];
    rows.forEach(([m, kg], i) => {
      const y = 108 + i * 62;
      ctx.fillStyle = '#b3bbbe'; ctx.font = `500 22px ${FONT}`; ctx.fillText(m, 20, y);
      ctx.fillStyle = '#1b2125'; ctx.fillRect(250, y - 30, 240, 42);
      ctx.fillStyle = '#ece9e2'; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(`${fmtNum(Math.round(kg))} kg`, 478, y); ctx.textAlign = 'left';
    });
    ctx.fillStyle = kind === 'sent' ? '#4dbe8a' : '#f0a32a'; ctx.fillRect(20, H - 70, W - 40, 50);
    ctx.fillStyle = '#090b0c'; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(kind === 'sent' ? 'Terkirim ke MatPrep ✓' : 'Kirim pemakaian', W / 2, H - 37); ctx.textAlign = 'left';
    tabletScreen.t.needsUpdate = true;
  }

  function setData(next) {
    d = next;
    screenKind = tabletKind = null; // gambar ulang layar di setTime berikutnya
    for (const b of bins) { b.shell.geometry.dispose(); b.fill.geometry.dispose(); b.fill.material.dispose(); }
    binsGroup.clear();
    for (const m of monitorBars) { m.geometry.dispose(); m.material.dispose(); monitor.remove(m); }
    const n = next.bars.length, cols = Math.min(BIN.cols, Math.max(1, n)), rows = Math.ceil(n / cols);
    const shellMat = mat(0x22292e, { transparent: true, opacity: 0.55, metalness: 0.4 });
    bins = next.bars.map((bar, i) => {
      const cx = MEJA.x + ((i % cols) - (cols - 1) / 2) * (BIN.w + 0.06);
      const cz = MEJA.z + (Math.floor(i / cols) - (rows - 1) / 2) * (BIN.d + 0.08);
      const shell = at(box(BIN.w, BIN.h, BIN.d, shellMat), cx, 0.89 + BIN.h / 2, cz);
      const fill = box(BIN.w - 0.05, BIN.h - 0.04, BIN.d - 0.05, own(C.steelLight, { roughness: 0.9 }));
      fill.geometry.translate(0, (BIN.h - 0.04) / 2, 0);
      fill.castShadow = fill.receiveShadow = shadows;
      binsGroup.add(shell, at(fill, cx, 0.91, cz));
      return { bar, shell, fill };
    });
    const gap = n > 1 ? 0.8 / (n - 1) : 0;
    monitorBars = next.bars.map((_, i) => {
      const m = mesh(new THREE.PlaneGeometry(0.06, 0.4), new THREE.MeshBasicMaterial({ color: C.steelLight, toneMapped: false }));
      m.geometry.translate(0, 0.2, 0);
      monitor.add(at(m, n > 1 ? -0.4 + i * gap : 0, -0.24, 0.034));
      return m;
    });
    fkPallet.userData.sacks.count = next.palletSacks;
  }
  setData(data);

  // ---------- pose(t) ----------
  function forkX(i, l) {
    if (i < 3) return FORK.warehouse;
    if (i === 3) return lerp(FORK.warehouse, FORK.melting, smooth(seg(l, 0.12, 0.92)));
    if (i < 8) return FORK.melting;
    return lerp(FORK.melting, FORK.warehouse, smooth(seg(l, 0.1, 0.95)));
  }
  const camTarget = (i, l) => CAM[i] ?? { x: forkX(i, l) + 0.4, z: FORK.z - 0.3, zoom: 1.3 };
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

    // kantor: layar berganti plan → saran → bon; printer mengeluarkan bon lalu distempel
    const kind = i === 1 ? 'saran' : i === 2 ? 'bon' : 'plan';
    if (kind !== screenKind) { screenKind = kind; drawScreen(kind); }
    bonPaper.visible = stamp.visible = i === 2;
    bonPaper.position.x = 1.35 + 0.34 * easeOut(seg(l, 0.05, 0.45));
    stamp.position.set(1.69, 0.95 + 0.3 * Math.abs(Math.cos(Math.PI * seg(l, 0.5, 0.85))), 0.1);

    // forklift: jalan, roda berputar, beacon berkedip saat bergerak, garpu naik saat membawa
    const fx = forkX(i, l);
    forklift.position.set(fx, 0, FORK.z);
    for (const w of wheels) w.rotation.z = -(fx - FORK.warehouse) / w.userData.r;
    const moving = (i === 3 && l > 0.12 && l < 0.92) || (i === 8 && l > 0.1 && l < 0.95);
    beaconMat.emissiveIntensity = moving ? (Math.sin(sec * 9) > 0 ? 1.4 : 0.15) : 0.2;
    const lift = i === 3 ? 0.28 * (seg(l, 0, 0.12) - seg(l, 0.92, 1)) : 0;
    carriage.position.y = 0.12 + lift;
    innerMast.position.y = lift * 0.5;
    for (const ch of chains) ch.position.y = 1.1 + lift * 0.5;
    const sacks = i <= 3 ? d.palletSacks : i === 4 ? Math.round(d.palletSacks * (1 - seg(l, 0.1, 0.85))) : 0;
    fkPallet.userData.sacks.count = sacks;

    v1.set(FORK.melting + 1.2, 1, FORK.z);
    v2.set((FORK.melting + MEJA.x) / 2 + 0.3, 2.0, (FORK.z + MEJA.z) / 2);
    hop.forEach((m, k) => {
      m.visible = i === 4 && l > 0.08 && l < 0.88;
      if (!m.visible) return;
      const p = (l * 3 + k / 3) % 1;
      bez(m.position, v1, v2, v3.set(MEJA.x - 0.6 + k * 0.6, 1.2, MEJA.z), p);
      m.rotation.set(0, p * 1.2, p * 0.8);
    });

    for (const b of bins) {
      b.fill.scale.y = Math.max(0.02, level(b.bar, i, l, true));
      b.fill.material.color.set(b.bar.low && (i > 5 || (i === 5 && l > 0.6)) ? C.danger : C.steelLight);
    }
    monitorBars.forEach((m, k) => {
      const bar = d.bars[k];
      m.scale.y = Math.max(0.03, level(bar, i, l, false));
      m.material.color.set(bar.low && (i > 7 || (i === 7 && l > 0.6)) ? C.danger : C.steelLight);
    });
    monitorScreen.material.color.set(i === 7 ? 0x152430 : C.screenBg);

    // tungku: tutup terbuka saat charging (babak 6), material masuk ke mulut, kumparan & cairan menyala
    const lidOpen = i === 5 ? smooth(seg(l, 0, 0.15)) * (1 - smooth(seg(l, 0.88, 1))) : 0;
    lid.rotation.z = lidOpen * 1.15;
    v1.set(MEJA.x + 1.0, 1.25, MEJA.z);
    v2.set((MEJA.x + FC.x) / 2 + 0.6, 3.0, (MEJA.z + FC.z) / 2);
    flow.forEach((m, k) => {
      m.visible = i === 5 && l > 0.15 && l < 0.85;
      if (m.visible) { bez(m.position, v1, v2, MOUTH, (l * 2.4 + k / flow.length) % 1); m.rotation.set(k, l * 9, k * 2); }
    });
    const heat = i === 5 ? 0.6 + 0.4 * Math.sin(sec * 5) ** 2 : 0.35;
    moltenMat.color.setRGB(0.95, 0.42 + 0.2 * heat, 0.1 + 0.06 * heat);
    glow.intensity = 0.6 + 1.1 * heat * (i === 5 ? 1 + 0.5 * lidOpen : 0.5);
    coilMat.emissive.setRGB(0.25 * heat, 0.08 * heat, 0);
    stackAmber.emissiveIntensity = i === 5 ? (Math.sin(sec * 6) > 0 ? 1.2 : 0.1) : 0.1;

    // tablet produksi: baris input terisi lalu "Kirim"; sinyal ke monitor MatPrep di babak 8
    const tKind = i === 7 || (i === 6 && l > 0.82) ? 'sent' : 'form';
    if (tKind !== tabletKind) { tabletKind = tKind; drawTablet(tKind); }
    signal.visible = i === 7 && l < 0.45;
    if (signal.visible) {
      v1.set(TABLET.x, 1.35, TABLET.z);
      v3.set(MONITOR.x, 1.5, MONITOR.z);
      v2.copy(v1).lerp(v3, 0.5).setY(2.8);
      bez(signal.position, v1, v2, v3, easeOut(seg(l, 0, 0.4)));
    }

    // lampu menara: puncak berganti warna shift saat tutup shift
    shiftLamp.color.copy(SHIFT_COL[d.shiftFrom] ?? SHIFT_COL.Red).lerp(SHIFT_COL[d.shiftTo] ?? SHIFT_COL.White, i === 8 ? smooth(seg(l, 0.3, 0.7)) : 0);
    shiftLamp.emissive.copy(shiftLamp.color);

    const ACTIVE = ['desk', 'desk', 'desk', null, 'meja', 'furnace', 'tablet', 'monitor', null];
    for (const [name, ms] of Object.entries(active)) {
      const on = ACTIVE[i] === name;
      for (const m of ms) { m.emissive.copy(on ? AMBER : m.userData.base); m.emissiveIntensity = on ? 0.16 : m.userData.baseI; }
    }

    // kamera: dari target babak sebelumnya ke babak ini dalam 0,8 detik pertama; matahari ikut
    const p = camTarget((i + BEATS.length - 1) % BEATS.length, 1), c = camTarget(i, l), k = smooth(clamp01(sec / 0.8));
    look.set(lerp(p.x, c.x, k), 0.9, lerp(p.z, c.z, k));
    camera.zoom = lerp(p.zoom, c.zoom, k);
    camera.position.copy(look).add(CAM_OFF);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    sun.position.copy(look).add(SUN_OFF);
    sun.target.position.copy(look);
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
      for (const t of textures) t.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
