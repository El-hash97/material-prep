import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { effBonFinal, fmtNum } from '../lib/calc';

const IMGS = import.meta.glob('../assets/inokulasi/*.jpg', { eager: true, import: 'default' });
const img = id => IMGS[`../assets/inokulasi/${id}.jpg`];

// Kompartemen meja, kiri→kanan dari sisi operator. `material` = nama material di Pengaturan.
const COMP = [
  { id: 'lmc', material: 'LMC', short: 'LMC', kind: 'granule', size: .009, color: 0x2a292d, cat: 'Inokulan', desc: 'Granul gelap di box kiri depan. Ditimbang sesuai tabel standar sebelum dimasukkan ke ladle.' },
  { id: 'inocarb', material: 'Inocarb', short: 'Inocarb', kind: 'powder', size: .005, color: 0x121212, cat: 'Carbon raiser / pre-conditioner', desc: 'Serbuk karbon (grafit) untuk menaikkan kadar C dan pre-conditioning cairan besi sebelum treatment.' },
  { id: 'antimon', material: 'Antimon (Sb)', short: 'Antimon', kind: 'pebble', size: .018, color: 0xb9b3a2, cat: 'Paduan · pearlite promoter', desc: 'Butiran logam antimon. Dosis sangat kecil untuk menstabilkan perlit dan menekan grafit degenerate.' },
  { id: 'mgdenodul', material: 'Mg Denodule', short: 'Mg Denodul', kind: 'chunk', size: .034, color: 0x3b3e42, cat: 'Nodulizer (FeSiMg)', desc: 'Bongkahan paduan magnesium untuk nodularisasi — membentuk grafit bulat pada besi cor nodular (FCD).' },
  { id: 'ultraseed', material: 'Ultraseed CE Inoculant', short: 'Ultraseed Ce', kind: 'granule', size: .009, color: 0x3a3634, cat: 'Inokulan (FeSi + Ce)', desc: 'Inokulan ferosilikon dengan Cerium, Ca, S dan O. Menambah inti grafit dan mengurangi chill / karbida.' },
  { id: 'sn', material: 'Sn', short: 'Sn', kind: 'pebble', size: .011, color: 0xa59c80, cat: 'Paduan · pearlite promoter', desc: 'Butiran timah. Penstabil perlit untuk menaikkan kekerasan dan kekuatan tarik.' },
  { id: 'cu', material: 'Cu', short: 'Cu', kind: 'stick', size: .09, color: 0xb8643a, cat: 'Paduan · pearlite promoter', desc: 'Potongan batang/kawat tembaga. Menaikkan kekuatan dan kekerasan dengan mendorong struktur perlit.' },
  { id: 'superseed', material: 'Superseed', short: 'Superseed 75', kind: 'granule', size: .0095, color: 0x48433f, cat: 'Inokulan (FeSi75 + Sr)', desc: 'Inokulan ferosilikon 75% dengan Strontium, efektif untuk besi cor kelabu (FC); rendah Ca dan Al.' },
  { id: 'mglamet', material: 'Mg Lamet', short: 'Mg Lamet', kind: 'chunk', size: .04, color: 0x2e3033, cat: 'Nodulizer (FeSiMg + La)', desc: 'Bongkahan FeSiMg dengan Lanthanum untuk nodularisasi; La menetralkan elemen pengganggu dan menambah jumlah nodul.' },
];
// Material curah di samping meja (dari foto lantai produksi). Stok mengikuti material dengan nama ini bila ada.
const BULK = [
  { id: 'carbon', material: 'Carbon', short: 'Carbon', x: -3.05, cat: 'Carbon · karung di pallet', where: 'Pallet di kiri meja', desc: 'Karung carbon hijau disusun berlapis di atas pallet dan dibungkus stretch film.' },
  { id: 'fesi', material: 'Ferro Silicon', short: 'Ferro Silicon', x: 3.0, cat: 'Ferro silicon · jumbo bag', where: 'Jumbo bag di kanan meja', desc: 'Ferro silicon dalam jumbo bag di atas pallet, untuk menaikkan kadar Si pada cairan besi.' },
];
const ITEMS = [...COMP, ...BULK];
const IDX = Object.fromEntries(ITEMS.map((c, i) => [c.material, i]));
const where = i => ITEMS[i].where ?? (i < 3 ? `Box kiri depan · kompartemen ${i + 1}` : `Hopper depan no. ${i - 2}`);
const clamp01 = v => Math.max(0, Math.min(1, v));

// Logika sama dengan tabung stok lama: mode 'pre' | 'plan' (orange = rencana bon) | 'saved'
function levels(lines, stokMinimum, kapasitas, mode) {
  const sharedMax = Math.max(0, ...lines.map(l => l.sisaStok + (mode === 'pre' ? 0 : effBonFinal(l))));
  return Object.fromEntries(lines.map(l => {
    const min = stokMinimum[l.material] ?? 0;
    const bon = mode === 'pre' ? 0 : effBonFinal(l);
    const solid = mode === 'saved' ? l.sisaStok + bon : l.sisaStok;
    const planTop = l.sisaStok + bon;
    // kapasitas manual dari Settings; kosong: 3 × minimum; kosong juga: skala bersama (stok terbesar)
    const cap = Math.max(kapasitas[l.material] || 3 * min || sharedMax, planTop);
    const low = min > 0 && (mode === 'pre' ? l.sisaStok : l.sisaStok + bon - l.totalTepat) < min;
    return [l.material, { min, bon, solid, planTop, cap, low }];
  }));
}
const frac = (v, lv) => (lv && lv.cap > 0 ? clamp01(v / lv.cap) : 0);

// ---------- scene (dibangun sekali per mount) ----------
function buildScene(view, onPick) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  renderer.domElement.style.display = 'block';
  view.prepend(renderer.domElement);
  const labelR = new CSS2DRenderer();
  Object.assign(labelR.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  labelR.domElement.classList.add('group');
  view.appendChild(labelR.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111518); scene.fog = new THREE.Fog(0x111518, 14, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .495; controls.minDistance = 1; controls.maxDistance = 15;

  scene.add(new THREE.HemisphereLight(0xdfe8f0, 0x3a3530, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(3, 6, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); sun.shadow.bias = -.0005; scene.add(sun);
  const back = new THREE.DirectionalLight(0xffd2a0, .6); back.position.set(-4, 3, -5); scene.add(back);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1b2125, roughness: .95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(40, 80, 0x2b3439, 0x22292d); grid.position.y = .001; scene.add(grid);

  const steel = new THREE.MeshStandardMaterial({ color: 0x6c7476, metalness: .55, roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x474d50, metalness: .5, roughness: .62 });
  const binFront = new THREE.MeshStandardMaterial({ color: 0x6c7476, metalness: .55, roughness: .55, transparent: true });
  const bright = new THREE.MeshStandardMaterial({ color: 0xc9ced2, metalness: .85, roughness: .3, side: THREE.DoubleSide });
  const teal = new THREE.MeshStandardMaterial({ color: 0x1f7a68, metalness: .3, roughness: .5 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: .9 });

  function boxMM(x0, y0, z0, x1, y1, z1, mat, parent = scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }

  // dimensi (meter)
  const L = 4.2, X0 = -L / 2, N = 9, W = L / N, cx = i => X0 + W * (i + .5);
  const DECK = .55, TOP = 1.30, BZ0 = -.6, BZ1 = 0, T = .02, FRONT_L = .70, HOP_Z = .38;

  for (const x of [X0 + .03, -1.05, 0, 1.05, -X0 - .03]) for (const z of [-.63, .71]) boxMM(x - .025, 0, z - .025, x + .025, DECK, z + .025, dark);
  boxMM(X0, .10, -.66, -X0, .13, .74, dark);
  boxMM(X0 - .02, DECK - .04, -.66, -X0 + .02, DECK, .76, dark);
  boxMM(X0, .18, -.66, -X0, DECK - .04, -.64, steel);
  boxMM(X0, .18, -.67, -X0, .215, -.655, rust);

  boxMM(X0, DECK, BZ0 - T, -X0, TOP, BZ0, steel);
  boxMM(X0, DECK, BZ1, -X0, TOP, BZ1 + T, binFront);
  for (let i = 0; i <= N; i++) { const x = X0 + W * i; boxMM(x - T / 2, DECK, BZ0, x + T / 2, TOP, BZ1, steel); }
  boxMM(X0 - .01, TOP - .015, BZ0 - T - .01, -X0 + .01, TOP, BZ0 + .02, dark);

  const lids = [];
  function makeLid(x, y, z, w, d, dir, open) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z); scene.add(pivot);
    boxMM(-w / 2, 0, dir > 0 ? 0 : -d, w / 2, .012, dir > 0 ? d : 0, steel, pivot);
    const hz = dir * (d - .045);
    boxMM(-.07, .035, hz - .006, .07, .045, hz + .006, bright, pivot);
    for (const s of [-.065, .065]) boxMM(s - .005, .012, hz - .005, s + .005, .04, hz + .005, bright, pivot);
    const lid = { pivot, open: -dir * open, cur: -dir * open }; pivot.rotation.x = lid.cur; lids.push(lid);
  }
  for (let i = 0; i < N; i++) makeLid(cx(i), TOP, BZ0, W - .012, .6, 1, THREE.MathUtils.degToRad(70));

  const FX0 = X0, FX1 = X0 + 3 * W, FTOP = .95;
  boxMM(FX0, DECK, FRONT_L - T, FX1, FTOP, FRONT_L, binFront);
  boxMM(FX0, DECK, BZ1, FX0 + T, FTOP, FRONT_L, steel);
  for (let i = 1; i <= 3; i++) { const x = X0 + W * i; boxMM(x - T / 2, DECK, BZ1, x + T / 2, FTOP, FRONT_L, steel); }
  for (let i = 0; i < 3; i++) makeLid(cx(i), FTOP, FRONT_L, W - .012, FRONT_L - .02, -1, THREE.MathUtils.degToRad(105));

  for (let i = 3; i < N; i++) {
    const x = cx(i), hw = W / 2 - .03;
    boxMM(x - hw, .80, BZ1, x + hw, 1.08, HOP_Z - T, dark);
    boxMM(x - hw, .80, HOP_Z - T, x + hw, 1.08, HOP_Z, binFront);
    boxMM(x - hw - .01, 1.05, HOP_Z - .01, x + hw + .01, 1.085, HOP_Z + .02, teal);
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(hw * Math.SQRT2, .06, .14, 4, 1, true), bright);
    fun.rotation.y = Math.PI / 4; fun.position.set(x, .73, HOP_Z / 2); fun.scale.z = (HOP_Z / 2) / hw; fun.castShadow = true; scene.add(fun);
    const tw = W / 2 - .06, tz0 = .06, tz1 = .46, ty = .67;
    boxMM(x - tw, DECK, tz0, x + tw, DECK + .012, tz1, dark);
    boxMM(x - tw, DECK, tz0, x + tw, ty, tz0 + .01, dark); boxMM(x - tw, DECK, tz1 - .01, x + tw, ty, tz1, dark);
    boxMM(x - tw, DECK, tz0, x - tw + .01, ty, tz1, dark); boxMM(x + tw - .01, DECK, tz0, x + tw, ty, tz1, dark);
    boxMM(x - .05, ty - .03, tz1, x + .05, ty - .02, tz1 + .04, bright);
  }
  boxMM(X0 + 3 * W, 1.08, BZ1, -X0, 1.11, .46, dark);

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const dispTex = canvasTex(256, 64, g => {
    g.fillStyle = '#0c0f10'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#ff3b30'; g.font = 'bold 40px monospace'; g.textAlign = 'right'; g.fillText('0.000', 236, 47);
  });
  const scaleBody = new THREE.MeshStandardMaterial({ color: 0xd5d9de, roughness: .5, metalness: .1 });
  for (const x of [cx(3) + W * .45, cx(5), cx(6) + W * .55, cx(8) - .02]) {
    boxMM(x - .15, 1.11, .05, x + .15, 1.19, .40, scaleBody);
    boxMM(x - .13, 1.19, .07, x + .13, 1.205, .32, bright);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(.14, .035), new THREE.MeshBasicMaterial({ map: dispTex }));
    d.position.set(x, 1.15, .402); scene.add(d);
  }

  const frontBoard = canvasTex(2048, 236, (g, w, h) => {
    g.fillStyle = '#f2c200'; g.fillRect(0, 0, w, h);
    const titles = ['IMAGE STANDARD MEJA INOCULANT', 'TABEL STANDARD MOLTEN METAL FC', 'TABEL STANDARD PENAMBAHAN', 'TABEL TREATMENT MATERIAL CAMSHAFT', 'POINT PENTING', 'TABEL TREATMENT MATERIAL CRANKSHAFT'];
    const pw = (w - 70) / 6;
    titles.forEach((t, i) => {
      const x = 10 + i * (pw + 10);
      g.fillStyle = '#9aa3a8'; g.fillRect(x, 30, pw, h - 42); g.fillStyle = '#fff'; g.fillRect(x + 10, 44, pw - 20, h - 66);
      g.fillStyle = '#f2c200'; g.fillRect(x + 20, 52, pw - 40, 22); g.fillStyle = '#222'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(t, x + pw / 2, 68, pw - 46);
      g.strokeStyle = '#8a96a0'; g.lineWidth = 1;
      for (let r = 0; r < 7; r++) { g.beginPath(); g.moveTo(x + 24, 90 + r * 16); g.lineTo(x + pw - 24, 90 + r * 16); g.stroke(); }
      for (let c2 = 1; c2 < 4; c2++) { g.beginPath(); g.moveTo(x + 24 + c2 * (pw - 48) / 4, 86); g.lineTo(x + 24 + c2 * (pw - 48) / 4, 90 + 6 * 16); g.stroke(); }
    });
  });
  const backBoard = canvasTex(2048, 236, (g, w, h) => {
    g.fillStyle = '#6d7577'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3d4446'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.beginPath(); g.moveTo(1010, 10); g.lineTo(1010, h - 10); g.lineWidth = 4; g.stroke();
    g.fillStyle = '#2f6b3a'; g.fillRect(40, 30, 90, 170); g.fillStyle = '#2856c8'; g.beginPath(); g.moveTo(75, 55); g.lineTo(95, 55); g.lineTo(100, 120); g.lineTo(120, 185); g.lineTo(50, 185); g.lineTo(70, 120); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(1205, 25, 330, 190); g.fillStyle = '#d42a2a'; g.fillRect(1213, 33, 314, 174);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 26px sans-serif';
    g.fillText('"PASTIKAN"', 1370, 80); g.fillText('SAAT MEMASUKAN MATERIAL', 1370, 128, 300); g.fillText('TIDAK TERCAMPUR !!!', 1370, 176);
  });
  boxMM(-1.97, TOP, -.69, -1.93, 2.02, -.65, dark); boxMM(1.93, TOP, -.69, 1.97, 2.02, -.65, dark);
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.9, .45, .03), [steel, steel, steel, steel,
    new THREE.MeshStandardMaterial({ map: frontBoard, roughness: .7 }), new THREE.MeshStandardMaterial({ map: backBoard, roughness: .7 })]);
  board.position.set(0, 1.77, -.67); board.castShadow = true; scene.add(board);

  // ---------- material curah: pallet karung Carbon (kiri) & jumbo bag Ferro Silicon (kanan) ----------
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: .9 });
  const PAL = .122; // tinggi atas pallet
  function pallet(x, z, w, d) {
    for (const sx of [x - w / 2 + .04, x, x + w / 2 - .04]) boxMM(sx - .04, 0, z - d / 2, sx + .04, .1, z + d / 2, wood);
    for (let k = 0; k < 7; k++) { const zc = z - d / 2 + .05 + k * (d - .1) / 6; boxMM(x - w / 2, .1, zc - .05, x + w / 2, PAL, zc + .05, wood); }
  }
  const BZ = .05; // z tengah material curah
  const [CX, FX] = BULK.map(b => b.x);
  const brnd = mulberry32(11), bd = new THREE.Object3D();

  // Carbon: bak baja rendah, pallet, 6 lapis x 6 karung (orientasi selang-seling), stretch film
  for (const [a, b, c, d] of [[-.66, -.66, .66, -.64], [-.66, .64, .66, .66], [-.66, -.66, -.64, .66], [.64, -.66, .66, .66]]) boxMM(CX + a, 0, BZ + b, CX + c, .3, BZ + d, steel);
  pallet(CX, BZ, 1.1, 1.1);
  const SACK_H = .12, LAYERS = 6;
  const sackInst = new THREE.InstancedMesh(new RoundedBoxGeometry(.54, SACK_H, .35, 3, .055), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), LAYERS * 6);
  sackInst.castShadow = sackInst.receiveShadow = true; scene.add(sackInst);
  {
    const green = new THREE.Color(0x6aa595), col = new THREE.Color();
    let k = 0;
    for (let ly = 0; ly < LAYERS; ly++) {
      const rot = ly % 2 === 1;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) {
        const u = (a - .5) * .55, v = (b - 1) * .36;
        bd.position.set(CX + (rot ? v : u) + (brnd() - .5) * .02, PAL + SACK_H * (ly + .5), BZ + (rot ? u : v) + (brnd() - .5) * .02);
        bd.rotation.set((brnd() - .5) * .05, (rot ? Math.PI / 2 : 0) + (brnd() - .5) * .06, (brnd() - .5) * .05);
        bd.scale.set(1, .9 + brnd() * .2, 1); bd.updateMatrix(); sackInst.setMatrixAt(k, bd.matrix);
        sackInst.setColorAt(k++, col.copy(green).multiplyScalar(.8 + brnd() * .3));
      }
    }
  }
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xeef6ff, transparent: true, opacity: .14, roughness: .1, metalness: .2, depthWrite: false }));
  scene.add(wrap);
  function setSacks(layers) {
    sackInst.count = layers * 6; wrap.visible = layers > 0;
    const h = layers * SACK_H + .02; wrap.scale.set(1.14, h, 1.1); wrap.position.set(CX, PAL + h / 2, BZ);
  }
  setSacks(LAYERS);

  // Ferro Silicon: jumbo bag (FIBC) menggembung di atas pallet, sabuk, tali angkat, tulisan stensil
  pallet(FX, BZ, 1.1, 1.1);
  const bagG = new THREE.Group(); bagG.position.set(FX, PAL, BZ); scene.add(bagG);
  const prof = [[0, 0], [.46, 0], [.5, .06], [.53, .3], [.53, .55], [.51, .78], [.47, .86], [.36, .9], [.18, .93], [0, .94]].map(([x, y]) => new THREE.Vector2(x, y));
  const bagGeo = new THREE.LatheGeometry(prof, 48);
  { // kerutan kain
    const pos = bagGeo.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      if (Math.hypot(v.x, v.z) < .01) continue;
      const a = Math.atan2(v.z, v.x);
      const n = 1 + .018 * Math.sin(a * 9 + v.y * 14) + .012 * Math.sin(a * 23 - v.y * 31) + (v.y > .82 ? .05 * Math.sin(a * 6) : 0);
      pos.setXYZ(k, v.x * n, v.y + (v.y > .86 ? .03 * Math.sin(a * 5 + 1) : 0), v.z * n);
    }
    bagGeo.computeVertexNormals();
  }
  const bag = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({ color: 0xc4c8c4, roughness: .92 }));
  bag.castShadow = bag.receiveShadow = true; bagG.add(bag);
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xb9bcb6, roughness: .95 });
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.538, .014, 6, 64), strapMat); belt.rotation.x = Math.PI / 2; belt.position.y = .3; bagG.add(belt);
  for (const a of [.55, -.55, Math.PI - .55, Math.PI + .55]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(.055, .84, .012), strapMat);
    st.position.set(Math.sin(a) * .54, .44, Math.cos(a) * .54); st.rotation.y = a; bagG.add(st);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(.11, .018, 6, 18, Math.PI), strapMat);
    loop.position.set(Math.sin(a) * .36, .9, Math.cos(a) * .36); loop.rotation.set(-Math.PI / 2 + .35, a, 0); bagG.add(loop);
  }
  const stencil = canvasTex(1024, 640, g => {
    g.fillStyle = 'rgba(25,25,25,.85)'; g.font = 'bold 74px Arial, sans-serif'; g.textAlign = 'left';
    ['YUSHIN', 'SURABAYA', 'B/NO. 136-152', 'FERRO SILICON', 'LOT NUMBER :'].forEach((t, k) => g.fillText(t, 110, 110 + k * 112, 820));
  });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.545, .545, .5, 24, 1, true, -.75, 1.5), new THREE.MeshStandardMaterial({ map: stencil, transparent: true, roughness: .9, depthWrite: false }));
  label.position.y = .58; bagG.add(label);

  // foto material
  const loader = new THREE.TextureLoader();
  function photo(src, x, y, z, size, ry = 0) {
    const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, color: 0xdddddd }));
    p.position.set(x, y, z); p.rotation.y = ry; scene.add(p);
  }
  COMP.forEach((c, i) => {
    photo(img(c.id), cx(i), .88, BZ0 - T - .003, .30, Math.PI);
    if (i < 3) photo(img(c.id), cx(i), .76, FRONT_L + .003, .25);
    else photo(img(c.id), cx(i), .94, HOP_Z + .003, .22);
  });

  // isi material: stok (padat) + rencana bon (orange transparan) + garis minimum (merah)
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(7);
  function particleGeo(c) {
    switch (c.kind) {
      case 'chunk': return new THREE.DodecahedronGeometry(c.size, 0);
      case 'pebble': { const g = new THREE.SphereGeometry(c.size, 8, 6); g.scale(1, .75, 1.1); return g; }
      case 'stick': return new THREE.CylinderGeometry(.005, .005, c.size, 6);
      default: return new THREE.IcosahedronGeometry(c.size, 0);
    }
  }
  const COUNT = { granule: 520, powder: 160, pebble: 220, chunk: 70, stick: 150 };
  const planMat = new THREE.MeshStandardMaterial({ color: 0xf97316, transparent: true, opacity: .45, depthWrite: false });
  const minMat = new THREE.LineBasicMaterial({ color: 0xe2574c });
  function makeFill(ci, r) {
    const c = COMP[ci];
    const g = new THREE.Group(); scene.add(g);
    const metal = c.kind === 'stick' || c.kind === 'pebble';
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: c.color, roughness: .95, metalness: metal ? .3 : .05 }));
    body.receiveShadow = true; g.add(body);
    const n = Math.round(COUNT[c.kind] * ((r.x1 - r.x0) * (r.z1 - r.z0)) / .25);
    const inst = new THREE.InstancedMesh(particleGeo(c), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: metal ? .35 : .8, metalness: metal ? .8 : .2 }), n);
    inst.castShadow = true; g.add(inst);
    const base = new THREE.Color(c.color), col = new THREE.Color(), seeds = [];
    for (let k = 0; k < n; k++) {
      seeds.push({ x: rnd(), z: rnd(), s: .7 + rnd() * .6, rx: rnd() * 6.28, ry: rnd() * 6.28, rz: rnd() * 6.28, h: rnd() });
      inst.setColorAt(k, col.copy(base).multiplyScalar(.75 + rnd() * .6));
    }
    const plan = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), planMat); plan.visible = false; scene.add(plan);
    const pts = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const minLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), minMat); minLine.visible = false; scene.add(minLine);
    return { ci, g, body, inst, seeds, r, plan, minLine };
  }
  const dummy = new THREE.Object3D();
  function updateFill(f, lv, showPlan) {
    const { x0, x1, z0, z1, y0, h } = f.r;
    const p = frac(lv?.solid ?? 0, lv), bh = Math.max(.001, h * p - .008);
    f.g.visible = p > .003;
    f.body.scale.set(x1 - x0, bh, z1 - z0); f.body.position.set((x0 + x1) / 2, y0 + bh / 2, (z0 + z1) / 2);
    const stick = COMP[f.ci].kind === 'stick';
    f.seeds.forEach((s, k) => {
      dummy.position.set(x0 + .012 + s.x * (x1 - x0 - .024), y0 + bh + s.h * .01, z0 + .012 + s.z * (z1 - z0 - .024));
      if (stick) dummy.rotation.set(Math.PI / 2 + (s.rx - 3.14) * .06, 0, s.rz); else dummy.rotation.set(s.rx, s.ry, s.rz);
      dummy.scale.setScalar(s.s); dummy.updateMatrix(); f.inst.setMatrixAt(k, dummy.matrix);
    });
    f.inst.instanceMatrix.needsUpdate = true;
    const pp = showPlan ? frac(lv?.planTop ?? 0, lv) : 0;
    const ph = h * (pp - p);
    f.plan.visible = ph > .004;
    f.plan.scale.set(x1 - x0 - .004, Math.max(.001, ph), z1 - z0 - .004);
    f.plan.position.set((x0 + x1) / 2, y0 + h * p + ph / 2, (z0 + z1) / 2);
    f.minLine.visible = (lv?.min ?? 0) > 0;
    f.minLine.position.y = y0 + h * frac(lv?.min ?? 0, lv);
  }
  const fills = [];
  COMP.forEach((c, i) => {
    const hx = W / 2 - .016;
    fills.push(makeFill(i, { x0: cx(i) - hx, x1: cx(i) + hx, z0: BZ0 + .005, z1: BZ1 - .005, y0: DECK, h: TOP - DECK - .05 }));
    if (i < 3) fills.push(makeFill(i, { x0: cx(i) - hx, x1: cx(i) + hx, z0: BZ1 + .025, z1: FRONT_L - .025, y0: DECK, h: FTOP - DECK - .03 }));
  });

  // volume klik, outline, label
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const hoverBox = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 }));
  const selBox = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xf0a32a }));
  hoverBox.visible = selBox.visible = false; scene.add(hoverBox, selBox);
  const vols = [], tags = [];
  COMP.forEach((c, i) => {
    const z1 = i < 3 ? FRONT_L : .46;
    const v = new THREE.Mesh(new THREE.BoxGeometry(W, TOP - DECK, z1 - BZ0), new THREE.MeshBasicMaterial({ visible: false }));
    v.position.set(cx(i), (DECK + TOP) / 2, (BZ0 + z1) / 2); v.userData.idx = i; scene.add(v); vols.push(v);
    const el = document.createElement('div');
    const o = new CSS2DObject(el); o.position.set(cx(i), TOP + .02, BZ1 + .01); scene.add(o); tags.push(el);
  });
  BULK.forEach((b, j) => {
    const v = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    v.position.set(b.x, .55, BZ); v.userData.idx = COMP.length + j; scene.add(v); vols.push(v);
    const el = document.createElement('div');
    const o = new CSS2DObject(el); o.position.set(b.x, 1.15, BZ); scene.add(o); tags.push(el);
  });
  const fitBox = (b, i, pad) => {
    const v = vols[i], { width, height, depth } = v.geometry.parameters;
    b.position.copy(v.position); b.scale.set(width + pad, height + pad, depth + pad); b.visible = true;
  };

  // kamera
  const CAMS = {
    overview: [[0, 4.4, 3.0], [0, .9, -.15]],
    front: [[0, 1.75, 4.4], [0, 1.0, 0]],
    back: [[0, 2.1, -4.4], [0, 1.05, -.3]],
    top: [[0, 4.7, .3], [0, .9, -.05]],
  };
  const fit = ([p, t]) => {
    const k = Math.max(1, 1.75 / camera.aspect) * 1.3; // meja + material curah di kiri-kanan
    return [new THREE.Vector3(...p).sub(new THREE.Vector3(...t)).multiplyScalar(k).add(new THREE.Vector3(...t)).toArray(), t];
  };
  let tween = null;
  const flyTo = (pos, tgt) => { tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt) }; };

  // picking
  let selIdx = -1;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(vols, false)[0]; return hit ? hit.object.userData.idx : -1;
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const i = pick(e); if (i >= 0) onPick(i); }
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const i = pick(e);
    renderer.domElement.style.cursor = i >= 0 ? 'pointer' : '';
    if (i >= 0 && i !== selIdx) fitBox(hoverBox, i, .015); else hoverBox.visible = false;
  });

  function resize() {
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w, h); labelR.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    labelR.domElement.dataset.narrow = w < 900; // label sempit saling tumpuk: tampilkan yang dipilih saja
  }
  const ro = new ResizeObserver(resize); ro.observe(view); resize();
  { const [p, t] = fit(CAMS.overview); camera.position.set(...p); controls.target.set(...t); }

  let lidsOpen = true;
  const timer = new THREE.Timer();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), .05);
    for (const l of lids) { const target = lidsOpen ? l.open : 0; l.cur += (target - l.cur) * Math.min(1, dt * 6); l.pivot.rotation.x = l.cur; }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / .9); const k = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k); if (tween.t >= 1) tween = null;
    }
    controls.update(); renderer.render(scene, camera); labelR.render(scene, camera);
  });

  return {
    update(lvMap, showPlan) {
      fills.forEach(f => updateFill(f, lvMap[COMP[f.ci].material], showPlan));
      // material curah: tanpa data stok tampil penuh sebagai dekorasi
      const lc = lvMap.Carbon, lf = lvMap['Ferro Silicon'];
      setSacks(lc ? Math.ceil(frac(lc.solid, lc) * LAYERS) : LAYERS);
      bagG.scale.y = lf ? Math.max(.12, frac(lf.solid, lf)) : 1;
      ITEMS.forEach((c, i) => {
        const lv = lvMap[c.material];
        const on = i === selIdx;
        tags[i].className = [
          'whitespace-nowrap rounded-[3px] border-l-[3px] px-1.5 py-0.5 text-[11px] leading-tight -translate-y-1.5',
          on ? 'bg-signal text-iron-950' : 'bg-iron-950/85 text-paper group-data-[narrow=true]:hidden',
        ].join(' ');
        tags[i].style.borderLeftColor = lv?.low ? '#E2574C' : '#4DBE8A';
        const val = lv ? `${fmtNum(lv.solid)} kg` : '—';
        const bon = showPlan && lv?.bon > 0 ? ` <span class="${on ? '' : 'text-orange-400'}">+${fmtNum(lv.bon)}</span>` : '';
        tags[i].innerHTML = `<b class="font-semibold">${c.short}</b> <span class="${on ? '' : 'text-steel'}">${val}</span>${bon}`;
      });
    },
    select(i) { selIdx = i; if (i >= 0) fitBox(selBox, i, .03); else selBox.visible = false; },
    focusOn(i) { const x = vols[i].position.x; flyTo([x * .85, 3.0, 1.6], [x, .9, -.3]); },
    cam(name) { flyTo(...fit(CAMS[name])); },
    setLids(on) { lidsOpen = on; },
    setTags(on) { labelR.domElement.style.display = on ? '' : 'none'; },
    setXray(on) { binFront.opacity = on ? .15 : 1; binFront.depthWrite = !on; },
    dispose() {
      renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
      scene.traverse(o => {
        o.geometry?.dispose();
        for (const m of [o.material].flat()) { m?.map?.dispose(); m?.dispose(); }
      });
      renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove(); labelR.domElement.remove();
    },
  };
}

const CAM_BTNS = [['overview', 'Ikhtisar'], ['front', 'Depan'], ['back', 'Belakang'], ['top', 'Atas']];

function Toggle({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-[3px] border px-2.5 py-1 text-[11px] font-semibold transition-colors ${on ? 'border-signal bg-signal text-iron-950' : 'border-white/[0.14] bg-iron-900/90 text-steel hover:text-paper'}`}
    >
      {children}
    </button>
  );
}

// lines: [{ material, sisaStok, totalTepat, bonFinal, bonFinalOverride }]
export default function MejaInokulasi3D({ lines, stokMinimum = {}, kapasitas = {}, mode = 'pre' }) {
  const viewRef = useRef(null);
  const apiRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [lidsOpen, setLidsOpen] = useState(true);
  const [tagsOn, setTagsOn] = useState(true);
  const [xray, setXray] = useState(false);

  const showPlan = mode === 'plan';
  const lv = levels(lines, stokMinimum, kapasitas, mode);

  useEffect(() => {
    const api = buildScene(viewRef.current, i => setSel(ITEMS[i].material));
    apiRef.current = api;
    return () => { api.dispose(); apiRef.current = null; };
  }, []);

  useEffect(() => {
    apiRef.current?.select(IDX[sel] ?? -1);
    apiRef.current?.update(levels(lines, stokMinimum, kapasitas, mode), mode === 'plan');
  }, [lines, stokMinimum, kapasitas, mode, sel]);

  function choose(material) {
    setSel(material);
    if (IDX[material] !== undefined) apiRef.current?.focusOn(IDX[material]);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div ref={viewRef} className="relative h-[420px] overflow-hidden rounded-[4px] border border-white/[0.09] md:h-[500px]">
        <div className="absolute inset-x-2 top-2 z-10 flex flex-wrap gap-1.5">
          {CAM_BTNS.map(([k, label]) => (
            <Toggle key={k} on={false} onClick={() => apiRef.current?.cam(k)}>{label}</Toggle>
          ))}
          <Toggle on={lidsOpen} onClick={() => { setLidsOpen(!lidsOpen); apiRef.current?.setLids(!lidsOpen); }}>
            {lidsOpen ? 'Tutup terbuka' : 'Tutup tertutup'}
          </Toggle>
          <Toggle on={tagsOn} onClick={() => { setTagsOn(!tagsOn); apiRef.current?.setTags(!tagsOn); }}>Label</Toggle>
          <Toggle on={xray} onClick={() => { setXray(!xray); apiRef.current?.setXray(!xray); }}>Tembus pandang</Toggle>
        </div>
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-[3px] border border-white/[0.09] bg-iron-950/85 px-2.5 py-1.5 text-[11px] text-steel-dim">
          <span><i className="mr-1 inline-block h-2 w-2 bg-success" />Stok sekarang</span>
          {showPlan && <span><i className="mr-1 inline-block h-2 w-2 bg-orange-500/45" />Rencana bon</span>}
          <span><i className="mr-1 inline-block h-0 w-3 border-t border-danger align-middle" />Batas minimum</span>
        </div>
        <div className="absolute bottom-2 right-2 z-10 hidden rounded-[3px] bg-iron-950/70 px-2 py-1 text-[11px] text-steel-faint 2xl:block">
          Drag: putar · Scroll: zoom · Klik kanan: geser · Klik kompartemen: detail
        </div>
      </div>

      <ul className="flex max-h-[500px] flex-col gap-1 overflow-auto">
        {lines.map(l => {
          const v = lv[l.material];
          const ci = IDX[l.material];
          const c = ITEMS[ci];
          const on = sel === l.material;
          const pct = x => `${frac(x, v) * 100}%`;
          return (
            <li key={l.material}>
              <button
                type="button"
                onClick={() => choose(l.material)}
                className={`flex w-full items-start gap-2.5 rounded-[4px] border p-2 text-left transition-colors ${on ? 'border-signal/60 bg-iron-800' : 'border-transparent hover:bg-white/[0.04]'}`}
              >
                {c
                  ? <img src={img(c.id)} alt="" className="h-10 w-10 shrink-0 rounded-[3px] object-cover" />
                  : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] border border-white/10 text-[10px] text-steel-faint">—</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-paper">{l.material}</span>
                    <small className="shrink-0 text-[11px] tabular-nums text-steel-dim">{fmtNum(v.solid)} / {fmtNum(v.cap)} kg</small>
                  </div>
                  <div className="meter relative mt-1.5">
                    {showPlan && <i className="absolute inset-y-0 left-0 bg-orange-500/45" style={{ width: pct(v.planTop) }} />}
                    <i className="absolute inset-y-0 left-0 bg-success transition-[width] duration-700" style={{ width: pct(v.solid) }} />
                    {v.min > 0 && <i className="absolute inset-y-0 w-px bg-danger" style={{ left: pct(v.min) }} />}
                  </div>
                  {showPlan && v.bon > 0 && <div className="mt-0.5 text-[10px] tabular-nums text-orange-400">+{fmtNum(v.bon)} kg bon</div>}
                  {v.low && (
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-danger">
                      {mode === 'pre' ? 'di bawah minimum' : 'setelah pemakaian di bawah minimum'}
                    </div>
                  )}
                  {on && (
                    <p className="mt-1.5 text-[11px] leading-snug text-steel-dim">
                      {c ? <><span className="text-steel">{c.cat} · {where(ci)}.</span> {c.desc}</> : 'Tidak ada kompartemen untuk material ini di meja inokulasi.'}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
