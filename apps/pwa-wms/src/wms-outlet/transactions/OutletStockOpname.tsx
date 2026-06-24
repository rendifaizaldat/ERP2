import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import {
  ClipboardCheck,
  Search,
  Save,
  PackageSearch,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

// --- MOCK DATA ---
const INITIAL_STOCK = [
  {
    sku: "BRG-001",
    name: "Beras Premium",
    unit: "Kg",
    category: "BAHAN BAKU",
    systemQty: 150,
  },
  {
    sku: "BRG-002",
    name: "Minyak Goreng 2L",
    unit: "Pcs",
    category: "BAHAN BAKU",
    systemQty: 45,
  },
  {
    sku: "PKG-001",
    name: "Box Takeaway",
    unit: "Dus",
    category: "PACKAGING",
    systemQty: 10,
  },
  {
    sku: "MIN-001",
    name: "Teh Pucuk",
    unit: "Botol",
    category: "MINUMAN KEMASAN",
    systemQty: 120,
  },
];

export const OutletStockOpname: React.FC = () => {
  const { wmsState } = useWms();
  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType === "PUSAT";

  // --- STATE OPNAME ---
  const [picName, setPicName] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // State untuk menyimpan hasil perhitungan fisik: Record<sku, { actualQty, note }>
  const [opnameDraft, setOpnameDraft] = useState<
    Record<string, { actualQty: number | string; note: string }>
  >({});

  // --- LOGIC ---
  const filteredStock = useMemo(() => {
    return INITIAL_STOCK.filter((item) => {
      const matchCat =
        filterCategory === "ALL" || item.category === filterCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [filterCategory, searchTerm]);

  const handleQtyChange = (sku: string, val: string) => {
    setOpnameDraft((prev) => ({
      ...prev,
      [sku]: {
        actualQty: val === "" ? "" : Number(val),
        note: prev[sku]?.note || "",
      },
    }));
  };

  const handleNoteChange = (sku: string, note: string) => {
    setOpnameDraft((prev) => ({
      ...prev,
      [sku]: {
        actualQty: prev[sku]?.actualQty ?? "",
        note,
      },
    }));
  };

  const handleSaveOpname = () => {
    if (!picName) {
      showToast("Nama Penanggung Jawab (PIC) wajib diisi!", "ERROR");
      return;
    }

    const countedItems = Object.keys(opnameDraft).filter(
      (sku) => opnameDraft[sku].actualQty !== "",
    );
    if (countedItems.length === 0) {
      showToast("Belum ada stok fisik yang diinput!", "WARNING");
      return;
    }

    // Simulasi Submit API
    showToast(
      `Data Opname dari ${picName} berhasil disimpan. Sistem akan menyesuaikan stok.`,
      "SUCCESS",
    );

    // Reset form setelah sukses
    setOpnameDraft({});
    setPicName("");
  };

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <ClipboardCheck className="text-emerald-600" />
          Stock Opname (Penyesuaian Fisik)
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          {isPusat
            ? "Pencocokan stok fisik Gudang Pusat dengan Sistem"
            : "Pencocokan stok fisik Outlet dengan Sistem"}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* PANEL KIRI: SETUP OPNAME */}
        <div className="xl:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-5 sticky top-4">
          <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
            <PackageSearch className="text-emerald-600" size={16} />
            <span className="font-black text-xs uppercase tracking-widest text-slate-800">
              Sesi Opname
            </span>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              PIC (Penanggung Jawab) *
            </label>
            <input
              value={picName}
              onChange={(e) => setPicName(e.target.value.toUpperCase())}
              placeholder="NAMA PETUGAS..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Filter Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="BAHAN BAKU">Bahan Baku</option>
              <option value="PACKAGING">Packaging</option>
              <option value="MINUMAN KEMASAN">Minuman Kemasan</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Cari Barang
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="SKU / NAMA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveOpname}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex justify-center items-center gap-2"
            >
              <Save size={16} /> Finalisasi Opname
            </button>
            <p className="text-[8px] font-bold text-slate-400 uppercase text-center mt-2 tracking-widest">
              Stok sistem akan ditimpa dengan stok fisik aktual
            </p>
          </div>
        </div>

        {/* PANEL KANAN: WORKSHEET OPNAME */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Lembar Kerja Opname
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Input jumlah fisik riil di lapangan
              </p>
            </div>
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-[10px] font-black text-slate-600 uppercase tracking-widest">
              Progres:{" "}
              {
                Object.values(opnameDraft).filter((v) => v.actualQty !== "")
                  .length
              }{" "}
              / {filteredStock.length} Item
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Barang & Kategori</th>
                  <th className="px-5 py-4 text-center">Stok Sistem</th>
                  <th className="px-5 py-4 w-32 bg-emerald-50/50 text-emerald-700">
                    Stok Fisik Aktual
                  </th>
                  <th className="px-5 py-4 text-center w-24">Selisih</th>
                  <th className="px-5 py-4">Catatan (Opsional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <FileSpreadsheet
                        size={40}
                        className="mx-auto text-slate-200 mb-3"
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tidak ada barang sesuai filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item) => {
                    const draft = opnameDraft[item.sku] || {
                      actualQty: "",
                      note: "",
                    };
                    const hasInput = draft.actualQty !== "";
                    const variance = hasInput
                      ? Number(draft.actualQty) - item.systemQty
                      : 0;

                    return (
                      <tr
                        key={item.sku}
                        className={`hover:bg-slate-50 transition-colors ${hasInput ? "bg-slate-50/50" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-black uppercase text-xs text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                            SKU: {item.sku} | {item.category}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-black text-sm text-slate-600">
                            {item.systemQty}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 ml-1">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 bg-emerald-50/20">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={draft.actualQty}
                            onChange={(e) =>
                              handleQtyChange(item.sku, e.target.value)
                            }
                            className={`w-full px-3 py-2 text-center text-sm font-black rounded-lg border-2 outline-none transition-all ${hasInput ? "bg-white border-emerald-400 text-emerald-700" : "bg-slate-100 border-slate-200 focus:border-emerald-400"}`}
                          />
                        </td>
                        <td className="px-5 py-4 text-center">
                          {!hasInput ? (
                            <span className="text-slate-300">-</span>
                          ) : variance === 0 ? (
                            <span className="flex items-center justify-center gap-1 text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded">
                              <CheckCircle2 size={12} /> Cocok
                            </span>
                          ) : (
                            <span
                              className={`flex items-center justify-center gap-1 text-[11px] font-black px-2 py-1 rounded uppercase ${variance > 0 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50"}`}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance}{" "}
                              {variance < 0 && <AlertTriangle size={12} />}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            placeholder="Alasan selisih..."
                            value={draft.note}
                            onChange={(e) =>
                              handleNoteChange(item.sku, e.target.value)
                            }
                            disabled={!hasInput || variance === 0}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase focus:outline-none focus:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
