import { AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';

export default function Modal() {
  const { modal, closeModal } = useStore();
  if (!modal.open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-[400px] shadow-2xl border border-slate-100 dark:border-slate-700 animate-[fadeInScale_150ms_ease-out]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug">{modal.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{modal.body}</p>
          </div>
        </div>
        <div className="flex gap-2.5 justify-end mt-5">
          <button className="btn btn-outline btn-sm" onClick={closeModal}>Batal</button>
          <button className="btn btn-success btn-sm" onClick={() => { closeModal(); modal.onOk?.(); }}>
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
