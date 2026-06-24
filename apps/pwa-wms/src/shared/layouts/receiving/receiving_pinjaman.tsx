// receiving_pinjaman.tsx
import React from "react";
import {
  Store,
  MapPin,
  Globe,
  Save,
  LayoutGrid,
  Search,
  Plus,
  Minus,
  Trash2,
  Wallet,
  UploadCloud,
} from "lucide-react";

interface ReceivingPinjamanProps {
  targetEntity: string;
  setTargetEntity?: (val: string) => void;
  tanggalPenerimaan: string;
  setTanggalPenerimaan: (val: string) => void;
  paymentMethod: string;
  setPaymentMethod: (val: "CASH" | "TEMPO" | "MUTASI") => void;
  fundingSource: string;
  setFundingSource: (val: "PETTY_CASH" | "KASIR" | "PRIBADI" | "") => void;
  reimburseName: string;
  setReimburseName: (val: string) => void;
  tanggalJatuhTempo: string;
  setTanggalJatuhTempo: (val: string) => void;
  rekeningNumber: string;
  setRekeningNumber: (val: string) => void;
  rekeningName: string;
  setRekeningName: (val: string) => void;
  sourceEntity: string;
  setSourceEntity: (val: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (val: string) => void;
  mutationScope: "INTRA_REGION" | "CROSS_REGION";
  setMutationScope: (val: "INTRA_REGION" | "CROSS_REGION") => void;
  selectedSourceRegion: string;
  setSelectedSourceRegion: (val: string) => void;
  expenseName: string;
  setExpenseName: (val: string) => void;
  expenseAmount: string;
  setExpenseAmount: (val: string) => void;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
  cart: any[];
  loading: boolean;
  inlineSearch: string;
  setInlineSearch: (val: string) => void;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  tempQtyMap: Record<string, string>;
  regionProducts: any[];
  branches: any[];
  regions: any[];
  vendors: any[];
  regionalVendors: any[];
  regionalOutlets: any[];
  crossRegionOutlets: any[];
  pusatLokalName: string;
  activeRegionId: string;
  cleanNum: (num: number) => number;
  handleUpdateQty: (productId: string, newQty: number | string) => void;
  handleRemoveItem: (productId: string) => void;
  handleQtyChange: (productId: string, rawValue: string) => void;
  handleQtyCommit: (productId: string) => void;
  handleQtyReset: (productId: string) => void;
  handleSubmit: (customPayload?: any) => void;
  filteredInlineSearch: any[];
  handleInlineSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  totalEstimasi: number;
  isHideUpload: boolean;
}

export const ReceivingPinjaman: React.FC<ReceivingPinjamanProps> = ({
  targetEntity,
  tanggalPenerimaan,
  setTanggalPenerimaan,
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
  sourceEntity,
  setSourceEntity,
  mutationScope,
  setMutationScope,
  selectedSourceRegion,
  setSelectedSourceRegion,
  proofFile,
  setProofFile,
  cart,
  loading,
  inlineSearch,
  setInlineSearch,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  fileInputRef,
  tempQtyMap,
  regionProducts,
  branches,
  regions,
  regionalOutlets,
  crossRegionOutlets,
  cleanNum,
  handleUpdateQty,
  handleRemoveItem,
  handleQtyChange,
  handleQtyCommit,
  handleQtyReset,
  handleSubmit,
  filteredInlineSearch,
  handleInlineSearchKeyDown,
  totalEstimasi,
  isHideUpload,
}) => {
  // Untuk pinjaman, kita hanya menggunakan komponen form sumber dan keranjang barang (sama seperti pembelian)
  // Tapi dengan tampilan spesifik pinjaman. Namun karena logika submit sudah di parent,
  // kita hanya perlu merender layout yang sesuai.

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Kolom Kiri: Sumber Pinjaman & Detail Pembayaran */}
      <div className="space-y-6">
        {/* Sumber Pinjaman */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest">
            <Store size={16} className="text-emerald-600" /> Pemberi Pinjaman
          </h3>
          <div className="space-y-3">
            <div className="flex bg-white p-1 rounded-lg border border-emerald-200">
              <button
                onClick={() => {
                  setMutationScope("INTRA_REGION");
                  setSourceEntity("");
                }}
                className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1 ${
                  mutationScope === "INTRA_REGION"
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                <MapPin size={12} /> Dlm Region
              </button>
              <button
                onClick={() => {
                  setMutationScope("CROSS_REGION");
                  setSourceEntity("");
                  setSelectedSourceRegion("");
                }}
                className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1 ${
                  mutationScope === "CROSS_REGION"
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                <Globe size={12} /> Lintas Region
              </button>
            </div>
            {mutationScope === "CROSS_REGION" && (
              <select
                value={selectedSourceRegion}
                onChange={(e) => {
                  setSelectedSourceRegion(e.target.value);
                  setSourceEntity("");
                }}
                className="w-full p-2 bg-white border border-emerald-200 rounded-lg font-bold text-xs uppercase"
              >
                <option value="" disabled>
                  -- PILIH REGION --
                </option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={sourceEntity}
              onChange={(e) => setSourceEntity(e.target.value)}
              className="w-full p-2 bg-white border border-emerald-200 rounded-lg font-bold text-xs uppercase"
            >
              <option value="" disabled>
                -- OUTLET PEMBERI PINJAMAN --
              </option>
              {mutationScope === "INTRA_REGION"
                ? regionalOutlets
                    .filter((o) => o.id !== targetEntity)
                    .map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))
                : crossRegionOutlets.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Detail Pembayaran & Bukti (Pinjaman menggunakan MUTASI sebagai paymentMethod) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest border-b pb-2">
            <Wallet size={16} className="text-emerald-500" /> Detail Transaksi
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
            {/* Untuk pinjaman, paymentMethod = MUTASI dan tidak bisa diubah */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <span className="px-4 py-2 rounded-lg text-[11px] font-black uppercase bg-emerald-100 text-emerald-700">
                MUTASI
              </span>
            </div>
          </div>
          {/* Upload Bukti */}
          {!isHideUpload && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <UploadCloud
                  size={20}
                  className={proofFile ? "text-emerald-500" : "text-slate-400"}
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

      {/* Kolom Kanan: Keranjang Barang (sama seperti pembelian) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          {/* Search Bar */}
          <div className="p-5 border-b border-slate-100">
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                placeholder={
                  targetEntity ? "Cari barang..." : "Pilih outlet dulu..."
                }
                value={inlineSearch}
                disabled={!targetEntity}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setInlineSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleInlineSearchKeyDown}
                className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none uppercase placeholder:normal-case disabled:opacity-50"
              />
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-slate-400"
              />
              {showDropdown && inlineSearch && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                  {filteredInlineSearch.length > 0 ? (
                    filteredInlineSearch.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleUpdateQty(p.id, 1);
                          setInlineSearch("");
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-sky-50 cursor-pointer border-b"
                      >
                        <p className="font-black text-xs uppercase">
                          {p.localName}
                        </p>
                        <p className="text-[10px] font-bold text-sky-600">
                          HPP: Rp{" "}
                          {(p.purchasePrice || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center uppercase">
                      Produk tidak ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabel Keranjang */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left">Produk</th>
                  <th className="px-6 py-4 text-center w-40">Qty Masuk</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                  <th className="px-6 py-4 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-20 text-slate-400"
                    >
                      <LayoutGrid
                        size={40}
                        className="mx-auto mb-3 opacity-20"
                      />
                      <p className="font-bold text-xs uppercase">
                        Belum Ada Barang
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const displayValue =
                      tempQtyMap[item.product_id] ?? item.qty.toString();
                    return (
                      <tr
                        key={item.product_id}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 uppercase text-xs">
                            {item.nama}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                            @ Rp {item.harga.toLocaleString("id-ID")} /{" "}
                            {item.uom}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                handleUpdateQty(
                                  item.product_id,
                                  cleanNum(item.qty - 1),
                                );
                                handleQtyReset(item.product_id);
                              }}
                              className="w-7 h-7 rounded-lg border bg-white flex items-center justify-center text-slate-400 hover:text-red-500"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) =>
                                handleQtyChange(item.product_id, e.target.value)
                              }
                              onBlur={() => handleQtyCommit(item.product_id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleQtyCommit(item.product_id);
                                } else if (e.key === "Escape")
                                  handleQtyReset(item.product_id);
                              }}
                              className="w-14 text-center font-black text-xs text-slate-700 bg-slate-100 rounded-md py-1.5 outline-none"
                            />
                            <button
                              onClick={() => {
                                handleUpdateQty(
                                  item.product_id,
                                  cleanNum(item.qty + 1),
                                );
                                handleQtyReset(item.product_id);
                              }}
                              className="w-7 h-7 rounded-lg border bg-white flex items-center justify-center text-slate-400 hover:text-green-500"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-700">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="text-slate-300 hover:text-red-500 p-2"
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

          {/* Footer Total & Tombol Simpan */}
          <div className="p-6 mt-auto border-t border-slate-100 flex justify-between items-center">
            <span className="font-black text-slate-800">
              Total: Rp {totalEstimasi.toLocaleString("id-ID")}
            </span>
            <button
              onClick={() => handleSubmit()} // handleSubmit di parent akan menangani payload untuk MUTASI_PINJAMAN
              disabled={loading || cart.length === 0 || !sourceEntity}
              className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 text-xs flex gap-2 uppercase tracking-widest"
            >
              <Save size={16} /> Simpan Pinjaman
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
