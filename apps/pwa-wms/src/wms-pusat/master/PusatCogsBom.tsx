import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import {
  Calculator,
  Search,
  PackageCheck,
  Scale,
  Plus,
  Trash2,
  Save,
  Utensils,
  Receipt,
} from "lucide-react";

// --- HELPER FORMATTER ---
const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num || 0);

// --- MOCK DATA ---
const MOCK_PRODUCTS = [
  { sku: "PRD-001", name: "Nasi Goreng Spesial", sellingPrice: 35000 },
  { sku: "PRD-002", name: "Ayam Bakar Madu", sellingPrice: 40000 },
];

const MOCK_RAW_MATERIALS = [
  { sku: "RAW-001", name: "Beras Premium", unit: "Kg", costPerUnit: 15000 },
  { sku: "RAW-002", name: "Telur Ayam", unit: "Pcs", costPerUnit: 2000 },
  {
    sku: "RAW-003",
    name: "Bumbu Nasi Goreng",
    unit: "Porsi",
    costPerUnit: 3500,
  },
  { sku: "RAW-004", name: "Ayam Potong", unit: "Ekor", costPerUnit: 35000 },
  { sku: "RAW-005", name: "Madu Murni", unit: "ml", costPerUnit: 150 },
];

export const CogsBom: React.FC = () => {
  const { showToast } = useToast();

  // State Target Produk
  const [selectedProductSku, setSelectedProductSku] = useState<string>("");

  // State BOM (Bahan Baku yg dipilih)
  const [bomItems, setBomItems] = useState<
    Array<{ rawSku: string; qty: number; cost: number }>
  >([]);

  // State Form Input Bahan Baku
  const [selectedRawSku, setSelectedRawSku] = useState("");
  const [rawQty, setRawQty] = useState("");

  const selectedProduct = useMemo(
    () => MOCK_PRODUCTS.find((p) => p.sku === selectedProductSku),
    [selectedProductSku],
  );

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductSku) {
      showToast("Pilih Produk Target terlebih dahulu!", "WARNING");
      return;
    }
    if (!selectedRawSku || !rawQty) {
      showToast("Bahan baku dan kuantitas wajib diisi!", "ERROR");
      return;
    }

    const rawData = MOCK_RAW_MATERIALS.find((r) => r.sku === selectedRawSku);
    if (!rawData) return;

    const exists = bomItems.find((b) => b.rawSku === selectedRawSku);
    if (exists) {
      showToast("Bahan baku ini sudah ada di dalam resep!", "ERROR");
      return;
    }

    const cost = rawData.costPerUnit * Number(rawQty);
    setBomItems([
      ...bomItems,
      { rawSku: selectedRawSku, qty: Number(rawQty), cost },
    ]);

    setSelectedRawSku("");
    setRawQty("");
    showToast("Bahan baku ditambahkan ke resep", "SUCCESS");
  };

  const handleRemoveMaterial = (rawSku: string) => {
    setBomItems(bomItems.filter((b) => b.rawSku !== rawSku));
  };

  const handleSaveBom = () => {
    if (bomItems.length === 0) {
      showToast("Resep tidak boleh kosong!", "ERROR");
      return;
    }
    showToast(
      `BOM & COGS untuk ${selectedProduct?.name} berhasil disimpan!`,
      "SUCCESS",
    );
    setBomItems([]);
    setSelectedProductSku("");
  };

  const totalCogs = useMemo(
    () => bomItems.reduce((acc, curr) => acc + curr.cost, 0),
    [bomItems],
  );
  const marginGross = selectedProduct
    ? selectedProduct.sellingPrice - totalCogs
    : 0;
  const marginPercent =
    selectedProduct && selectedProduct.sellingPrice > 0
      ? ((marginGross / selectedProduct.sellingPrice) * 100).toFixed(2)
      : 0;

  return (
    <div className="space-y-6 pb-10 animate-fade">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <Calculator className="text-indigo-600" />
          COGS & Bill of Materials (BOM)
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Kalkulasi Harga Pokok Penjualan berdasarkan resep bahan baku
          operasional
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* PANEL KIRI: FORM BOM */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-indigo-100 pb-3 mb-4">
              <Utensils className="text-indigo-600" size={16} />
              <span className="font-black text-xs uppercase tracking-widest text-indigo-600">
                Setup Target Resep
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Pilih Produk Jadi *
                </label>
                <select
                  value={selectedProductSku}
                  onChange={(e) => {
                    setSelectedProductSku(e.target.value);
                    setBomItems([]); // Reset if product changes
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- PILIH PRODUK MENU --</option>
                  {MOCK_PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex justify-between items-center animate-slide-up">
                  <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                    Harga Jual
                  </span>
                  <span className="font-black text-sm text-indigo-600">
                    {formatRupiah(selectedProduct.sellingPrice)}
                  </span>
                </div>
              )}
            </div>

            <form
              onSubmit={handleAddMaterial}
              className={`mt-6 pt-6 border-t-2 border-slate-100 transition-opacity ${selectedProduct ? "opacity-100" : "opacity-30 pointer-events-none"}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Scale className="text-slate-500" size={14} />
                <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">
                  Komposisi Bahan Baku
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Pilih Bahan Baku
                  </label>
                  <select
                    value={selectedRawSku}
                    onChange={(e) => setSelectedRawSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- PILIH RAW MATERIAL --</option>
                    {MOCK_RAW_MATERIALS.map((r) => (
                      <option key={r.sku} value={r.sku}>
                        {r.name} ({formatRupiah(r.costPerUnit)}/{r.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Kuantitas Terpakai
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={rawQty}
                    onChange={(e) => setRawQty(e.target.value)}
                    placeholder="Misal: 0.5"
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Masukkan Komposisi
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PANEL KANAN: WORKBOOK BOM & COGS */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[600px] overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Receipt className="text-indigo-600" size={20} />
              <span className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Struktur BOM & Estimasi Profit
              </span>
            </div>
            {selectedProduct && (
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-sm">
                Target: {selectedProduct.name}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Bahan Baku / Raw Material</th>
                  <th className="px-6 py-4 text-center">Kuantitas</th>
                  <th className="px-6 py-4 text-right">Harga Satuan</th>
                  <th className="px-6 py-4 text-right">Total Biaya (COGS)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bomItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <PackageCheck
                        size={40}
                        className="mx-auto text-slate-200 mb-3"
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {selectedProduct
                          ? "Belum ada komposisi bahan baku yang diinput."
                          : "Pilih produk target di panel kiri terlebih dahulu."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  bomItems.map((item, idx) => {
                    const rawData = MOCK_RAW_MATERIALS.find(
                      (r) => r.sku === item.rawSku,
                    );
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black uppercase text-xs text-slate-800">
                            {rawData?.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                            SKU: {item.rawSku}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-sm text-slate-700">
                            {item.qty}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">
                            {rawData?.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-500">
                          {formatRupiah(rawData?.costPerUnit || 0)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-800">
                          {formatRupiah(item.cost)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveMaterial(item.rawSku)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SUMMARY COGS & PROFIT MARGIN */}
          {bomItems.length > 0 && selectedProduct && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total COGS (Modal)
                  </span>
                  <span className="block text-xl font-black text-slate-800">
                    {formatRupiah(totalCogs)}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Gross Margin (Rp)
                  </span>
                  <span
                    className={`block text-xl font-black ${marginGross >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatRupiah(marginGross)}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Rasio Margin
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-24 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${Number(marginPercent) >= 50 ? "bg-emerald-500" : Number(marginPercent) >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, Number(marginPercent)))}%`,
                        }}
                      ></div>
                    </div>
                    <span className="font-black text-sm text-slate-800">
                      {marginPercent}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveBom}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2"
                >
                  <Save size={16} /> Finalisasi COGS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
