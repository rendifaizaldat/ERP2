import React, { useState } from "react";
import {
  ShieldAlert,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";

interface SidebarReconModalProps {
  showReconModal: boolean;
  setShowReconModal: (show: boolean) => void;
  actualCash: string;
  setActualCash: (cash: string) => void;
  handleLogoutSubmit: (
    actualCash: number,
    systemCash: number,
    difference: number,
    reason: string,
  ) => Promise<void>;
}

export const SidebarReconModal = ({
  showReconModal,
  setShowReconModal,
  actualCash,
  setActualCash,
  handleLogoutSubmit,
}: SidebarReconModalProps) => {
  const { state, currentOperator } = usePos();
  const { showToast } = useToast();

  const [step, setStep] = useState<"INPUT" | "CONFIRM">("INPUT");
  const [reason, setReason] = useState("");

  // Membaca Kalkulasi langsung dari Projection
  const calculations = state?.recon || {
    systemCash: 0,
    activeTables: 0,
    voidRefundCount: 0,
  };

  const actCashNum = Number(actualCash) || 0;
  const difference = actCashNum - calculations.systemCash;
  const isDiff = difference !== 0;

  const handleNextStep = () => {
    if (!actualCash) {
      showToast("Harap masukkan total fisik uang tunai di laci!", "ERROR");
      return;
    }
    setStep("CONFIRM");
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDiff && !reason) {
      showToast("Wajib memilih catatan kebijakan atas selisih kas!", "ERROR");
      return;
    }

    // Susun Data Operan (Handover) untuk Shift 2
    const handoverData = {
      previousStaffId: currentOperator?.id || "UNKNOWN",
      previousStaffName: currentOperator?.name || "KASIR",
      actualCash: actCashNum,
      systemCash: calculations.systemCash,
      difference: difference,
      differenceReason: reason || "UANG SESUAI",
      activeTablesCount: calculations.activeTables,
      voidRefundCount: calculations.voidRefundCount,
      timestamp: new Date().toISOString(),
    };

    // Simpan ke Memori Lokal sebagai Titipan Operan
    localStorage.setItem("ASSTRO_HANDOVER_DATA", JSON.stringify(handoverData));

    // Eksekusi fungsi logout parent dengan data finansial lengkap
    await handleLogoutSubmit(actCashNum, calculations.systemCash, difference, reason || "UANG SESUAI");

    // Reset internal state
    setStep("INPUT");
    setReason("");
  };

  if (!showReconModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-90 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border flex flex-col">
        {step === "INPUT" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <ShieldAlert size={22} />
              <h4 className="font-black text-sm uppercase tracking-wider">
                Gerbang Tukar Shift (Blind Audit)
              </h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              PERINGATAN AUDIT: Hitung total seluruh fisik uang tunai di dalam
              laci saat ini. Angka ekspektasi sistem sengaja disembunyikan
              (*Blind Reconciliation*) untuk mendeteksi manipulasi finansial.
            </p>

            <div className="pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Total Fisik Uang Tunai Di Laci (Rp)
              </label>
              <input
                type="text"
                required
                autoFocus
                value={actualCash}
                onChange={(e) =>
                  setActualCash(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Masukkan total uang laci asli"
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-red-500 rounded-xl text-lg font-black focus:outline-none transition-colors shadow-inner text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowReconModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-xs uppercase cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                Lanjut <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "CONFIRM" && (
          <form
            onSubmit={handleFinalSubmit}
            className="space-y-4 animate-fade-in"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-slate-900">
                <FileText size={20} className="text-orange-600" />
                <h4 className="font-black text-sm uppercase tracking-wider">
                  Konfirmasi Operan
                </h4>
              </div>
            </div>

            {/* Resume Tanggungan */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl">
                <span className="text-[10px] font-black uppercase text-orange-600 block mb-0.5">
                  Meja Aktif (Gantung)
                </span>
                <span className="text-xl font-black text-slate-900">
                  {calculations.activeTables}{" "}
                  <span className="text-xs text-slate-500">Meja</span>
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                <span className="text-[10px] font-black uppercase text-red-600 block mb-0.5">
                  Riwayat Batal/Void
                </span>
                <span className="text-xl font-black text-slate-900">
                  {calculations.voidRefundCount}{" "}
                  <span className="text-xs text-slate-500">Trx</span>
                </span>
              </div>
            </div>

            {/* Evaluasi Uang Fisik */}
            <div
              className={`p-4 rounded-xl border-2 ${isDiff ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isDiff ? (
                  <AlertTriangle size={16} className="text-amber-600" />
                ) : (
                  <CheckCircle size={16} className="text-emerald-600" />
                )}
                <span
                  className={`text-xs font-black uppercase ${isDiff ? "text-amber-800" : "text-emerald-800"}`}
                >
                  {difference === 0
                    ? "UANG FISIK SESUAI SISTEM"
                    : difference > 0
                      ? "UANG FISIK LEBIH (OVERAGE)"
                      : "UANG FISIK KURANG (SHORTAGE)"}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold border-t border-dashed pt-2 mt-2 border-slate-300/50 text-slate-700">
                <span>Input Kasir:</span>
                <span className="text-slate-900 font-black">
                  Rp {actCashNum.toLocaleString("id-ID")}
                </span>
              </div>

              {isDiff && (
                <div className="flex justify-between items-center text-sm font-bold text-amber-700 mt-1">
                  <span>Selisih (Variance):</span>
                  <span className="font-black">
                    {difference > 0 ? "+" : ""} Rp{" "}
                    {difference.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>

            {/* Dropdown Kebijakan Selisih */}
            {isDiff && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  Klasifikasi Catatan Selisih (Wajib)
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-3 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-xl text-xs font-black uppercase focus:outline-none transition-colors cursor-pointer text-slate-800"
                >
                  <option value="">-- PILIH KEBIJAKAN AKUNTANSI --</option>
                  {difference > 0 ? (
                    <>
                      <option value="PENDAPATAN LAIN (MASUK KAS)">
                        Pendapatan Lain-lain (Masuk Kas Ruko)
                      </option>
                      <option value="UANG TIP BERSAMA (DITAHAN KASIR)">
                        Uang Tip Bersama (Ditahan Kasir / Karyawan)
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="PIUTANG KARYAWAN (POTONG GAJI)">
                        Piutang Karyawan (Dipotong Gaji Kasir)
                      </option>
                      <option value="BEBAN KEHILANGAN (TANGGUNGAN RUKO)">
                        Beban Kehilangan (Tanggungan Ruko)
                      </option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-xs uppercase cursor-pointer transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-md cursor-pointer transition-colors"
              >
                Setuju & Logout
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
