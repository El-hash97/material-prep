import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight,
  ClipboardList, Lightbulb, Stamp, Forklift, PackageOpen, Flame, TabletSmartphone, MonitorDown, Moon,
} from 'lucide-react';
import { BEATS, LOOP, LOOP_STARTS, beatAt } from '../lib/story';
import { Skel } from './LoadState';

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const MOBILE = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches;
const ICONS = {
  planning: ClipboardList, saran: Lightbulb, bon: Stamp, kirim: Forklift, isi: PackageOpen,
  pakai: Flame, input: TabletSmartphone, stok: MonitorDown, tutup: Moon,
};
const FPS = 30;
// Loncat babak: mulai setelah kamera selesai pindah (0,8 detik). Reduced motion: gambar diam di pose akhir babak.
const restTime = i => LOOP_STARTS[i] + (REDUCED ? BEATS[i].dur * 0.92 : 0.9);

// Animasi alur shift berulang (Three.js) dengan storyboard HTML sebagai fallback bila WebGL gagal.
// Saat berputar, data baru diterapkan di awal putaran berikutnya agar cerita tidak berubah di tengah jalan.
export default function StoryLoop({ story }) {
  const rootRef = useRef(null);
  const holderRef = useRef(null);
  const progressRef = useRef(null);
  const api = useRef(null);
  const tRef = useRef(REDUCED ? restTime(0) : 0);
  const beatRef = useRef(0);
  const pending = useRef(story);
  const shownRef = useRef(story);
  const playingRef = useRef(!REDUCED);
  const hoverRef = useRef(false);
  const visibleRef = useRef(true);
  const [looped, setLooped] = useState(story);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(!REDUCED);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false); // scene 3D sudah tergambar

  // Berhenti / reduced motion: tampilkan data terbaru. Berputar: data yang dikunci di awal putaran.
  const s = playing ? looped : story;

  // Scene + bar progres (tanpa state React; aman dipanggil dari effect maupun rAF).
  const paint = () => {
    const t = tRef.current;
    if (api.current) { api.current.setTime(t); api.current.render(); }
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${REDUCED ? 1 : beatAt(t).local})`;
  };
  const tick = () => {
    paint();
    const { index } = beatAt(tRef.current);
    if (index !== beatRef.current) { beatRef.current = index; setBeat(index); }
  };

  useEffect(() => { pending.current = story; });
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => {
    shownRef.current = s;
    api.current?.setData(s.scene);
    paint();
     
  }, [s]);

  // Scene 3D: dimuat saat komponen tampil; gagal (WebGL mati / chunk gagal) → storyboard.
  useEffect(() => {
    let cancelled = false;
    let ro;
    import('../lib/storyScene')
      .then(({ createStoryScene }) => {
        if (cancelled || !holderRef.current) return;
        api.current = createStoryScene(holderRef.current, shownRef.current.scene, { maxDpr: MOBILE ? 1 : 1.5, shadows: !MOBILE });
        ro = new ResizeObserver(([e]) => { api.current?.resize(e.contentRect.width, e.contentRect.height); paint(); });
        ro.observe(holderRef.current);
        setReady(true);
      })
      .catch(err => {
        console.warn('Animasi 3D tidak tersedia, memakai storyboard.', err);
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      ro?.disconnect();
      api.current?.dispose();
      api.current = null;
    };
     
  }, []);

  // Jam animasi 30 fps; berhenti saat dijeda, di-hover, di luar layar, atau tab tersembunyi.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; }, { threshold: 0.1 });
    if (rootRef.current) io.observe(rootRef.current);
    let raf, last = performance.now(), acc = 0;
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!playingRef.current || hoverRef.current || !visibleRef.current || document.hidden) return;
      acc += dt;
      if (acc < 1 / FPS) return;
      const next = tRef.current + acc;
      acc = 0;
      if (next >= LOOP && pending.current !== shownRef.current) setLooped(pending.current);
      tRef.current = next % LOOP;
      tick();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jam dibuat sekali; membaca ref
  }, []);

  const goTo = i => {
    tRef.current = restTime((i + BEATS.length) % BEATS.length);
    tick();
  };
  const togglePlay = () => {
    if (!playing) setLooped(story); // lanjut dengan data terbaru
    setPlaying(p => !p);
  };

  const b = s.beats[beat];
  const Icon = ICONS[b.id];

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <figure
        className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-[4px] border border-white/[0.08] bg-iron-900"
        onPointerEnter={() => { hoverRef.current = true; }}
        onPointerLeave={() => { hoverRef.current = false; }}
        aria-label={`Animasi alur shift, babak ${beat + 1} dari ${BEATS.length}: ${b.title}`}
      >
        <div ref={holderRef} className="absolute inset-0" />
        {!ready && !fallback && <Skel className="absolute inset-0 !rounded-none" />}
        {fallback && (
          <div className="absolute inset-0 grid place-items-center">
            <Icon size={56} strokeWidth={1.4} className="text-steel-dim" aria-hidden="true" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-iron-950/85 to-transparent px-3 pb-6 pt-2.5">
          <div className="min-w-0">
            <div className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-steel-dim">Babak {beat + 1}/{BEATS.length}</div>
            <div className="mt-0.5 truncate font-display text-[14px] font-semibold text-paper">{b.title}</div>
          </div>
          {s.contoh && <span className="shrink-0 rounded-[3px] border border-dashed border-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-steel">Contoh data</span>}
        </div>

        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-iron-950/95 via-iron-950/75 to-transparent px-3 pb-2.5 pt-8">
          {b.lines.map((line, k) => (
            <div key={k} className={`truncate ${k === 0 ? 'text-[12px] font-semibold text-paper' : 'mt-0.5 text-[11px] text-steel'}`}>{line}</div>
          ))}
          {b.target && (
            <div className="mt-1.5 inline-flex rounded-[3px] border border-white/15 bg-iron-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-steel">
              Alur target · integrasi aplikasi produksi belum aktif
            </div>
          )}
        </figcaption>
      </figure>

      <div className="flex items-center gap-2">
        {REDUCED ? (
          <button type="button" onClick={() => goTo(beat - 1)} aria-label="Babak sebelumnya" className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-white/[0.12] text-steel hover:text-paper">
            <ChevronLeft size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Jeda animasi' : 'Putar animasi'}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-white/[0.12] text-steel transition-colors hover:border-signal/60 hover:text-paper"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
        <ol className="m-0 flex flex-1 list-none gap-1 p-0">
          {BEATS.map((x, i) => (
            <li key={x.id} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Babak ${i + 1}: ${x.title}`}
                aria-current={i === beat ? 'step' : undefined}
                className="group block w-full py-2"
              >
                <span className="relative block h-1 overflow-hidden rounded-full bg-iron-700 transition-colors group-hover:bg-iron-600">
                  <span
                    ref={i === beat ? progressRef : undefined}
                    className={`absolute inset-0 origin-left rounded-full ${i < beat ? 'bg-steel-dim' : i === beat ? 'bg-signal' : ''}`}
                    style={i === beat ? undefined : { transform: 'scaleX(1)' }} // reset progres yang ditulis paint() saat segmen ini aktif
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        {REDUCED && (
          <button type="button" onClick={() => goTo(beat + 1)} aria-label="Babak berikutnya" className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-white/[0.12] text-steel hover:text-paper">
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
