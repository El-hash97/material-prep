import * as THREE from 'three';

// Karung 3D: bantal (dua sisi menggembung, sudut dijepit) dengan foto karung sebagai tekstur muka depan.
// w/h/d dalam meter; tex boleh null (karung polos).
export function buildSack({ w, h, d, tex = null, color = 0xd8d8d2, back = color, seed = 1 }) {
  const rnd = (() => { let a = seed * 9301 + 49297; return () => ((a = (a * 9301 + 49297) % 233280) / 233280); })();
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  function half(dir) {
    const g = new THREE.PlaneGeometry(w, h, 40, 56);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const u = (p.getX(k) / w) * 2, v = (p.getY(k) / h) * 2; // -1..1
      const bulge = Math.pow(Math.max(0, 1 - u * u), .35) * Math.pow(Math.max(0, 1 - v * v), .3);
      const wrinkle = .012 * Math.sin(u * 7 + v * 3 + ph[0]) * Math.sin(v * 9 + ph[1])
        + (v > .7 ? .03 * Math.sin(u * 13 + ph[2]) * (v - .7) * 3 : 0); // kerutan + lipatan atas
      const x = p.getX(k) * (1 - .06 * (1 - v * v));           // sisi melengkung ke dalam
      const y = p.getY(k) * (1 - .035 * (1 - u * u));
      p.setXYZ(k, x, y, dir * (d / 2) * bulge + dir * wrinkle * bulge * d * 4);
    }
    g.computeVertexNormals();
    return g;
  }
  const grp = new THREE.Group();
  const frontMat = new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : color, roughness: .85, side: THREE.DoubleSide });
  const backMat = new THREE.MeshStandardMaterial({ color: back, roughness: .9, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(half(1), frontMat), new THREE.Mesh(half(-1), backMat));
  return grp;
}
