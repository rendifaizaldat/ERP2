import React, { useState, useMemo, useRef, useEffect } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import { publishEvent } from "../../core/event-publisher";
import { getWmsDb } from "../../core/database/rx-db";
import { DuplicateConfirmModal } from "../../shared/components/DuplicateConfirmModal";
import {
  Building2,
  FileText,
  UploadCloud,
  Search,
  Trash2,
  Edit3,
  X,
  Check,
  PackagePlus,
} from "lucide-react";

const STORAGE_KEY = "ASSTRO_WMS_PUSAT_RECEIVING_DRAFT";

const parseLocalNumber = (value: string | number): number => {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const normalized = value.toString().replace(/,/g, ".");
  if (normalized.endsWith(".")) return parseFloat(normalized + "0");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const PusatReceiving: React.FC = () => {
  const { wmsState, outletProducts, regions, vendors } = useWms();
  const { showToast } = useToast();

  // --- STATE FORM TRANSAKSI ---
  const [sourceEntity, setSourceEntity] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [tanggalPenerimaan, setTanggalPenerimaan] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // --- STATE CART & UI ---
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempQtyMap, setTempQtyMap] = useState<Record<string, string>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DUPLICATE PROTECTIONS STATES ---
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<React.ReactNode>("");
  const [draftPayload, setDraftPayload] = useState<any>(null);

  // --- FILTERING DATA KHUSUS PUSAT ---
  const regionalVendors = useMemo(() => {
    return vendors.filter(
      (v) => v.regionId === wmsState?.regionId && v.isActive,
    );
  }, [vendors, wmsState?.regionId]);

  const pusatProducts = useMemo(() => {
    return outletProducts.filter(
      (p) =>
        p.regionId === wmsState?.regionId &&
        p.branchId === null && // Kunci: Hanya ambil Master Katalog (Milik Pusat)
        p.status === "ACTIVE",
    );
  }, [outletProducts, wmsState?.regionId]);

  const filteredInlineSearch = useMemo(() => {
    return pusatProducts
      .filter((p) =>
        (p.localName || "").toLowerCase().includes(inlineSearch.toLowerCase()),
      )
      .slice(0, 5);
  }, [pusatProducts, inlineSearch]);

  const totalEstimasi = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  // --- DRAFTS & CLICK OUTSIDE ---
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        setCart(JSON.parse(savedDraft));
      } catch (e) {}
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // --- FUNGSI CART ---
  const cleanNum = (num: number) => Math.round(num * 100) / 100;

  const handleUpdateQty = (productId: string, newQty: number | string) => {
    let val = parseLocalNumber(newQty);
    if (isNaN(val) || val < 0) val = 0;

    const productRef = pusatProducts.find((p) => p.id === productId);
    if (!productRef) return;

    const harga = productRef.purchasePrice || 0;

    // CEK DAN MUNCULKAN TOAST DI LUAR SETSTATE
    const existingIdx = cart.findIndex((item) => item.product_id === productId);
    if (existingIdx === -1 && val > 0) {
      showToast(`${productRef.localName} ditambahkan`, "SUCCESS");
    }

    setCart((prev) => {
      const currIdx = prev.findIndex((item) => item.product_id === productId);

      if (val === 0) {
        if (currIdx >= 0) {
          const newCart = [...prev];
          newCart[currIdx] = { ...newCart[currIdx], qty: 0, subtotal: 0 };
          return newCart;
        }
        return prev;
      }

      if (currIdx >= 0) {
        const newCart = [...prev];
        newCart[currIdx] = {
          ...newCart[currIdx],
          qty: cleanNum(val),
          subtotal: cleanNum(val * harga),
        };
        return newCart;
      } else {
        // HAPUS showToast DARI SINI
        return [
          ...prev,
          {
            product_id: productRef.id,
            nama: productRef.localName,
            uom: productRef.uom || "PCS",
            qty: cleanNum(val),
            harga: harga,
            subtotal: cleanNum(val * harga),
          },
        ];
      }
    });
  };
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
    showToast("Item dihapus", "WARNING");
  };

  const handleQtyChange = (productId: string, rawValue: string) =>
    setTempQtyMap((prev) => ({ ...prev, [productId]: rawValue }));

  const handleQtyCommit = (productId: string) => {
    const raw = tempQtyMap[productId];
    if (raw !== undefined) {
      handleUpdateQty(productId, raw);
      setTempQtyMap((prev) => {
        const newMap = { ...prev };
        delete newMap[productId];
        return newMap;
      });
    }
  };

  const handleQtyReset = (productId: string) => {
    setTempQtyMap((prev) => {
      const newMap = { ...prev };
      delete newMap[productId];
      return newMap;
    });
  };

  // --- LOGIKA PENANGANAN DOUBLE INPUT (RxDB) ---
  const checkDuplicateLocal = async (payload: any) => {
    try {
      const db = await getWmsDb();
      const todayDate = new Date(payload.receivedAt)
        .toISOString()
        .split("T")[0];

      const localOutbox = await db.wms_outbox
        .find({
          selector: { type: "RECEIVING_PUSAT_SUBMITTED" },
        })
        .exec();

      const pastDocs = localOutbox.map((d) => d.payload);
      const todaysDocs = pastDocs.filter((doc: any) => {
        if (!doc || !doc.receivedAt) return false;
        return doc.receivedAt.startsWith(todayDate) && doc.id !== payload.id;
      });

      const isDuplicate = todaysDocs.some(
        (d: any) =>
          d.sourceEntity === payload.sourceEntity &&
          d.invoiceNumber === payload.invoiceNumber,
      );

      if (isDuplicate) {
        return {
          status: "HARD_BLOCK",
          message: `Nomor Invoice ${payload.invoiceNumber} dari Vendor ${payload.sourceEntity} sudah pernah diinput hari ini.`,
        };
      }
      return { status: "SAFE", message: "" };
    } catch (err) {
      return { status: "SAFE", message: "" };
    }
  };

  // --- LOGIKA SIMPAN FINAL ---
  const executeSubmit = async (payloadToSubmit: any) => {
    setLoading(true);
    try {
      await publishEvent(
        "RECEIVING_PUSAT_SUBMITTED",
        payloadToSubmit.id,
        payloadToSubmit,
      );

      showToast(`Dokumen Penerimaan Pusat Berhasil Disimpan!`, "SUCCESS");

      // Reset form
      setCart([]);
      setSourceEntity("");
      setInvoiceNumber("");
      setProofFile(null);
      setTanggalPenerimaan(new Date().toISOString().split("T")[0]);
      setTanggalJatuhTempo(""); // Kosongkan kembali agar dinamis
      localStorage.removeItem(STORAGE_KEY);

      setIsDuplicateModalOpen(false);
      setDraftPayload(null);
    } catch (error) {
      showToast("Gagal memproses Transaksi ke database lokal.", "ERROR");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER UTAMA DARI TOMBOL UI ---
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!sourceEntity) return showToast("Pilih Vendor penerima!", "ERROR");
    if (!invoiceNumber) return showToast("Nomor Invoice wajib diisi!", "ERROR");
    if (!tanggalJatuhTempo)
      return showToast("Tanggal jatuh tempo wajib diisi manual!", "ERROR");
    if (cart.length === 0)
      return showToast("Keranjang tidak boleh kosong!", "ERROR");

    setLoading(true);

    try {
      const regionCode =
        regions
          .find((r) => r.id === wmsState?.regionId)
          ?.name.substring(0, 3)
          .toUpperCase() || "REG";
      const timestamp = Date.now();
      const generatedDocId = `RCV/PST/${regionCode}/${timestamp}`;

      let proofBase64 = null;
      if (proofFile) proofBase64 = await toBase64(proofFile);

      const finalItems = cart.map((item) => ({
        regionalItemId: item.product_id,
        itemName: item.nama,
        uom: item.uom,
        qty: item.qty,
        price: item.harga,
        subtotal: item.subtotal,
      }));

      const generatedPayload = {
        id: generatedDocId,
        regionId: wmsState?.regionId || "UNKNOWN",
        branchId: null, // KUNCI: Pusat tidak memiliki cabang
        transactionType: "PEMBELIAN_BARANG",
        sourceEntity: sourceEntity.toUpperCase(),
        invoiceNumber: invoiceNumber.toUpperCase(),
        totalAmount: totalEstimasi,
        paymentStatus: "UNPAID", // Pembelian dari vendor selalu dimulai dari status hutang (UNPAID)
        totalPayment: 0,
        dueDate: tanggalJatuhTempo,
        proofOfTransaction: proofBase64,
        receivedAt: tanggalPenerimaan,
        paymentMethod: "TEMPO",
        fundingSource: null,
        mutationType: null,
        targetRegionId: null,
        loanStatus: null,
        returnMethod: null,
        items: finalItems,
      };

      const checkResult = await checkDuplicateLocal(generatedPayload);
      setLoading(false);

      if (checkResult.status === "HARD_BLOCK") {
        showToast(checkResult.message as string, "ERROR");
        return;
      }

      await executeSubmit(generatedPayload);
    } catch (error) {
      setLoading(false);
      showToast("Gagal mempersiapkan payload Transaksi.", "ERROR");
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <PackagePlus className="text-sky-600" /> Penerimaan Barang Pusat
          (Inbound)
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Modul khusus untuk mencatat masuknya stok dari Vendor ke Gudang Pusat
        </p>
      </div>

      {/* FORM DETAIL VENDOR & INVOICE */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Building2 size={16} className="text-sky-600" /> Detail Pembelian &
          Vendor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Pilih Vendor *
            </label>
            <select
              value={sourceEntity}
              onChange={(e) => setSourceEntity(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
            >
              <option value="" disabled>
                -- DAFTAR VENDOR REGIONAL --
              </option>
              {regionalVendors.map((v: any) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Nomor Invoice Vendor *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Contoh: INV/VND/..."
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Tanggal Terima *
            </label>
            <input
              type="date"
              value={tanggalPenerimaan}
              onChange={(e) => setTanggalPenerimaan(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-sky-600 block mb-1">
              Jatuh Tempo Pembayaran *
            </label>
            <input
              type="date"
              value={tanggalJatuhTempo}
              onChange={(e) => setTanggalJatuhTempo(e.target.value)}
              className="w-full px-3 py-2.5 bg-sky-50 border-2 border-sky-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 text-sky-700"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
            Unggah Bukti Dokumen (Opsional)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center hover:border-sky-400 transition-colors bg-slate-50">
            <input
              type="file"
              accept="image/*,.pdf"
              ref={fileInputRef}
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="hidden"
              id="proof-upload-pusat"
            />
            <label
              htmlFor="proof-upload-pusat"
              className="cursor-pointer flex flex-col items-center gap-1"
            >
              <UploadCloud size={20} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">
                {proofFile ? proofFile.name : "Klik untuk upload dokumen"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* KERANJANG BARANG */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <FileText size={16} className="text-emerald-600" /> Input Barang Masuk
        </h3>

        {/* Pencarian Pintar (Inline Search) */}
        <div className="relative mb-4" ref={dropdownRef}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama barang di master katalog..."
              value={inlineSearch}
              onChange={(e) => {
                setInlineSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredInlineSearch.length > 0) {
                  e.preventDefault();
                  handleUpdateQty(filteredInlineSearch[0].id, 1);
                  setInlineSearch("");
                  setShowDropdown(false);
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 placeholder:text-slate-400"
            />
          </div>
          {showDropdown && inlineSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60">
              {filteredInlineSearch.length > 0 ? (
                filteredInlineSearch.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleUpdateQty(p.id, 1);
                      setInlineSearch("");
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-sky-50 border-b border-slate-100 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="font-black text-xs text-slate-800 uppercase">
                        {p.localName}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        HPP: Rp {p.purchasePrice.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500">
                      {p.uom}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center uppercase">
                  Barang tidak ditemukan
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabel Keranjang */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3 text-center">Qty Diterima</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      Keranjang kosong.
                    </p>
                  </td>
                </tr>
              ) : (
                cart.map((item) => {
                  const isEditing = tempQtyMap[item.product_id] !== undefined;
                  const displayQty = isEditing
                    ? tempQtyMap[item.product_id]
                    : item.qty;

                  return (
                    <tr key={item.product_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-black text-xs text-slate-800 uppercase">
                          {item.nama}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {item.uom}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={displayQty}
                            onChange={(e) =>
                              handleQtyChange(item.product_id, e.target.value)
                            }
                            onBlur={() => handleQtyCommit(item.product_id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleQtyCommit(item.product_id);
                              if (e.key === "Escape")
                                handleQtyReset(item.product_id);
                            }}
                            className={`w-16 px-2 py-1 text-center text-xs font-black uppercase rounded border ${isEditing ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-800"} focus:outline-none focus:border-sky-500`}
                          />
                          {isEditing ? (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleQtyCommit(item.product_id)}
                                className="p-0.5 bg-emerald-100 text-emerald-600 rounded"
                              >
                                <Check size={10} />
                              </button>
                              <button
                                onClick={() => handleQtyReset(item.product_id)}
                                className="p-0.5 bg-rose-100 text-rose-600 rounded"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                handleQtyChange(
                                  item.product_id,
                                  item.qty.toString(),
                                )
                              }
                              className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-xs text-slate-600">
                          Rp {item.harga.toLocaleString("id-ID")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-black text-sm text-slate-800">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {cart.length > 0 && (
            <div className="bg-sky-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-700">
                Total Estimasi Tagihan
              </span>
              <span className="text-lg font-black text-sky-700">
                Rp {totalEstimasi.toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-sky-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <Building2 size={18} /> Simpan Penerimaan Barang Pusat
      </button>

      <DuplicateConfirmModal
        isOpen={isDuplicateModalOpen}
        message={duplicateMessage}
        onCancel={() => {
          setIsDuplicateModalOpen(false);
          setDraftPayload(null);
        }}
        onConfirm={() => {
          if (draftPayload) executeSubmit(draftPayload);
        }}
      />
    </div>
  );
};
