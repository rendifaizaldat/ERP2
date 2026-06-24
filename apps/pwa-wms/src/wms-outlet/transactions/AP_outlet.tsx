import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import {
  Wallet,
  Store,
  Receipt,
  Eye,
  CreditCard,
  History,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
// TODO: Kita akan buat dan uncomment ini di langkah selanjutnya
// import { APOutletItemsModal } from "./components/APOutletItemsModal";
// import { APOutletPaymentModal } from "./components/APOutletPaymentModal";

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num || 0);

export const APOutlet: React.FC = () => {
  const { wmsState, receivings, branches } = useWms();

  const [activeTab, setActiveTab] = useState<"INTERNAL" | "MUTASI" | "LUNAS">(
    "INTERNAL",
  );
  const [searchTerm, setSearchTerm] = useState("");

  // State untuk Modal (akan digunakan di langkah selanjutnya)
  const [selectedForItems, setSelectedForItems] = useState<any | null>(null);
  const [selectedForPayment, setSelectedForPayment] = useState<any | null>(
    null,
  );

  // Ambil data receiving khusus untuk outlet yang sedang login
  const myReceivings = useMemo(() => {
    if (!receivings) return [];
    return receivings.filter((r) => r.branchId === wmsState?.branchId);
  }, [receivings, wmsState?.branchId]);

  // 1. Grouping Tagihan Internal (Vendor & Operasional yang belum lunas)
  const internalReceivings = useMemo(() => {
    return myReceivings.filter(
      (r) =>
        (r.transactionType === "PEMBELIAN_BARANG" ||
          r.transactionType === "PEMBAYARAN_BIAYA") &&
        r.paymentStatus !== "PAID",
    );
  }, [myReceivings]);

  // 2. Grouping Pinjaman Mutasi (Antar outlet yang belum lunas/open)
  const mutasiReceivings = useMemo(() => {
    return myReceivings.filter(
      (r) => r.transactionType === "MUTASI_PINJAMAN" && r.loanStatus === "OPEN",
    );
  }, [myReceivings]);

  // 3. Grouping Riwayat Lunas
  const lunasReceivings = useMemo(() => {
    return myReceivings.filter(
      (r) =>
        r.paymentStatus === "PAID" ||
        r.loanStatus === "CLOSED_GOODS" ||
        r.loanStatus === "CLOSED_CASH",
    );
  }, [myReceivings]);

  // Data yang ditampilkan di tabel berdasarkan Tab & Pencarian
  const displayData = useMemo(() => {
    let sourceData = [];
    if (activeTab === "INTERNAL") sourceData = internalReceivings;
    else if (activeTab === "MUTASI") sourceData = mutasiReceivings;
    else sourceData = lunasReceivings;

    if (!searchTerm)
      return sourceData.sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      );

    const lowerSearch = searchTerm.toLowerCase();
    return sourceData
      .filter(
        (r) =>
          r.id.toLowerCase().includes(lowerSearch) ||
          r.sourceEntity.toLowerCase().includes(lowerSearch) ||
          (r.invoiceNumber &&
            r.invoiceNumber.toLowerCase().includes(lowerSearch)),
      )
      .sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      );
  }, [
    activeTab,
    internalReceivings,
    mutasiReceivings,
    lunasReceivings,
    searchTerm,
  ]);

  // Kalkulasi Summary
  const totalHutangInternal = internalReceivings.reduce(
    (sum, r) => sum + (Number(r.totalAmount) - Number(r.totalPayment)),
    0,
  );
  const totalHutangMutasi = mutasiReceivings.reduce(
    (sum, r) => sum + (Number(r.totalAmount) - Number(r.totalPayment)),
    0,
  );

  const getStatusBadge = (status: string, isMutasi: boolean = false) => {
    if (isMutasi) {
      if (status === "OPEN")
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">
            Belum Kembali
          </span>
        );
      if (status === "CLOSED_GOODS")
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
            Lunas (Barang)
          </span>
        );
      if (status === "CLOSED_CASH")
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
            Lunas (Uang)
          </span>
        );
    }

    if (status === "PAID")
      return (
        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase flex items-center gap-1">
          <CheckCircle2 size={10} /> PAID
        </span>
      );
    if (status === "PARTIAL")
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[9px] font-black uppercase flex items-center gap-1">
          <AlertCircle size={10} /> PARTIAL
        </span>
      );
    return (
      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase flex items-center gap-1">
        <AlertCircle size={10} /> UNPAID
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-fade">
      {/* HEADER & SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Wallet className="text-rose-500" /> AP / Hutang Outlet
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Manajemen Tagihan & Pinjaman Antar Cabang
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 p-5 rounded-2xl shadow-sm border border-rose-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
              Sisa Tagihan Operasional
            </p>
            <p className="text-xl font-black text-slate-800 tabular-nums leading-tight mt-0.5">
              {formatRupiah(totalHutangInternal)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
              Pinjaman Mutasi Aktif
            </p>
            <p className="text-xl font-black text-slate-800 tabular-nums leading-tight mt-0.5">
              {formatRupiah(totalHutangMutasi)}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {/* TABS & SEARCH */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={() => setActiveTab("INTERNAL")}
                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "INTERNAL" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <Receipt size={14} /> Tagihan Vendor/Ops
              </button>
              <button
                onClick={() => setActiveTab("MUTASI")}
                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "MUTASI" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <ArrowRightLeft size={14} /> Pinjaman Mutasi
              </button>
              <button
                onClick={() => setActiveTab("LUNAS")}
                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "LUNAS" ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <History size={14} /> Riwayat Lunas
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari Entitas atau Dokumen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Dokumen & Tanggal</th>
                <th className="px-6 py-4">Sumber / Pemberi Pinjaman</th>
                <th className="px-6 py-4 text-right">Total Nominal</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <CheckCircle2
                      size={40}
                      className="mx-auto text-emerald-200 mb-3"
                    />
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      Hore! Tidak Ada Tagihan Di Kategori Ini.
                    </p>
                  </td>
                </tr>
              ) : (
                displayData.map((doc) => {
                  const sisaTagihan =
                    Number(doc.totalAmount) - Number(doc.totalPayment);
                  const isMutasi = doc.transactionType === "MUTASI_PINJAMAN";

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-black text-xs text-slate-800 uppercase">
                          {doc.id}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                          <History size={10} />{" "}
                          {new Date(doc.receivedAt).toLocaleDateString(
                            "id-ID",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max ${isMutasi ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}
                        >
                          {isMutasi ? (
                            <Store size={10} />
                          ) : (
                            <Receipt size={10} />
                          )}
                          {doc.sourceEntity}
                        </span>
                        {doc.dueDate && (
                          <p className="text-[9px] font-bold text-rose-500 uppercase mt-1">
                            Jatuh Tempo:{" "}
                            {new Date(doc.dueDate).toLocaleDateString("id-ID")}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-sm text-slate-700">
                          {formatRupiah(Number(doc.totalAmount))}
                        </p>
                        {activeTab !== "LUNAS" && (
                          <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5">
                            Sisa: {formatRupiah(sisaTagihan)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(doc.paymentStatus, false)}
                          {isMutasi && getStatusBadge(doc.loanStatus, true)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedForItems(doc)}
                            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-sky-100 hover:text-sky-600 transition-colors"
                            title="Lihat Item"
                          >
                            <Eye size={14} />
                          </button>

                          {activeTab !== "LUNAS" && (
                            <button
                              onClick={() => setSelectedForPayment(doc)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-colors shadow-md ${isMutasi ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-slate-800 hover:bg-slate-900 shadow-slate-800/30"}`}
                              title={
                                isMutasi
                                  ? "Kembalikan Pinjaman"
                                  : "Bayar Tagihan"
                              }
                            >
                              {isMutasi ? (
                                <Package size={14} />
                              ) : (
                                <CreditCard size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODO: Render Modals di sini jika state active */}
      {/* {selectedForItems && <APOutletItemsModal data={selectedForItems} onClose={() => setSelectedForItems(null)} />} */}
      {/* {selectedForPayment && <APOutletPaymentModal data={selectedForPayment} onClose={() => setSelectedForPayment(null)} />} */}
    </div>
  );
};
