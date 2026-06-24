import React from "react";
import { Search, Plus, Minus, Trash2, Save, LayoutGrid } from "lucide-react";
import { useWms } from "../../../core/WmsProvider";

interface ReceivingPembelianProps {
  isPusat: boolean;
  targetEntity: string;
  setTargetEntity: (val: string) => void;
  tanggalPenerimaan: string;
  setTanggalPenerimaan: (val: string) => void;
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
  sourceEntity: string;
  setSourceEntity: (val: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (val: string) => void;
  proofFile: File | null;
  setProofFile: (val: File | null) => void;
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
  pusatLokalName: string;
  cleanNum: (num: number) => number;
  handleUpdateQty: (productId: string, newQty: number | string) => void;
  handleRemoveItem: (productId: string) => void;
  handleQtyChange: (productId: string, rawValue: string) => void;
  handleQtyCommit: (productId: string) => void;
  handleQtyReset: (productId: string) => void;
  handleSubmit: () => void;
  filteredInlineSearch: any[];
  handleInlineSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  totalEstimasi: number;
  isHideUpload: boolean;
}

export const ReceivingPembelian: React.FC<ReceivingPembelianProps> = ({
  isPusat,
  targetEntity,
  setTargetEntity,
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
  invoiceNumber,
  setInvoiceNumber,
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
  regionalVendors,
  pusatLokalName,
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
  const { wmsState } = useWms();

  if (isPusat) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest">
              Informasi Transaksi
            </h3>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Pilih Outlet Tujuan
              </label>
              <select
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none uppercase"
              >
                <option value="" disabled>
                  -- PILIH CABANG --
                </option>
                {branches
                  .filter((b) => {
                    const isPusatEntity =
                      b.name.toLowerCase().includes("pusat") ||
                      b.code.toLowerCase().includes("pst");
                    return !isPusatEntity && b.regionId === wmsState?.regionId;
                  })
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggalPenerimaan}
                onChange={(e) => setTanggalPenerimaan(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
            <div className="p-5 border-b border-slate-100">
              <div className="relative">
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
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
                  >
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
                          <p className="font-black text-xs text-slate-800 uppercase">
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
                        <p className="font-bold text-xs uppercase tracking-widest">
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
                                  handleQtyChange(
                                    item.product_id,
                                    e.target.value,
                                  )
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
            <div className="p-6 mt-auto border-t border-slate-100 flex justify-between items-center">
              <span className="font-black text-slate-800">
                Total: Rp {totalEstimasi.toLocaleString("id-ID")}
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={loading || cart.length === 0}
                className="bg-sky-600 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-sky-600/30 hover:bg-sky-700 active:scale-95 text-xs flex gap-2 uppercase tracking-widest"
              >
                <Save size={16} /> Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest">
            Sumber / Pihak Lawan
          </h3>
          <div className="space-y-3">
            <select
              value={sourceEntity}
              onChange={(e) => setSourceEntity(e.target.value)}
              className="w-full p-2 bg-white border border-sky-200 rounded-lg font-bold text-xs uppercase"
            >
              <option value="" disabled>
                -- SUMBER / VENDOR --
              </option>
              <option value={pusatLokalName}>{pusatLokalName}</option>
              {regionalVendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} (Vendor)
                </option>
              ))}
            </select>
            {sourceEntity !== pusatLokalName && sourceEntity !== "" && (
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="No Invoice Eksternal"
                className="w-full p-2 bg-white border border-sky-200 rounded-lg font-bold text-xs uppercase placeholder:normal-case"
              />
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black mb-2 flex items-center gap-2 text-slate-700 uppercase text-xs tracking-widest border-b pb-2">
            Detail Pembayaran & Bukti
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
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase ${paymentMethod === "CASH" ? "bg-white shadow text-emerald-600" : "text-slate-500"}`}
              >
                CASH
              </button>
              <button
                onClick={() => {
                  setPaymentMethod("TEMPO");
                  setFundingSource("");
                }}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase ${paymentMethod === "TEMPO" ? "bg-white shadow text-orange-600" : "text-slate-500"}`}
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
              <div className="flex-1">
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
            )}
            {!isHideUpload && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      proofFile ? "text-emerald-500" : "text-slate-400"
                    }
                  >
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-100">
            <div className="relative">
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
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
                >
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
                          Rp {(p.purchasePrice || 0).toLocaleString("id-ID")}
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
          <div className="p-6 mt-auto border-t border-slate-100 flex justify-between items-center">
            <span className="font-black text-slate-800">
              Total: Rp {totalEstimasi.toLocaleString("id-ID")}
            </span>
            <button
              onClick={() => handleSubmit()}
              disabled={loading || cart.length === 0}
              className="bg-sky-600 text-white px-10 py-4 rounded-xl font-black shadow-lg shadow-sky-600/30 hover:bg-sky-700 active:scale-95 text-xs flex gap-2 uppercase tracking-widest"
            >
              <Save size={16} /> Simpan Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
