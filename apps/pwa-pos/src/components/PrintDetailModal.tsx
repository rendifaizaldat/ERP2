import React from "react";
import { Printer, X, FileText, Clock, User } from "lucide-react";
import { usePos } from "../core/PosProvider"; // <-- Import Hook Global State

interface PrintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string | null;
  cart: any[];
  operatorName: string;
  onExecuteReprint: (isWatermarked: boolean) => void;
}

export const PrintDetailModal: React.FC<PrintDetailModalProps> = ({
  isOpen,
  onClose,
  tableLabel,
  cart,
  operatorName,
  onExecuteReprint,
}) => {
  const { state } = usePos();

  if (!isOpen) return null;

  // =========================================================================
  // MEMBACA KONFIGURASI STRUK & PRINTER
  // =========================================================================
  const strukSettings = state?.settings?.struk || {
    header: "ASSTRO HOLDING ECOSYSTEM\nJl. Raya Enterprise No.1",
    footer: "Terima Kasih Atas Kunjungan Anda",
    paperSize: "58mm",
    showCashier: true,
    timestampFormat: "DD/MM/YYYY HH:mm",
  };
  const printerSettings = state?.settings?.printer || { copy: 1 };

  // Menentukan lebar preview berdasarkan setting kertas thermal
  const is80mm = strukSettings.paperSize.includes("80mm");
  const thermalWidthClass = is80mm ? "w-[320px]" : "w-[240px]";

  // Format tanggal statis untuk preview struk
  const currentTimestamp = new Date().toLocaleString("id-ID");

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-300 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 flex flex-col max-h-[90vh] text-sm overflow-hidden">
        {/* Header Modal */}
        <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
          <div>
            <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-2 text-slate-800">
              <FileText size={18} className="text-orange-600" /> Print Center /
              Thermal Preview
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Target Mesin: Printer Utama Kasir
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 bg-slate-100 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden gap-6">
          {/* SISI KIRI: Audit & Panel Aksi */}
          <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-2">
            <div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs font-bold uppercase text-slate-500 mb-4 tracking-tight shrink-0">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span>Operator</span>
                  <span className="text-slate-900 font-black">
                    {operatorName}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span>Status Tiket</span>
                  <span className="text-emerald-600 font-black">Valid</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span>Format Kertas</span>
                  <span className="text-slate-900 font-black">
                    {strukSettings.paperSize}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Jumlah Salinan (Copy)</span>
                  <span className="text-slate-900 font-black">
                    {printerSettings.copy} Lembar
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">
                Log Item Pesanan:
              </span>
              <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 mb-4 max-h-40 overflow-y-auto scrollbar-thin">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 text-[11px] font-black uppercase text-slate-800 flex justify-between items-center shadow-sm"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{item.name}</span>
                      {item.note && (
                        <span className="text-[9px] text-orange-600 italic font-bold">
                          Ket: {item.note}
                        </span>
                      )}
                    </div>
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] text-slate-900 font-black shrink-0">
                      x{item.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="grid grid-cols-2 gap-3 shrink-0 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onExecuteReprint(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase py-3.5 rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Print Slip Asli
              </button>
              <button
                type="button"
                onClick={() => onExecuteReprint(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95"
              >
                <Printer size={14} /> Reprint (Copy)
              </button>
            </div>
          </div>

          {/* SISI KANAN: PREVIEW KERTAS THERMAL */}
          <div className="shrink-0 flex justify-center bg-slate-200 rounded-3xl p-4 overflow-y-auto shadow-inner border border-slate-300">
            {/* Simulasi Kertas Thermal */}
            <div
              className={`${thermalWidthClass} bg-white shadow-md p-4 font-mono text-[10px] leading-tight text-slate-800 min-h-[300px]`}
            >
              {/* Header Dinamis */}
              <div className="text-center mb-4 whitespace-pre-wrap font-bold">
                {strukSettings.header || "ASSTRO HOLDING"}
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-1">
                <div className="flex justify-between">
                  <span>WAKTU</span>
                  <span>{currentTimestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span>MEJA</span>
                  <span>{tableLabel || "TAKE AWAY"}</span>
                </div>
                {strukSettings.showCashier && (
                  <div className="flex justify-between">
                    <span>KASIR</span>
                    <span>{operatorName.substring(0, 15)}</span>
                  </div>
                )}
              </div>

              {/* Rincian Produk */}
              <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate pr-2">
                      {item.qty}x {item.name.substring(0, is80mm ? 20 : 12)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Dinamis */}
              <div className="text-center mt-4 pt-2 whitespace-pre-wrap font-bold">
                {strukSettings.footer || "Terima Kasih"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
