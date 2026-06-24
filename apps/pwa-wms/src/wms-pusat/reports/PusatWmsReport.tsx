import React, { useState } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

export const PusatWmsReport: React.FC = () => {
  const { wmsState } = useWms();
  const { showToast } = useToast();
  const isPusat = wmsState?.wmsType === "PUSAT";

  // --- STATE FILTER ---
  const [reportType, setReportType] = useState("INVENTORY_MOVEMENT");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = () => {
    setIsGenerated(true);
    showToast("Memuat Laporan...", "INFO");
    // Simulasi loading data
    setTimeout(() => {
      showToast("Laporan berhasil di-generate!", "SUCCESS");
    }, 800);
  };

  const handleExport = (type: "PDF" | "CSV") => {
    if (!isGenerated) {
      showToast("Silakan Generate laporan terlebih dahulu!", "WARNING");
      return;
    }
    showToast(`Mengekspor laporan ke format ${type}...`, "SUCCESS");
  };

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <FileText className="text-indigo-600" />
          Laporan & Analitik Gudang
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          {isPusat
            ? "Pusat Rekapitulasi Data Inventory, PO, dan Hutang"
            : "Rekapitulasi Penerimaan, Retur, dan Piutang Mutasi"}
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Filter size={12} /> Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setIsGenerated(false);
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="INVENTORY_MOVEMENT">
                Pergerakan Stok (In/Out)
              </option>
              <option value="PURCHASE_HISTORY">Riwayat Pembelian (PO)</option>
              {isPusat && (
                <option value="VENDOR_PAYABLE">Rekap Hutang Vendor</option>
              )}
              <option value="STOCK_OPNAME_LOG">Log Stock Opname</option>
            </select>
          </div>

          <div className="w-full md:w-1/3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
              <Calendar size={12} /> Periode Tanggal
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setIsGenerated(false);
                }}
                className="w-full bg-transparent text-xs font-bold uppercase outline-none px-2 py-1.5 text-slate-700"
              />
              <span className="text-slate-400 font-black">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setIsGenerated(false);
                }}
                className="w-full bg-transparent text-xs font-bold uppercase outline-none px-2 py-1.5 text-slate-700"
              />
            </div>
          </div>

          <div className="w-full md:w-1/3 flex gap-2">
            <button
              onClick={handleGenerate}
              className="flex-1 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* HASIL LAPORAN (Hanya tampil setelah klik Generate) */}
      {isGenerated ? (
        <div className="space-y-6 animate-slide-up">
          {/* SUMMARY CARDS (Dummy Data Analitik) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Barang Masuk
                </p>
                <h4 className="text-2xl font-black text-slate-800">
                  1,240{" "}
                  <span className="text-[10px] text-slate-400 uppercase">
                    Item
                  </span>
                </h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <TrendingDown size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Barang Keluar
                </p>
                <h4 className="text-2xl font-black text-slate-800">
                  890{" "}
                  <span className="text-[10px] text-slate-400 uppercase">
                    Item
                  </span>
                </h4>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nilai Transaksi (Estimasi)
                </p>
                <h4 className="text-2xl font-black text-slate-800">Rp 12.5M</h4>
              </div>
            </div>
          </div>

          {/* TABEL PREVIEW */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Preview Data: {reportType.replace(/_/g, " ")}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("CSV")}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-600 flex items-center gap-2 transition-colors"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={() => handleExport("PDF")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download size={14} /> PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Referensi Dokumen</th>
                    <th className="px-6 py-4">SKU / Barang</th>
                    <th className="px-6 py-4 text-center">Tipe Transaksi</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* DUMMY ROW DATA */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                      12 Jun 2026
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-indigo-600 uppercase">
                      PO-20260612-001
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-slate-800 uppercase block">
                        Beras Premium
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        BRG-001
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest">
                        IN (Masuk)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">
                      50 Kg
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                      13 Jun 2026
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-orange-600 uppercase">
                      OPN-20260613-099
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-xs text-slate-800 uppercase block">
                        Minyak Goreng 2L
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        BRG-002
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest">
                        ADJ (Penyesuaian)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700">
                      -2 Pcs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Menampilkan 2 dari 2 baris (Preview Mode)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-20 text-center bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center">
          <FileText size={48} className="text-slate-200 mb-4" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">
            Area Laporan Kosong
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Sesuaikan filter di atas dan klik Generate untuk memuat data
            laporan.
          </p>
        </div>
      )}
    </div>
  );
};
