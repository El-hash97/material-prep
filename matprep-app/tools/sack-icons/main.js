import * as THREE from 'three';
import { buildSack } from './sack.js';

// id → foto karung (textures/<id>.jpg) + ukuran (m) + warna sisi belakang. Tambah baris saat foto baru masuk.
const SACKS = [
  { id: 'lmc', w: .48, h: .66, d: .16, back: 0xc9cbc8 },
  { id: 'ultraseed', w: .40, h: .70, d: .18, back: 0xb8956a },
  { id: 'mglamet', w: .46, h: .64, d: .15, back: 0xd2d3cf },
  { id: 'cu', w: .52, h: .42, d: .10, back: 0xa8643f },
  { id: 'mgdenodule', w: .46, h: .62, d: .14, back: 0xdcdcd6 },
  { id: 'default', w: .46, h: .64, d: .15, tex: false, back: 0xc9cbc6, color: 0xd6d7d2 },
];
const SIZE = 160;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
renderer.shadowMap.enabled = true;
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.2, 2.5, 2.5); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1 }); scene.add(key);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: .35 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const rim = new THREE.DirectionalLight(0xffe0b0, .7); rim.position.set(-2, 1, -1.5); scene.add(rim);
const camera = new THREE.PerspectiveCamera(26, 1, .01, 20);

const loader = new THREE.TextureLoader();
const status = document.getElementById('status');

for (const s of SACKS) {
  const tex = s.tex === false ? null : await loader.loadAsync(`./textures/${s.id}.jpg`);
  if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; }
  const sack = buildSack({ ...s, tex, seed: s.id.length });
  sack.rotation.set(-.1, -.38, .03); // sedikit bersandar, terlihat 3/4
  sack.traverse(o => { o.castShadow = true; });
  scene.add(sack);
  const box = new THREE.Box3().setFromObject(sack);
  ground.position.y = box.min.y;
  // framing: karung pipih, jadi bounding sphere terlalu longgar → dekatkan
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * .8;
  camera.position.copy(sphere.center).add(new THREE.Vector3(0, .12, 1).normalize().multiplyScalar(dist));
  camera.lookAt(sphere.center);
  renderer.render(scene, camera);
  const blob = await new Promise(r => renderer.domElement.toBlob(r, 'image/webp', .9));
  const res = await fetch(`/save?name=${s.id}`, { method: 'POST', body: blob });
  status.textContent += `${s.id}: ${res.ok ? 'ok' : 'gagal'} (${blob.size} B)\n`;
  const img = new Image(); img.src = URL.createObjectURL(blob); document.getElementById('out').appendChild(img);
  scene.remove(sack);
}
status.textContent += 'selesai';
