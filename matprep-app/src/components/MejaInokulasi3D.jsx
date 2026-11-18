import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { effBonFinal, fmtNum } from '../lib/calc';
import MaterialIcon from './MaterialIcon';
import { COMP, BULK, ITEMS, img, frac, buildMejaModel } from '../lib/mejaModel';

const IDX = Object.fromEntries(ITEMS.map((c, i) => [c.material, i]));
const where = i => ITEMS[i].where ?? (i < 3 ? `Box kiri depan · kompartemen ${i + 1}` : `Hopper depan no. ${i - 2}`);

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

  const { lids, fills, updateFill, setSacks, bagG, binFront, LAYERS, dims } = buildMejaModel(scene);
  const { cx, W, DECK, TOP, BZ0, BZ1, FRONT_L, BZ } = dims;

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
  // Selalu tampil di Dashboard: jangan render saat di luar layar atau tab tersembunyi.
  let onScreen = true;
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
  io.observe(view);
  renderer.setAnimationLoop(() => {
    timer.update();
    if (!onScreen || document.hidden) return;
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
        tags[i].style.borderLeftColor = lv?.low ? '#EB6A5F' : '#4DBE8A';
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
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
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
                <MaterialIcon material={l.material} fallback={c && img(c.id)} viewable={false} className="h-10 w-10 rounded-[3px]" />
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
