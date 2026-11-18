import { RefreshCw, CloudOff } from 'lucide-react';

// Blok skeleton. Ukuran lewat className (h-*, w-*); shimmer & penundaan muncul ada di index.css (.skel).
export function Skel({ className = '' }) {
  return <span className={`skel block ${className}`} />;
}

// Blok di dalam wadah setinggi line-height teks aslinya, supaya tinggi skeleton = tinggi konten.
function Line({ h, className }) {
  return <div className={`flex items-center ${h}`}><Skel className={className} /></div>;
}

function HeadSkel({ meta = 'w-44' }) {
  return (
    <div className="tile-head">
      <div>
        <Line h="h-[13px]" className="h-2.5 w-24" />
        <div className="mt-1.5"><Line h="h-[17px]" className={`h-2.5 ${meta}`} /></div>
      </div>
    </div>
  );
}

// Skeleton seukuran Dashboard (kelas tile/bento sama) agar tidak ada pergeseran layout saat data datang.
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1480px] p-4 md:p-7" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat dashboard…</span>
      <div className="skel-reveal" aria-hidden="true">
        <div className="page-head">
          <div className="flex flex-col gap-3">
            <Skel className="h-9 w-52 md:h-10" />
            <div className="flex flex-wrap gap-2"><Skel className="h-4 w-48" /><Skel className="h-5 w-36" /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Skel className="h-8 w-48" /><Skel className="h-8 w-32" /></div>
        </div>

        <div className="flex flex-col gap-3">
          <Skel className="h-[46px] w-full !rounded-[5px]" />

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex min-w-0 flex-col bg-iron-850 px-4 py-3.5">
                <Line h="h-[13px]" className="h-2.5 w-20" />
                <Skel className="mt-2 h-[30px] w-28" />
                <Line h="h-[26px]" className="h-1.5 w-full" />
                <Line h="h-[17px]" className="h-2.5 w-32" />
              </div>
            ))}
          </div>

          <div className="bento">
            <section className="tile md:col-span-12">
              <HeadSkel meta="w-64" />
              <div className="tile-body grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col bg-iron-850 p-3">
                      <Line h="h-4" className="h-3 w-12" />
                      <Skel className="mt-2 h-[26px] w-20" />
                      <div className="mt-1"><Line h="h-[17px]" className="h-2.5 w-28" /></div>
                    </div>
                  ))}
                </div>
                <div className="grid content-start gap-3 sm:grid-cols-2">
                  {[0, 1].map(i => (
                    <div key={i}>
                      <Line h="h-[13px]" className="h-2.5 w-24" />
                      <Skel className="mt-1.5 h-[18px] w-20" />
                      <Line h="h-[17px]" className="h-2.5 w-28" />
                    </div>
                  ))}
                  <Skel className="h-[92px] w-full sm:col-span-2" />
                </div>
              </div>
            </section>

            <section className="tile md:col-span-8">
              <HeadSkel meta="w-72" />
              <div className="tile-body">
                <div className="hidden h-[19px] pb-2 sm:block"><Skel className="h-2 w-full" /></div>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-white/[0.05] py-2.5 first:border-t-0 sm:grid-cols-[28px_minmax(110px,1.1fr)_minmax(120px,2fr)_76px_92px]">
                    <Skel className="h-7 w-7" />
                    <div className="flex flex-col gap-2"><Skel className="h-4 w-24" /><Skel className="h-3.5 w-32" /></div>
                    <Skel className="col-span-2 col-start-2 h-2 w-full sm:col-span-1 sm:col-start-auto" />
                    <Skel className="hidden h-3 w-14 justify-self-end sm:block" />
                    <div className="col-start-3 row-start-1 flex flex-col items-end gap-1.5 sm:col-start-auto sm:row-start-auto"><Skel className="h-4 w-14" /><Skel className="h-3.5 w-12" /></div>
                  </div>
                ))}
                <div className="mt-2 border-t border-white/[0.06] pt-3"><Skel className="h-[26px] w-48" /></div>
              </div>
            </section>

            <section className="tile md:col-span-4">
              <HeadSkel />
              <div className="tile-body flex flex-col gap-2">
                <Skel className="aspect-[4/3] w-full" />
                <div className="flex items-center gap-2"><Skel className="h-8 w-8" /><Skel className="h-1 flex-1" /></div>
              </div>
            </section>

            <section className="tile md:col-span-12">
              <HeadSkel meta="w-80" />
              <div className="tile-body"><Skel className="h-[420px] w-full md:h-[500px]" /></div>
            </section>

            <section className="tile md:col-span-7">
              <HeadSkel meta="w-56" />
              <div className="tile-body flex flex-col gap-2.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="grid h-4 grid-cols-[minmax(84px,120px)_minmax(0,1fr)_48px] items-center gap-2.5">
                    <Skel className="h-3 w-20" /><Skel className="h-1.5 w-full" /><Skel className="h-3 w-10 justify-self-end" />
                  </div>
                ))}
                <div className="h-3" />
              </div>
            </section>

            <section className="tile md:col-span-5">
              <HeadSkel meta="w-32" />
              <div className="tile-body"><div className="mb-3"><Line h="h-[17px]" className="h-2.5 w-48" /></div><Skel className="h-[180px] w-full sm:h-[210px]" /></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gagal memuat data awal: jelaskan dan beri tombol coba lagi (bukan teks polos).
export function BootError({ onRetry }) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-[1480px] place-items-center p-4 md:p-7" role="alert">
      <div className="tile w-full max-w-md">
        <div className="tile-body flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-danger"><CloudOff size={20} /></span>
          <h1 className="font-display text-xl font-semibold text-paper">Data belum bisa dimuat</h1>
          <p className="max-w-[320px] text-sm leading-relaxed text-steel">
            MatPrep tidak terhubung ke database. Periksa koneksi jaringan, lalu coba lagi. Data yang sudah tersimpan tidak hilang.
          </p>
          <button type="button" className="btn btn-primary btn-sm mt-1" onClick={onRetry}>
            <RefreshCw size={14} />Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
