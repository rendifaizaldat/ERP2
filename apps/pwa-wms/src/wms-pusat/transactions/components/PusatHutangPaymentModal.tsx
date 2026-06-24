import React, { useState, useEffect, useMemo } from "react";
import { useWms } from "../../../core/hooks";
import { useToast } from "../../../shared/components/Toast";
import { X, DollarSign, Calendar, FileText, CheckCircle } from "lucide-react";

interface PusatHutangPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[]; // Array of AccountPayableData
  vendorName: string;
}

export default function PusatHutangPaymentModal({
  isOpen,
  onClose,
  transactions,
  vendorName,
}: PusatHutangPaymentModalProps) {
  const { processPaymentHutang, currentOperator } = useWms();
  const { showToast } = useToast();

  const unpaidTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.sisa > 0 && t.docStatus !== "CANCELLED")
      .sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
      );
  }, [transactions]);

  const totalOutstanding = useMemo(() => {
    return unpaidTransactions.reduce((sum, tx) => sum + tx.sisa, 0);
  }, [unpaidTransactions]);

  const [nominal, setNominal] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [catatan, setCatatan] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && totalOutstanding > 0) {
      setNominal(totalOutstanding.toString());
      setTanggal(new Date().toISOString().split("T")[0]);
      setCatatan("");
    }
  }, [isOpen, totalOutstanding]);

  if (!isOpen) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (Number(val) > totalOutstanding) {
      setNominal(totalOutstanding.toString());
      showToast(
        "Nominal tidak boleh melebihi total seluruh hutang!",
        "WARNING",
      );
    } else {
      setNominal(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let remainingNominal = Number(nominal);

    if (remainingNominal <= 0) {
      showToast("Nominal pembayaran harus lebih dari 0", "ERROR");
      return;
    }

    setIsSubmitting(true);
    const paymentPromises = [];

    try {
      // FIFO Allocation Loop
      for (const tx of unpaidTransactions) {
        if (remainingNominal <= 0) break;

        const payAmount = Math.min(remainingNominal, tx.sisa);
        remainingNominal -= payAmount;

        const newTotalPayment = tx.dibayar + payAmount;
        let newPaymentStatus = "UNPAID";
        if (newTotalPayment >= tx.total) newPaymentStatus = "PAID";
        else if (newTotalPayment > 0) newPaymentStatus = "PARTIAL";

        const payload = {
          id: `PAY-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`,
          receivingId: tx.id,
          amount: payAmount,
          paymentDate: tanggal,
          proofOfTransfer: null,
          notes: catatan || `Pembayaran Gabungan Vendor ${vendorName}`,
          createdBy: currentOperator?.name || "SYSTEM",
          newPaymentStatus,
          newTotalPayment,
        };

        paymentPromises.push(processPaymentHutang(payload));
      }

      await Promise.all(paymentPromises);
      showToast(
        `Pembayaran Rp ${Number(nominal).toLocaleString("id-ID")} berhasil dialokasikan!`,
        "SUCCESS",
      );
      onClose();
    } catch (error) {
      showToast("Gagal memproses pembayaran multi-invoice.", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (unpaidTransactions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Seluruh Hutang Lunas
          </h3>
          <p className="text-gray-500 mb-6">
            Tidak ada tagihan tertunggak untuk vendor ini.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-up">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Pembayaran Vendor (Multi-Invoice)
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Membayar {unpaidTransactions.length} nota tertunggak
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                Vendor
              </p>
              <p className="font-bold text-gray-900">{vendorName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                Total Tagihan Gabungan
              </p>
              <p className="font-bold text-red-600 text-lg">
                {formatRupiah(totalOutstanding)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex justify-between">
                <span>Nominal Bayar</span>
                <button
                  type="button"
                  onClick={() => setNominal(totalOutstanding.toString())}
                  className="text-blue-600 hover:underline"
                >
                  Lunasi Semua
                </button>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  value={Number(nominal || 0).toLocaleString("id-ID")}
                  onChange={handleNominalChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                *Sistem akan mendistribusikan pembayaran mulai dari nota terlama
                secara berurutan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Tanggal Pembayaran
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Catatan Ref
              </label>
              <div className="relative">
                <FileText
                  size={16}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Pembayaran Gabungan via BCA"
                  rows={2}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Number(nominal) <= 0}
              className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <DollarSign size={18} /> Simpan Pembayaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
