import { AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';

export default function Modal() {
  const { modal, closeModal } = useStore();
  if (!modal.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[5px] border border-white/[0.12] bg-iron-850 shadow-2xl animate-fadeInScale">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-signal/30 bg-signal/10">
              <AlertTriangle size={17} className="text-signal" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold leading-snug text-paper">{modal.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-steel-dim">{modal.body}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-outline btn-sm" onClick={closeModal}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={() => { closeModal(); modal.onOk?.(); }}>
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
