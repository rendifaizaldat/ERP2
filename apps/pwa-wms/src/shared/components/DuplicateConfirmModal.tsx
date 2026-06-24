import React from "react";
import { AlertTriangle } from "lucide-react";

interface DuplicateConfirmModalProps {
  isOpen: boolean;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DuplicateConfirmModal: React.FC<DuplicateConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <AlertTriangle size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
            Perhatian: Indikasi Duplikat!
          </h3>
          <div className="text-xs font-bold text-slate-600 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 leading-relaxed text-left">
            {message}
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
            Apakah Anda yakin ini adalah transaksi baru dan bukan input ganda?
          </p>
        </div>
        <div className="flex border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onCancel}
            className="flex-1 p-5 text-xs font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 uppercase tracking-widest transition-colors"
          >
            Batal Simpan
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 p-5 text-xs font-black text-amber-600 hover:text-amber-700 hover:bg-amber-100 uppercase tracking-widest transition-colors border-l border-slate-100"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};
