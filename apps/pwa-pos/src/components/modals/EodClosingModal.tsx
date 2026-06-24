import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Lock,
  X,
  WifiOff,
  Save,
  CreditCard,
  Banknote,
} from "lucide-react";
import { useToast } from "../Toast";
import { SmartInput } from "../shared/keyboard/SmartInput";
import { usePos } from "../../core/PosProvider";
import { exportLedgerToJson } from "../../core/instances";
import { calculateShiftExpectedTotals } from "../../core/hooks/useReportCalculations";

interface EodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemCash: number; // expected ending cash (initialCash + cashSales - pettyCash - refunds)
  activeTablesCount: number;
}

export const EodClosingModal: React.FC<EodClosingModalProps> = ({
  isOpen,
  onClose,
  systemCash,
  activeTablesCount,
}) => {
  const { showToast } = useToast();
  const { state, executeEndOfDay } = usePos();
  const [step, setStep] = useState<"BLOCKED" | "INPUT" | "CONFIRM">("INPUT");
  const [actualCash, setActualCash] = useState("");
  const [actualNonCash, setActualNonCash] = useState("");
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(activeTablesCount > 0 ? "BLOCKED" : "INPUT");
      setActualCash("");
      setActualNonCash("");
      setReason("");
    }
  }, [isOpen, activeTablesCount]);

  if (!isOpen) return null;

  // expectedCash = systemCash (full formula from parent: initialCash + cashSales - pettyCash - refunds)
  const expectedCash = systemCash;
  // expectedNonCash = derived from transaction log (EDC/QRIS/etc sales minus non-cash refunds)
  const { expectedNonCash } = calculateShiftExpectedTotals(
    state?.transactions || [],
  );

  const actCashNum = Number(actualCash) || 0;
  const actNonCashNum = Number(actualNonCash) || 0;
  const cashDiff = actCashNum - expectedCash;
  const nonCashDiff = actNonCashNum - expectedNonCash;
  const hasCashDiff = cashDiff !== 0;
  const hasNonCashDiff = nonCashDiff !== 0;
  const hasDiff = hasCashDiff || hasNonCashDiff;

  const handleNext = () => {
    if (!actualCash) {
      showToast("Harap isi nominal uang tunai fisik!", "ERROR");
      return;
    }
    if (!actualNonCash) {
      showToast("Harap isi nominal total non-tunai (EDC/QRIS)!", "ERROR");
      return;
    }
    setStep("CONFIRM");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasDiff && !reason) {
      showToast("Wajib memilih catatan kebijakan atas selisih!", "ERROR");
      return;
    }

    if (hasDiff) {
      const msg =
        `Terdapat selisih pada rekonsiliasi:\n` +
        (hasCashDiff
          ? `• Tunai: ${cashDiff > 0 ? "+" : ""}Rp ${cashDiff.toLocaleString("id-ID")}\n`
          : "") +
        (hasNonCashDiff
          ? `• Non-Tunai: ${nonCashDiff > 0 ? "+" : ""}Rp ${nonCashDiff.toLocaleString("id-ID")}\n`
          : "") +
        `\nKonfirmasi dan lanjutkan penutupan?`;
      if (!window.confirm(msg)) return;
    }

    setIsProcessing(true);
    try {
      if (isOffline) {
        console.warn(
          "⚠️ INTERNET TERPUTUS SAAT EOD! Memicu pencadangan JSON Otomatis...",
        );
        const branchId = state?.branchId || "UNKNOWN-CABANG";
        await exportLedgerToJson(branchId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      await executeEndOfDay(
        actCashNum,
        expectedCash,
        cashDiff,
        actNonCashNum,
        expectedNonCash,
        nonCashDiff,
        reason || "SESUAI",
      );

      if (isOffline) {
        alert(
          "EOD Berhasil!\n\nKARENA INTERNET MATI, sebuah file 'Backup_EOD.json' telah diunduh ke perangkat ini. Mohon amankan file tersebut dan upload di PC / Server jika internet sudah menyala!",
        );
      } else {
        showToast(
          "Proses End of Day berhasil. Transaksi dibersihkan.",
          "SUCCESS",
        );
      }
      onClose();
    } catch (err: any) {
      showToast(err.message, "ERROR");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[999] backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border flex flex-col animate-in fade-in zoom-in-95">
        {step === "BLOCKED" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert size={40} className="text-red-600" />
            </div>
            <h3 className="font-black text-xl text-slate-900 uppercase tracking-widest">
              Akses Closing Ditolak!
            </h3>
            <p className="text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              Sistem mendeteksi masih ada{" "}
              <span className="text-red-600 font-black text-lg">
                {activeTablesCount}
              </span>{" "}
              transaksi meja gantung (Open Bill) yang belum dilunasi.
              <br />
              <br />
              Harap selesaikan pembayaran atau lakukan prosedur VOID pada meja
              tersebut sebelum sistem mengizinkan eksekusi End of Day.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-colors shadow-md mt-4"
            >
              Kembali ke Dashboard POS
            </button>
          </div>
        )}

        {step === "INPUT" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Lock size={22} className="text-orange-600" />
                <h4 className="font-black text-sm uppercase tracking-wider">
                  Gerbang Closing (End of Day)
                </h4>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              PERINGATAN AUDIT: Hitung fisik uang tunai di laci dan total struk
              EDC/QRIS secara manual. Angka ekspektasi sistem sengaja
              disembunyikan (<em>Blind Close</em>) untuk mendeteksi manipulasi.
            </p>

            {isOffline && (
              <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-2">
                <WifiOff
                  size={16}
                  className="text-orange-600 mt-0.5 shrink-0"
                />
                <p className="text-[10px] font-bold text-orange-800">
                  INTERNET TERPUTUS. Sistem akan otomatis mendownload file JSON
                  backup setelah proses ini selesai.
                </p>
              </div>
            )}

            <div className="pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                <Banknote size={12} /> Total Fisik Uang Tunai Laci (Rp)
              </label>
              <SmartInput
                type="number"
                required
                value={actualCash}
                onChange={(val) => setActualCash(val.replace(/\D/g, ""))}
                placeholder="Hitung laci — masukkan total nominal"
                className="w-full px-4 py-4 bg-white border-2 border-slate-200 focus:border-orange-500 rounded-xl text-xl font-black focus:outline-none transition-colors shadow-inner text-slate-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                <CreditCard size={12} /> Total Non-Tunai EDC / QRIS (Rp)
              </label>
              <SmartInput
                type="number"
                required
                value={actualNonCash}
                onChange={(val) => setActualNonCash(val.replace(/\D/g, ""))}
                placeholder="Total struk EDC + QRIS hari ini"
                className="w-full px-4 py-4 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-xl font-black focus:outline-none transition-colors shadow-inner text-slate-900"
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              Lanjut ke Rekonsiliasi <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === "CONFIRM" && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 animate-in slide-in-from-right-4"
          >
            <div className="flex items-center gap-2 text-slate-900 mb-2 border-b border-slate-100 pb-3">
              <CheckCircle size={20} className="text-emerald-600" />
              <h4 className="font-black text-sm uppercase tracking-wider">
                Verifikasi Selisih Finansial
              </h4>
            </div>

            {/* Cash reconciliation card */}
            <div
              className={`p-4 rounded-2xl border-2 ${hasCashDiff ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Banknote
                  size={16}
                  className={
                    hasCashDiff ? "text-amber-600" : "text-emerald-600"
                  }
                />
                <span
                  className={`text-xs font-black uppercase ${hasCashDiff ? "text-amber-800" : "text-emerald-800"}`}
                >
                  TUNAI:{" "}
                  {cashDiff === 0
                    ? "SESUAI"
                    : cashDiff > 0
                      ? "LEBIH (OVERAGE)"
                      : "KURANG (SHORTAGE)"}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>Input Kasir:</span>
                <span className="font-black">
                  Rp {actCashNum.toLocaleString("id-ID")}
                </span>
              </div>
              {hasCashDiff && (
                <div className="flex justify-between text-sm font-bold text-amber-700 mt-1 bg-amber-100/60 px-2 py-1 rounded-lg">
                  <span>Selisih Tunai:</span>
                  <span className="font-black">
                    {cashDiff > 0 ? "+" : ""}Rp{" "}
                    {cashDiff.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>

            {/* Non-cash reconciliation card */}
            <div
              className={`p-4 rounded-2xl border-2 ${hasNonCashDiff ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard
                  size={16}
                  className={
                    hasNonCashDiff ? "text-amber-600" : "text-emerald-600"
                  }
                />
                <span
                  className={`text-xs font-black uppercase ${hasNonCashDiff ? "text-amber-800" : "text-emerald-800"}`}
                >
                  NON-TUNAI:{" "}
                  {nonCashDiff === 0
                    ? "SESUAI"
                    : nonCashDiff > 0
                      ? "LEBIH (OVERAGE)"
                      : "KURANG (SHORTAGE)"}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-700">
                <span>Input Kasir:</span>
                <span className="font-black">
                  Rp {actNonCashNum.toLocaleString("id-ID")}
                </span>
              </div>
              {hasNonCashDiff && (
                <div className="flex justify-between text-sm font-bold text-amber-700 mt-1 bg-amber-100/60 px-2 py-1 rounded-lg">
                  <span>Selisih Non-Tunai:</span>
                  <span className="font-black">
                    {nonCashDiff > 0 ? "+" : ""}Rp{" "}
                    {nonCashDiff.toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>

            {hasDiff && (
              <div className="animate-in fade-in slide-in-from-top-2 pt-1">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">
                  Klasifikasi Catatan Selisih (Wajib)
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-4 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-xl text-xs font-black uppercase focus:outline-none transition-colors cursor-pointer text-slate-800 shadow-sm"
                >
                  <option value="">-- PILIH KEBIJAKAN AKUNTANSI --</option>

                  {/* [FIX] Jika terjadi selisih campuran (+ dan -) di saat yang sama */}
                  {hasCashDiff &&
                  hasNonCashDiff &&
                  ((cashDiff > 0 && nonCashDiff < 0) ||
                    (cashDiff < 0 && nonCashDiff > 0)) ? (
                    <>
                      <option value="SALAH METODE PEMBAYARAN (CROSS-PAYMENT ERROR)">
                        Salah Input Metode Pembayaran (Cross-Payment)
                      </option>
                      <option value="TINJAUAN MANUAL AUDIT PUSAT">
                        Membutuhkan Tinjauan Manual (Audit Pusat)
                      </option>
                    </>
                  ) : /* Jika hanya lebih murni (Overage) */
                  (hasCashDiff && cashDiff > 0) ||
                    (hasNonCashDiff && nonCashDiff > 0) ? (
                    <>
                      <option value="PENDAPATAN LAIN (MASUK KAS)">
                        Pendapatan Lain-lain (Masuk Kas Ruko)
                      </option>
                      <option value="UANG TIP BERSAMA (DITAHAN KASIR)">
                        Uang Tip Bersama (Ditahan Kasir / Karyawan)
                      </option>
                    </>
                  ) : (
                    /* Jika hanya kurang murni (Shortage) */
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

            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mt-2">
              <p className="text-[9px] font-bold text-red-600 uppercase leading-relaxed text-center">
                Tindakan ini akan mengunci shift secara permanen, mengirimkan
                paksa sinkronisasi final ke server, dan membersihkan memori
                transaksi hari ini dari mesin tablet ini.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                disabled={isProcessing}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-colors"
              >
                Hitung Ulang
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase shadow-md cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  "Memproses..."
                ) : (
                  <>
                    <Save size={16} /> Eksekusi Closing
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
