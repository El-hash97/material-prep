import * as THREE from 'three';
import lmc from '../assets/sacks/lmc.jpg';
import ultraseed from '../assets/sacks/ultraseed.jpg';
import mglamet from '../assets/sacks/mglamet.jpg';
import cu from '../assets/sacks/cu.jpg';
import mgdenodule from '../assets/sacks/mgdenodule.jpg';

// Model karung 3D dari foto. `corners` = 4 sudut muka karung di foto (px, urutan kiri-atas, kanan-atas,
// kanan-bawah, kiri-bawah). Foto "diluruskan" ke sudut-sudut ini, jadi karung miring/terbalik ikut tegak.
// w/h/d = lebar/tinggi/tebal karung (m). Foto baru: taruh di assets/sacks, tambah satu baris di sini.
export const SACKS = {
  lmc:        { tex: lmc,        size: [620, 800], corners: [[90, 55], [460, 70], [565, 690], [55, 735]],  w: .48, h: .70, d: .16, back: 0xc9cbc8, lift: .45 }, // foto berbayang → diterangkan
  ultraseed:  { tex: ultraseed,  size: [493, 800], corners: [[55, 50], [400, 40], [445, 735], [25, 735]],  w: .42, h: .70, d: .18, back: 0xb8956a },
  mglamet:    { tex: mglamet,    size: [622, 800], corners: [[50, 50], [445, 35], [570, 695], [50, 755]],  w: .48, h: .68, d: .15, back: 0xd2d3cf },
  cu:         { tex: cu,         size: [800, 653], corners: [[105, 545], [60, 80], [700, 45], [720, 590]], w: .40, h: .58, d: .12, back: 0xa8643f },
  mgdenodule: { tex: mgdenodule, size: [610, 800], corners: [[100, 55], [555, 95], [585, 750], [65, 760]], w: .48, h: .66, d: .15, back: 0xdcdcd6 },
  default:    { tex: null, w: .46, h: .68, d: .15, color: 0xd6d7d2, back: 0xc9cbc6 },
};

export async function loadSackTexture(id) {
  const s = SACKS[id];
  if (!s?.tex) return null;
  const t = await new THREE.TextureLoader().loadAsync(s.tex);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Karung berdiri tegak, dasar di y=0, muka foto menghadap +z.
export function buildSack(id, tex) {
  const s = SACKS[id] ?? SACKS.default;
  const { w, h, d } = s;
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  // uv bilinear dari 4 sudut foto → muka karung lurus
  const uvAt = (sx, ty) => {
    const [tl, tr, br, bl] = s.corners;
    const p = lerp(lerp(bl, br, sx), lerp(tl, tr, sx), ty);
    return [p[0] / s.size[0], 1 - p[1] / s.size[1]];
  };
  function half(dir) {
    const g = new THREE.PlaneGeometry(w, h, 40, 56);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let k = 0; k < p.count; k++) {
      const x0 = p.getX(k), y0 = p.getY(k);
      const u = (x0 / w) * 2, v = (y0 / h) * 2; // -1..1
      if (s.corners) uv.setXY(k, ...uvAt(x0 / w + .5, y0 / h + .5));
      // menggembung, bawah lebih padat (karung berdiri), sudut dijepit
      const bulge = Math.pow(Math.max(0, 1 - u * u), .32) * Math.pow(Math.max(0, 1 - v * v), .28) * (1.06 - .12 * v);
      const wrinkle = .008 * Math.sin(u * 7 + v * 3) * Math.sin(v * 9 + 1.3) + (v > .78 ? .02 * Math.sin(u * 13) * (v - .78) * 4 : 0);
      p.setXYZ(k, x0 * (1 - .05 * (1 - v * v)), y0 * (1 - .03 * (1 - u * u)) + h / 2, dir * bulge * (d / 2 + wrinkle * d * 3));
    }
    g.computeVertexNormals();
    return g;
  }
  // lift: terangkan foto yang gelap/berbayang (emissive dari foto itu sendiri)
  const front = new THREE.MeshStandardMaterial({
    map: tex, color: tex ? 0xffffff : s.color, roughness: .85, side: THREE.DoubleSide,
    ...(tex && s.lift ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: s.lift } : {}),
  });
  const back = new THREE.MeshStandardMaterial({ color: s.back, roughness: .9, side: THREE.DoubleSide });
  const grp = new THREE.Group();
  for (const m of [new THREE.Mesh(half(1), front), new THREE.Mesh(half(-1), back)]) { m.castShadow = true; grp.add(m); }
  return grp;
}

// Posisikan kamera perspektif agar objek muat utuh (tidak terpotong) dengan margin, dari arah `dir`.
export function fitCamera(camera, object, dir = new THREE.Vector3(0, .15, 1), margin = .86) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const pts = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z));
  let dist = box.getSize(new THREE.Vector3()).length() * 2;
  for (let i = 0; i < 6; i++) {
    camera.position.copy(center).addScaledVector(dir.clone().normalize(), dist);
    camera.lookAt(center); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const ext = Math.max(...pts.map(p => { const q = p.clone().project(camera); return Math.max(Math.abs(q.x), Math.abs(q.y)); }));
    dist *= ext / margin;
  }
  camera.position.copy(center).addScaledVector(dir.clone().normalize(), dist);
  camera.lookAt(center);
  return center;
}
