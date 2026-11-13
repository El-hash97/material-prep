import * as THREE from 'three';
import { SACKS, buildSack, fitCamera, loadSackTexture } from '../../src/lib/sack3d.js';

// Semua karung: berdiri tegak, sudut pandang sama, muat utuh di frame.
const SIZE = 160;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.2, 2.5, 2.5); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1 }); scene.add(key);
const rim = new THREE.DirectionalLight(0xffe0b0, .7); rim.position.set(-2, 1, -1.5); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: .35 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const camera = new THREE.PerspectiveCamera(24, 1, .01, 20);
const VIEW = new THREE.Vector3(.38, .16, 1); // 3/4 depan, sedikit dari atas — sama untuk semua karung

const status = document.getElementById('status');
for (const id of Object.keys(SACKS)) {
  const sack = buildSack(id, await loadSackTexture(id));
  scene.add(sack);
  fitCamera(camera, sack, VIEW, .88);
  renderer.render(scene, camera);
  const blob = await new Promise(r => renderer.domElement.toBlob(r, 'image/webp', .9));
  const res = await fetch(`/save?name=${id}`, { method: 'POST', body: blob });
  status.textContent += `${id}: ${res.ok ? 'ok' : 'gagal'} (${blob.size} B)\n`;
  const img = new Image(); img.src = URL.createObjectURL(blob); document.getElementById('out').appendChild(img);
  scene.remove(sack);
}
status.textContent += 'selesai';
