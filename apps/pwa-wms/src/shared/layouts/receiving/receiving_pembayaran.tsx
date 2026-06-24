// receiving_pembayaran.tsx
import React from "react";
import { FileText, Save, UploadCloud, Wallet, Store } from "lucide-react";

interface ReceivingPembayaranProps {
  isPusat: boolean;
  targetEntity: string;
  setTargetEntity?: (val: string) => void;
  tanggalPenerimaan: string;
  setTanggalPenerimaan: (val: string) => void;
  sourceEntity: string;
  setSourceEntity: (val: string) => void;
  paymentMethod: "CASH" | "TEMPO" | "MUTASI";
  setPaymentMethod: (val: "CASH" | "TEMPO" | "MUTASI") => void;
  fundingSource: "PETTY_CASH" | "KASIR" | "PRIBADI" | "";
  setFundingSource: (val: any) => void;
  reimburseName: string;
  setReimburseName: (val: string) => void;
  tanggalJatuhTempo: string;
  setTanggalJatuhTempo: (val: string) => void;
  rekeningNumber: string;
  setRekeningNumber: (val: string) => void;
  rekeningName: string;
  setRekeningName: (val: string) => void;
  expenseName: string;
  setExpenseName: (val: string) => void;
  expenseAmount: string;
  setExpenseAmount: (val: string) => void;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
  loading: boolean;
  handleSubmit: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  branches: any[];
  pusatLokalName: string;
  isHideUpload: boolean;
}

export const ReceivingPembayaran: React.FC<ReceivingPembayaranProps> = ({
  isPusat,
  targetEntity,
  tanggalPenerimaan,
  setTanggalPenerimaan,
  sourceEntity,
  setSourceEntity,
  paymentMethod,
  setPaymentMethod,
  fundingSource,
  setFundingSource,
  reimburseName,
  setReimburseName,
  tanggalJatuhTempo,
  setTanggalJatuhTempo,
  rekeningNumber,
  setRekeningNumber,
  rekeningName,
  setRekeningName,
  expenseName,
  setExpenseName,
  expenseAmount,
  setExpenseAmount,
  proofFile,
  setProofFile,
  loading,
  handleSubmit,
  fileInputRef,
  branches,
  pusatLokalName,
  isHideUpload,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest">
            <Store size={16} className="text-amber-500" /> Penerima Dana
          </h3>
          <input
            type="text"
            value={sourceEntity}
            onChange={(e) => setSourceEntity(e.target.value)}
            placeholder="Penerima Dana (Opsional)"
            className="w-full p-2 bg-white border border-amber-200 rounded-lg font-bold text-xs uppercase placeholder:normal-case"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest border-b pb-2">
            <Wallet size={16} className="text-emerald-500" /> Detail Pembayaran
            & Bukti
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggalPenerimaan}
                onChange={(e) => setTanggalPenerimaan(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
              />
            </div>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setPaymentMethod("CASH");
                  setTanggalJatuhTempo("");
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase ${
                  paymentMethod === "CASH"
                    ? "bg-white shadow text-emerald-600"
                    : "text-slate-500"
                }`}
              >
                CASH
              </button>
              <button
                onClick={() => {
                  setPaymentMethod("TEMPO");
                  setFundingSource("");
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase ${
                  paymentMethod === "TEMPO"
                    ? "bg-white shadow text-orange-600"
                    : "text-slate-500"
                }`}
              >
                TEMPO
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {paymentMethod === "CASH" ? (
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                  Sumber Dana
                </label>
                <select
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs uppercase"
                >
                  <option value="" disabled>
                    -- SUMBER UANG --
                  </option>
                  <option value="KASIR">Laci Kasir</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="PRIBADI">Uang Pribadi (Reimburse)</option>
                </select>
                {fundingSource === "PRIBADI" && (
                  <input
                    type="text"
                    value={reimburseName}
                    onChange={(e) => setReimburseName(e.target.value)}
                    placeholder="Nama Karyawan"
                    className="w-full mt-2 p-2 bg-white border border-sky-200 rounded-lg font-bold text-xs uppercase"
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={tanggalJatuhTempo}
                    onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                    className="w-full p-2 bg-orange-50 border border-orange-200 rounded-xl font-bold text-xs"
                  />
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-2">
                  <label className="text-[9px] font-black text-orange-600 uppercase block">
                    Rekening Penerima Dana
                  </label>
                  <input
                    type="text"
                    value={rekeningNumber}
                    onChange={(e) => setRekeningNumber(e.target.value)}
                    placeholder="Bank & No. Rekening (BCA 123...)"
                    className="w-full p-2 bg-white border border-orange-200 rounded-lg font-bold text-xs uppercase"
                  />
                  <input
                    type="text"
                    value={rekeningName}
                    onChange={(e) => setRekeningName(e.target.value)}
                    placeholder="Atas Nama (A/N)"
                    className="w-full p-2 bg-white border border-orange-200 rounded-lg font-bold text-xs uppercase"
                  />
                </div>
              </div>
            )}

            {!isHideUpload && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <UploadCloud
                    size={20}
                    className={
                      proofFile ? "text-emerald-500" : "text-slate-400"
                    }
                  />
                </button>
                {proofFile && (
                  <span className="text-[10px] font-bold text-emerald-600">
                    ✓
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6 h-full">
          <div className="flex items-center gap-3 border-b pb-4 mb-6">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase">
                Form Rincian Biaya
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Input pengeluaran tanpa stok
              </p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <label className="text-xs font-black uppercase block mb-2">
                Nama Pengeluaran
              </label>
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="Contoh: LISTRIK BULAN MEI"
                className="w-full p-4 bg-slate-50 border rounded-xl font-bold uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase block mb-2">
                Total Nominal (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-4 pl-12 bg-slate-50 border rounded-xl font-black text-xl"
                />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t mt-6 flex justify-end">
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !expenseName || !expenseAmount}
              className="bg-amber-500 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 text-xs flex gap-2 uppercase"
            >
              <Save size={16} /> Simpan Pengeluaran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
