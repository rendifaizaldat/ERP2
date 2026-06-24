import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CreditCard,
  Upload,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Square,
  WalletCards,
  Info,
} from "lucide-react";

interface Props {
  data: any; // { outlet, items, total, totalBelum, currentBalance, ... }
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const PusatPiutangPaymentModal: React.FC<Props> = ({
  data,
  onClose,
  onSubmit,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [useDeposit, setUseDeposit] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter List Piutang yang masih gantung (UNPAID & PARTIAL)
  const payableItems = useMemo(() => {
    return (data?.items || [])
      .filter(
        (i: any) =>
          (i.status === "UNPAID" || i.status === "PARTIAL") &&
          i.docStatus !== "CANCELLED",
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
      ); // Sort FIFO
  }, [data?.items]);

  const unpaidItems = useMemo(
    () => payableItems.filter((i: any) => i.status === "UNPAID"),
    [payableItems],
  );
  const partialItems = useMemo(
    () => payableItems.filter((i: any) => i.status === "PARTIAL"),
    [payableItems],
  );

  // Kalkulasi Total Tagihan dari Nota yang Dipilih
  const totalSelectedSisa = useMemo(() => {
    return payableItems
      .filter((i: any) => selectedIds.includes(i.id))
      .reduce((sum: number, item: any) => sum + item.sisa, 0);
  }, [payableItems, selectedIds]);

  // Efek Auto-Kalkulasi Rekomendasi Nominal Transfer
  useEffect(() => {
    if (selectedIds.length === 0) {
      setPaymentAmount("");
      setUseDeposit(false);
      return;
    }

    let recommendedAmount = totalSelectedSisa;

    // Jika user centang gunakan deposit, potong nominal transfer dengan saldo yang ada
    if (useDeposit && data?.currentBalance > 0) {
      recommendedAmount = Math.max(0, totalSelectedSisa - data.currentBalance);
    }

    setPaymentAmount(recommendedAmount.toString());
  }, [selectedIds, useDeposit, totalSelectedSisa, data?.currentBalance]);

  if (!data) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === payableItems.length) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(payableItems.map((i: any) => i.id)); // Select all
    }
  };

  const handleToggleInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    const amount = Number(paymentAmount.replace(/\D/g, ""));
    const totalFund = amount + (useDeposit ? data.currentBalance : 0);

    if (totalFund <= 0) return;

    // 🔍 LOG UTAMA: Semua data yang akan dikirim & state pendukung
    console.log("🔔 [PaymentModal] Submit ditekan");
    console.log("selectedIds:", selectedIds);
    console.log("paymentAmount (input):", paymentAmount);
    console.log("amount (numeric):", amount);
    console.log("useDeposit:", useDeposit);
    console.log("currentBalance:", data?.currentBalance);
    console.log("totalFund:", totalFund);
    console.log("paymentDate:", paymentDate);
    console.log("paymentNotes:", paymentNotes);
    console.log("paymentProof:", paymentProof);
    console.log("overpayment:", overpayment);

    setIsSubmitting(true);
    try {
      const payload = {
        bulkId: crypto.randomUUID(),
        outletId: data.outlet,
        targetInvoiceIds: selectedIds,
        amountPaid: amount,
        useDeposit,
        notes: paymentNotes,
        proofOfTransfer: paymentProof ? paymentProof.name : null,
        paymentDate,
      };

      // 🔍 LOG PAYLOAD FINAL
      console.log("🚀 Payload yang dikirim ke onSubmit:", payload);

      await onSubmit(payload);
    } catch (error) {
      console.error("❌ Error saat submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hitung overpayment untuk memberi tahu user (Fund melebihi tagihan)
  const currentInputAmount = Number(paymentAmount.replace(/\D/g, "")) || 0;
  const totalFundAvailable =
    currentInputAmount + (useDeposit ? data.currentBalance : 0);
  const overpayment = Math.max(0, totalFundAvailable - totalSelectedSisa);

  // Komponen Helper untuk merender list Invoice
  const renderInvoiceList = (items: any[], isPartialType: boolean) => {
    return items.map((item: any) => {
      const isSelected = selectedIds.includes(item.id);
      return (
        <div
          key={item.id}
          onClick={() => handleToggleInvoice(item.id)}
          className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex gap-3 ${
            isSelected
              ? isPartialType
                ? "bg-amber-50 border-amber-500 shadow-sm"
                : "bg-sky-50 border-sky-500 shadow-sm"
              : `bg-white border-transparent shadow-sm ${isPartialType ? "hover:border-amber-200" : "hover:border-sky-200"}`
          }`}
        >
          <div
            className={`mt-0.5 ${isSelected ? (isPartialType ? "text-amber-600" : "text-sky-600") : "text-slate-300"}`}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-black text-slate-800">
                {item.id}
              </span>
              <span
                className={`text-[10px] font-black ${isPartialType ? "text-amber-600" : "text-red-500"}`}
              >
                {isPartialType ? "Sisa: " : ""}Rp{" "}
                {item.sisa.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-slate-500 font-bold">
                {item.tanggal}
              </p>
              {isPartialType && (
                <p className="text-[10px] text-slate-400 font-bold">
                  Tagihan: Rp {item.total.toLocaleString("id-ID")}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* HEADER MODAL */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">
              Hub Pembayaran Gabungan (Bulk Payment)
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
          {/* PANEL KIRI: LIST NOTA (MULTI-SELECT MODE) */}
          <div className="md:w-5/12 p-6 border-r border-slate-100 bg-slate-50 flex flex-col overflow-hidden">
            <div className="flex justify-between items-end mb-4 shrink-0">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                  Pilih Tagihan
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Terdapat {payableItems.length} Nota Tertunggak
                </p>
              </div>
              <button
                onClick={handleToggleSelectAll}
                className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 uppercase tracking-widest transition-colors"
              >
                {selectedIds.length === payableItems.length
                  ? "Batalkan Semua"
                  : "Pilih Semua"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {payableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle2
                    size={24}
                    className="mb-2 opacity-50 text-emerald-500"
                  />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Seluruh Nota Lunas
                  </p>
                </div>
              ) : (
                <>
                  {unpaidItems.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>{" "}
                        Tagihan Baru (Unpaid)
                      </h5>
                      <div className="space-y-2">
                        {renderInvoiceList(unpaidItems, false)}
                      </div>
                    </div>
                  )}

                  {partialItems.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>{" "}
                        Tagihan Cicilan (Partial)
                      </h5>
                      <div className="space-y-2">
                        {renderInvoiceList(partialItems, true)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* PANEL KANAN: FORM PEMBAYARAN & KALKULASI DEPOSIT */}
          <div className="flex-1 p-6 bg-white flex flex-col overflow-y-auto">
            {selectedIds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <CheckSquare size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest">
                  Pilih Minimal 1 Nota
                </p>
                <p className="text-xs font-bold mt-2 max-w-xs">
                  Silakan centang nota di panel sebelah kiri untuk mulai
                  melakukan pembayaran gabungan (Bulk Payment).
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                {/* Info Ringkasan Terpilih */}
                <div className="mb-6 pb-6 border-b border-slate-100 shrink-0">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-4">
                    Ringkasan Pembayaran Gabungan
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Total Tagihan Terpilih ({selectedIds.length} Nota)
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        Rp {totalSelectedSisa.toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Fitur Penggunaan Deposit */}
                    {data.currentBalance > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <WalletCards size={16} className="text-amber-500" />
                          <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                              Saldo Deposit Aktif
                            </p>
                            <p className="text-xs font-bold text-slate-600">
                              Rp {data.currentBalance.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Gunakan
                          </span>
                          <div
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${useDeposit ? "bg-emerald-500" : "bg-slate-300"}`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${useDeposit ? "translate-x-4" : ""}`}
                            ></div>
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={useDeposit}
                            onChange={(e) => setUseDeposit(e.target.checked)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Input Nominal & Data */}
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 flex justify-between">
                      <span>Nominal Transfer (Tunai / Bank)</span>
                      {useDeposit &&
                        data.currentBalance >= totalSelectedSisa && (
                          <span className="text-emerald-500">
                            *Tertutup penuh oleh Deposit
                          </span>
                        )}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-black">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={Number(paymentAmount || 0).toLocaleString(
                          "id-ID",
                        )}
                        onChange={(e) => {
                          const n = e.target.value.replace(/\D/g, "");
                          setPaymentAmount(n);
                        }}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl font-black text-lg outline-none transition-all ${
                          overpayment > 0
                            ? "border-emerald-300 focus:border-emerald-500 text-emerald-700"
                            : "border-slate-200 focus:border-sky-500 text-slate-800"
                        }`}
                      />
                    </div>
                    {/* Notifikasi Overpayment */}
                    {overpayment > 0 && (
                      <div className="flex items-start gap-1.5 mt-2 text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                          Kelebihan dana sebesar{" "}
                          <span className="font-black">
                            Rp {overpayment.toLocaleString("id-ID")}
                          </span>{" "}
                          akan otomatis disimpan ke dalam Saldo/Deposit Outlet.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                        Tanggal Pembayaran
                      </label>
                      <div className="relative">
                        <Calendar
                          size={14}
                          className="absolute left-3 top-3.5 text-slate-400"
                        />
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                        Bukti Transfer (Opsional)
                      </label>
                      <div className="border border-dashed border-slate-300 rounded-xl py-2 px-3 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative h-10 mt-1">
                        <div className="flex items-center gap-2">
                          <Upload size={14} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[100px]">
                            {paymentProof ? paymentProof.name : "Pilih File"}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) =>
                            setPaymentProof(e.target.files?.[0] || null)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                      Catatan / Ref Transfer
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      placeholder="Contoh: Transfer gabungan 3 Nota via Mandiri"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || totalFundAvailable <= 0}
                  className="w-full shrink-0 flex items-center justify-center gap-2 bg-sky-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-sky-700 transition-all shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <CreditCard size={16} />
                  )}
                  {isSubmitting
                    ? "Memproses Alokasi..."
                    : "Eksekusi Pembayaran Gabungan"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
