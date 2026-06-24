import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
}

export const PusatPiutangExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExportExcel,
  onExportPDF,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 border border-slate-200">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-2">
          Format Export
        </h3>
        <p className="text-xs font-bold text-slate-400 mb-6">
          Silahkan pilih format file untuk mencetak data piutang ini.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onExportExcel}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
          >
            <FileSpreadsheet
              size={32}
              className="text-emerald-500 group-hover:scale-110 transition-transform"
            />
            <span className="font-black text-[10px] uppercase tracking-widest text-emerald-700">
              EXCEL (.xlsx)
            </span>
          </button>
          <button
            onClick={onExportPDF}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-100 bg-red-50 hover:bg-red-100 transition-colors group"
          >
            <FileText
              size={32}
              className="text-red-500 group-hover:scale-110 transition-transform"
            />
            <span className="font-black text-[10px] uppercase tracking-widest text-red-700">
              PDF (.pdf)
            </span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
