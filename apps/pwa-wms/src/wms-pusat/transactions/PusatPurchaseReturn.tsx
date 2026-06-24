import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import {
  Search,
  Building2,
  Store,
  FileText,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Save,
  Minus,
  Plus,
} from "lucide-react";

// --- HELPER FORMATTER ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num || 0);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// --- DUMMY DATA ---
// Data tagihan yang statusnya "Belum Lunas"
const DUMMY_UNPAID_INVOICES = [
  {
    id: "INV-IND-001",
    vendor_id: "V01",
    nama_vendor: "PT. Indofood Sukses Makmur",
    tanggal_nota: "2026-06-01T00:00:00Z",
    total_tagihan: 2500000,
    items: [
      {
        sku: "P01",
        nama: "Indomie Goreng Dus",
        unit: "Dus",
        qty_beli: 10,
        harga: 125000,
        qty_retur: 0,
        max_retur: 10,
      },
      {
        sku: "P02",
        nama: "Bumbu Racik",
        unit: "Renceng",
        qty_beli: 50,
        harga: 25000,
        qty_retur: 0,
        max_retur: 50,
      },
    ],
  },
  {
    id: "INV-SAY-882",
    vendor_id: "V02",
    nama_vendor: "CV. Sayur Segar Lembang",
    tanggal_nota: "2026-06-03T00:00:00Z",
    total_tagihan: 850000,
    items: [
      {
        sku: "P03",
        nama: "Tomat Merah",
        unit: "Kg",
        qty_beli: 20,
        harga: 15000,
        qty_retur: 0,
        max_retur: 20,
      },
      {
        sku: "P04",
        nama: "Cabai Rawit",
        unit: "Kg",
        qty_beli: 10,
        harga: 55000,
        qty_retur: 0,
        max_retur: 10,
      },
    ],
  },
];

export const PusatPurchaseReturn: React.FC = () => {
  const { wmsState } = useWms();
  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType === "PUSAT";
  const labelEntity = isPusat ? "Vendor / Supplier" : "Pusat Asstro";

  // --- STATE FILTER ---
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [isSearching, setIsSearching] = useState(false);

  // --- STATE WORKSPACE ---
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  // State untuk melacak item yang sedang diedit (diretur) di dalam invoice
  const [returnDrafts, setReturnDrafts] = useState<
    Record<string, { qty: number; note: string }>
  >({});

  // --- MOCK MENCARI DATA ---
  const invoicesList = useMemo(() => {
    // Di real app, data difilter berdasarkan API. Ini simulasi.
    if (!isSearching) return [];
    return DUMMY_UNPAID_INVOICES.filter((inv) => {
      const matchVendor =
        selectedEntity === "all" || inv.vendor_id === selectedEntity;
      // Asumsi filter tanggal juga berjalan di sini
      return matchVendor;
    });
  }, [isSearching, selectedEntity]);

  const handleSearch = () => {
    setIsSearching(true);
    setActiveInvoice(null);
    showToast("Mencari tagihan belum lunas...", "INFO");
  };

  const handleSelectInvoice = (invoice: any) => {
    setActiveInvoice(invoice);
    setReturnDrafts({}); // Reset draft retur saat buka invoice baru
  };

  const handleAdjustReturnQty = (sku: string, delta: number, max: number) => {
    setReturnDrafts((prev) => {
      const current = prev[sku]?.qty || 0;
      const nextQty = Math.max(0, Math.min(current + delta, max));

      if (nextQty === 0) {
        const newState = { ...prev };
        delete newState[sku];
        return newState;
      }

      return {
        ...prev,
        [sku]: {
          qty: nextQty,
          note: prev[sku]?.note || "",
        },
      };
    });
  };

  const handleUpdateNote = (sku: string, note: string) => {
    setReturnDrafts((prev) => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        note,
      },
    }));
  };

  const handleSubmitRefund = () => {
    const itemsToReturn = Object.keys(returnDrafts);
    if (itemsToReturn.length === 0) {
      showToast("Pilih minimal 1 barang untuk diretur!", "WARNING");
      return;
    }

    // Validasi catatan (opsional, tapi baik untuk audit)
    const hasEmptyNotes = itemsToReturn.some(
      (sku) => !returnDrafts[sku].note.trim(),
    );
    if (hasEmptyNotes) {
      showToast("Harap isi alasan retur untuk setiap barang!", "ERROR");
      return;
    }

    // Eksekusi Logika Retur (API Call)
    console.log("SUBMIT RETUR:", {
      invoiceId: activeInvoice.id,
      items: returnDrafts,
    });

    showToast("Proses Retur Berhasil Diajukan!", "SUCCESS");
    setActiveInvoice(null);
    setReturnDrafts({});
  };

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER PAGE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <RotateCcw className="text-orange-600" />
          Retur Barang (Purchase Return)
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          {isPusat
            ? "Kembalikan barang rusak/cacat ke Vendor berdasarkan Tagihan"
            : "Kembalikan barang rusak/cacat ke Pusat berdasarkan Surat Jalan"}
        </p>
      </div>

      {/* TAMPILAN JIKA SEDANG MEMBUKA INVOICE (KERANJANG RETUR) */}
      {activeInvoice ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-slide-up flex flex-col h-full max-h-[75vh]">
          {/* Header Keranjang Retur */}
          <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveInvoice(null)}
                className="p-2 bg-white hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-600 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                  INVOICE: {activeInvoice.id}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isPusat ? activeInvoice.nama_vendor : "GUDANG PUSAT ASSTRO"}{" "}
                  | {formatDate(activeInvoice.tanggal_nota)}
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-black text-[10px] uppercase tracking-widest rounded-xl">
              Mode Retur Aktif
            </div>
          </div>

          {/* Daftar Barang dalam Invoice */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
            {activeInvoice.items.map((item: any) => {
              const isSelected = !!returnDrafts[item.sku];
              const draftData = returnDrafts[item.sku] || { qty: 0, note: "" };

              return (
                <div
                  key={item.sku}
                  className={`bg-white border-2 p-4 rounded-2xl transition-all ${isSelected ? "border-orange-400 shadow-md" : "border-slate-200 shadow-sm"}`}
                >
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <h4 className="font-black text-xs uppercase tracking-tight text-slate-800">
                        {item.nama}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        SKU: {item.sku} | Harga Beli: {formatRupiah(item.harga)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          Qty Awal: {item.qty_beli} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Kontrol Qty Retur */}
                    <div className="shrink-0 w-full md:w-auto bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-between md:justify-center gap-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Retur:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleAdjustReturnQty(item.sku, -1, item.max_retur)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span
                          className={`font-black text-base w-8 text-center ${isSelected ? "text-orange-600" : "text-slate-900"}`}
                        >
                          {draftData.qty}
                        </span>
                        <button
                          onClick={() =>
                            handleAdjustReturnQty(item.sku, 1, item.max_retur)
                          }
                          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Catatan Alasan Retur (MUNCUL JIKA QTY > 0) */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-up">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-1">
                        <AlertTriangle size={12} className="text-orange-500" />
                        Alasan Retur / Kerusakan
                      </label>
                      <input
                        type="text"
                        value={draftData.note}
                        onChange={(e) =>
                          handleUpdateNote(item.sku, e.target.value)
                        }
                        placeholder="Contoh: Barang cacat pabrik, kemasan sobek..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-slate-300"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Aksi */}
          <div className="bg-white p-5 border-t border-slate-100 flex justify-between items-center shrink-0">
            <div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Barang Diretur
              </span>
              <span className="block text-lg font-black text-orange-600">
                {Object.keys(returnDrafts).length} Item
              </span>
            </div>
            <button
              onClick={handleSubmitRefund}
              className="px-6 py-3 bg-orange-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Save size={16} /> Submit Retur
            </button>
          </div>
        </div>
      ) : (
        /* TAMPILAN AWAL: PENCARIAN & LIST INVOICE */
        <>
          {/* TOOLBAR PENCARIAN */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pilih {labelEntity}
                </label>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 cursor-pointer"
                >
                  {isPusat ? (
                    <>
                      <option value="all">Semua Vendor</option>
                      <option value="V01">PT. Indofood Sukses Makmur</option>
                      <option value="V02">CV. Sayur Segar Lembang</option>
                    </>
                  ) : (
                    <option value="PUSAT">Pusat Asstro Holding</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pilih Tanggal Nota
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-orange-500 text-slate-700"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full px-6 py-3 bg-slate-900 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Search size={16} /> Cari Tagihan
                </button>
              </div>
            </div>
          </div>

          {/* HASIL PENCARIAN (LIST INVOICE) */}
          {isSearching && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest px-1">
                Hasil Pencarian: Tagihan Belum Lunas
              </h3>

              {invoicesList.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                  <CheckCircle size={48} className="text-emerald-400 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Tidak ada hutang bermasalah pada tanggal ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoicesList.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="bg-white border-2 border-slate-200 hover:border-orange-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                              {inv.id}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {inv.nama_vendor}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Total Belum Lunas
                          </span>
                          <span className="block font-black text-slate-800">
                            {formatRupiah(inv.total_tagihan)}
                          </span>
                        </div>
                        <button className="px-4 py-2 bg-slate-100 group-hover:bg-orange-600 group-hover:text-white text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                          Buka Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
