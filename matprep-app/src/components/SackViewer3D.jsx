import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSack, fitCamera, loadSackTexture } from '../lib/sack3d';

// Penampil karung 3D: putar (drag), zoom (scroll), auto-putar sampai disentuh.
export default function SackViewer3D({ sackId, material, onClose }) {
  const viewRef = useRef(null);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const view = viewRef.current;
    let alive = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    view.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.2, 2.5, 2.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1 }); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe0b0, .7); rim.position.set(-2, 1, -1.5); scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({ opacity: .35 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const camera = new THREE.PerspectiveCamera(30, 1, .01, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
    controls.maxPolarAngle = Math.PI * .55;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    let sack = null;
    function resize() {
      const w = view.clientWidth, h = view.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
      if (sack) { controls.target.copy(fitCamera(camera, sack, new THREE.Vector3(.4, .2, 1), .8)); controls.update(); }
    }
    const ro = new ResizeObserver(resize); ro.observe(view);

    loadSackTexture(sackId).then(tex => {
      if (!alive) { tex?.dispose(); return; }
      sack = buildSack(sackId, tex); scene.add(sack);
      resize();
      const dist = camera.position.distanceTo(controls.target);
      controls.minDistance = dist * .5; controls.maxDistance = dist * 1.8;
    });

    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

    return () => {
      alive = false;
      renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose(); for (const m of [o.material].flat()) { m?.map?.dispose(); m?.dispose(); } });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [sackId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Karung ${material} 3D`}
        className="w-full max-w-[460px] overflow-hidden rounded-[5px] border border-white/[0.12] bg-iron-850 shadow-2xl animate-fadeInScale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div>
            <div className="font-display text-base font-semibold text-paper">{material}</div>
            <div className="text-[11px] text-steel-faint">Drag: putar · Scroll: zoom</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-[4px] p-1.5 text-steel-dim hover:bg-white/[0.06] hover:text-paper" aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
        <div ref={viewRef} className="h-[60vh] max-h-[520px] min-h-[320px] bg-[radial-gradient(circle_at_50%_40%,#22292d,#111518_70%)]" />
      </div>
    </div>
  );
}
