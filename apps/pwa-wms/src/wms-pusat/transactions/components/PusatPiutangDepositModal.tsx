import React, { useState, useEffect } from "react";
import {
  X,
  WalletCards,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWms } from "../../../core/WmsProvider"; // Sesuaikan path jika perlu

interface PusatPiutangDepositModalProps {
  data: {
    outlet: string;
    currentBalance: number;
  } | null;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const PusatPiutangDepositModal: React.FC<
  PusatPiutangDepositModalProps
> = ({ data, onClose, onSubmit }) => {
  const { db } = useWms(); // Mengambil instance RxDB

  const [mutationType, setMutationType] = useState<"IN_LOAN" | "OUT_REFUND">(
    "IN_LOAN",
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  useEffect(() => {
    if (!data?.outlet || !db) return;

    setIsLoadingLedger(true);
    const subscription = db.wms_ledgers
      .find({
        selector: {
          outletId: data.outlet,
        },
      })
      .$ // Jadikan reaktif
      .subscribe({
        next: (docs) => {
          // Sort manual dari yang terbaru karena belum ada index sorting di schema
          const sortedDocs = docs
            .map((doc) => doc.toJSON())
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );

          setLedger(sortedDocs);
          setIsLoadingLedger(false);
        },
        error: (err) => {
          console.error("[RXDB_LEDGER_ERROR]", err);
          setIsLoadingLedger(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [data?.outlet, db]);

  // Reset form saat pindah tipe mutasi
  useEffect(() => {
    setAmount("");
    setNotes("");
    setProof(null);
  }, [mutationType]);

  if (!data) return null;

  const handleSubmit = async () => {
    const numAmount = Number(amount.replace(/\D/g, ""));
    if (numAmount <= 0) return;

    if (mutationType === "OUT_REFUND" && numAmount > data.currentBalance) {
      alert(
        "GAGAL: Nominal penarikan dana tidak boleh melebihi saldo aktif outlet!",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: crypto.randomUUID(),
        outletId: data.outlet,
        mutationType: mutationType,
        amount: numAmount,
        notes:
          notes ||
          (mutationType === "IN_LOAN"
            ? "Deposit / Pinjaman dari Outlet"
            : "Pencairan Saldo / Retur ke Outlet"),
        proofOfTransfer: proof ? proof.name : null,
        createdBy: "SYSTEM",
      };

      // Delegasikan ke PusatPiutang.tsx untuk dimasukkan ke wms_outbox
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error("[MUTATION_SUBMIT_ERROR]", error);
      alert("Gagal memproses mutasi saldo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMutationLabel = (type: string) => {
    switch (type) {
      case "IN_OVERPAYMENT":
        return {
          label: "Kelebihan Bayar",
          color: "text-emerald-600",
          sign: "+",
        };
      case "IN_LOAN":
        return {
          label: "Titip / Pinjam",
          color: "text-emerald-600",
          sign: "+",
        };
      case "IN_REFUND_VOID":
        return {
          label: "Refund Pembatalan (Void)",
          color: "text-emerald-600",
          sign: "+",
        };
      case "OUT_PAYMENT":
        return { label: "Potong Tagihan", color: "text-red-600", sign: "-" };
      case "OUT_REFUND":
        return { label: "Pencairan / Retur", color: "text-red-600", sign: "-" };
      default:
        return { label: type, color: "text-slate-600", sign: "" };
    }
  };

  // ... (Sisa kode UI Return di bawah ini SAMA PERSIS dengan referensi asli Anda)
  // Tidak ada perubahan pada markup HTML/Tailwind sama sekali.
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <WalletCards size={12} /> Kelola Saldo & Deposit
            </p>
            <h3 className="text-xl font-black uppercase tracking-tighter">
              {data.outlet}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* PANEL KIRI: BUKU BESAR (LEDGER HISTORY) */}
          <div className="md:w-5/12 p-6 border-r border-slate-100 bg-slate-50 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-md text-white mb-6 shrink-0 relative overflow-hidden">
              <WalletCards
                size={80}
                className="absolute -right-4 -bottom-4 text-white/5 rotate-12"
              />
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">
                  Total Saldo / Deposit Aktif
                </p>
                <h2 className="text-3xl font-black tracking-tighter">
                  Rp {data.currentBalance.toLocaleString("id-ID")}
                </h2>
              </div>
            </div>

            {/* Riwayat Mutasi */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 shrink-0">
                <History size={14} /> Buku Tabungan (Mutasi Saldo)
              </h4>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {isLoadingLedger ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Menarik Data...
                    </p>
                  </div>
                ) : ledger.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                    <AlertCircle size={20} className="mb-2 opacity-50" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Belum ada riwayat mutasi
                    </p>
                  </div>
                ) : (
                  ledger.map((mut: any) => {
                    const meta = getMutationLabel(mut.mutationType);
                    return (
                      <div
                        key={mut.id}
                        className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {meta.label}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {new Date(mut.createdAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                          <span className={`text-sm font-black ${meta.color}`}>
                            {meta.sign} Rp{" "}
                            {Number(mut.amount).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-2">
                          <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">
                            {mut.notes || "-"}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Saldo: Rp{" "}
                            {Number(mut.balanceAfter || 0).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* PANEL KANAN: FORM MUTASI MANUAL */}
          <div className="flex-1 p-6 bg-white flex flex-col overflow-y-auto">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-4">
              Buat Mutasi Saldo Baru
            </h4>

            {/* TOGGLE TIPE MUTASI */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 shrink-0">
              <button
                onClick={() => setMutationType("IN_LOAN")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                  mutationType === "IN_LOAN"
                    ? "bg-white text-emerald-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:bg-slate-200"
                }`}
              >
                <ArrowDownToLine size={14} /> Tambah Dana
              </button>
              <button
                onClick={() => setMutationType("OUT_REFUND")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${
                  mutationType === "OUT_REFUND"
                    ? "bg-white text-amber-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:bg-slate-200"
                }`}
              >
                <ArrowUpFromLine size={14} /> Tarik Dana
              </button>
            </div>

            <div
              className={`mb-6 p-4 rounded-xl border ${mutationType === "IN_LOAN" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-800"}`}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className={`shrink-0 mt-0.5 ${mutationType === "IN_LOAN" ? "text-emerald-500" : "text-amber-500"}`}
                />
                <p className="text-xs font-bold leading-relaxed">
                  {mutationType === "IN_LOAN"
                    ? "Gunakan form ini jika Outlet menitipkan dana atau Pusat meminjam dana darurat dari Outlet. Dana ini akan menambah total Saldo/Deposit yang bisa digunakan untuk memotong tagihan di masa depan."
                    : "Gunakan form ini untuk mencairkan atau mengembalikan dana Deposit milik Outlet. Aksi ini akan mengurangi total Saldo Outlet pada sistem."}
                </p>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Nominal Mutasi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={Number(amount || 0).toLocaleString("id-ID")}
                    onChange={(e) => {
                      const n = e.target.value.replace(/\D/g, "");
                      if (
                        mutationType === "OUT_REFUND" &&
                        Number(n) > data.currentBalance
                      ) {
                        setAmount(data.currentBalance.toString());
                      } else {
                        setAmount(n);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-800 outline-none focus:border-sky-500 transition-all"
                    placeholder="0"
                  />
                </div>
                {mutationType === "OUT_REFUND" && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1.5">
                    *Maksimal penarikan: Rp{" "}
                    {data.currentBalance.toLocaleString("id-ID")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Upload Bukti Transfer (Opsional)
                </label>
                <div className="border border-dashed border-slate-300 rounded-xl py-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative h-20">
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={18} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px] px-4">
                      {proof ? proof.name : "Pilih File Gambar / PDF"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setProof(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Catatan / Keterangan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    mutationType === "IN_LOAN"
                      ? "Contoh: Pinjaman dana kas dari Outlet Lembang"
                      : "Contoh: Retur kelebihan bayar invoice via BCA"
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                Number(amount) <= 0 ||
                (mutationType === "OUT_REFUND" &&
                  Number(amount) > data.currentBalance)
              }
              className={`w-full shrink-0 flex items-center justify-center gap-2 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed ${
                mutationType === "IN_LOAN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : mutationType === "IN_LOAN" ? (
                <ArrowDownToLine size={16} />
              ) : (
                <ArrowUpFromLine size={16} />
              )}
              {isSubmitting ? "Memproses..." : "Konfirmasi Mutasi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
