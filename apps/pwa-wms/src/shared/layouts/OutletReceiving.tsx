// outletreceiving.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../components/Toast";
import { generateOutletAbbreviation } from "../../core/utils";
import { publishEvent } from "../../core/event-publisher";
import { Store, PackagePlus } from "lucide-react";

// Import RxDB
import { getWmsDb } from "../../core/database/rx-db";

// Import komponen-komponen yang sudah dipisah
import { ReceivingPembelian } from "./receiving/receiving_pembelian";
import { ReceivingPembayaran } from "./receiving/receiving_pembayaran";
import { ReceivingPinjaman } from "./receiving/receiving_pinjaman";
import { DuplicateConfirmModal } from "../components/DuplicateConfirmModal";

// Constants & helper functions yang dibutuhkan parent
const STORAGE_KEY = "ASSTRO_WMS_RO_DRAFT";

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

export const OutletReceiving: React.FC = () => {
  const { wmsState, outletProducts, regions, branches, vendors } = useWms();
  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType === "PUSAT";

  // --- STATE BERSAMA ---
  const [targetEntity, setTargetEntity] = useState("");
  const [tanggalPenerimaan, setTanggalPenerimaan] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [transaksiType, setTransaksiType] = useState<
    "PEMBELIAN_BARANG" | "PEMBAYARAN_BIAYA" | "MUTASI_PINJAMAN"
  >("PEMBELIAN_BARANG");

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "TEMPO" | "MUTASI"
  >("CASH");
  const [fundingSource, setFundingSource] = useState<
    "PETTY_CASH" | "KASIR" | "PRIBADI" | ""
  >("");
  const [reimburseName, setReimburseName] = useState("");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState("");
  const [rekeningNumber, setRekeningNumber] = useState("");
  const [rekeningName, setRekeningName] = useState("");

  // Source States
  const [sourceEntity, setSourceEntity] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Mutation Specific States
  const [mutationScope, setMutationScope] = useState<
    "INTRA_REGION" | "CROSS_REGION"
  >("INTRA_REGION");
  const [selectedSourceRegion, setSelectedSourceRegion] = useState("");

  // Expense Specific States
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");

  // Proof of Transaction
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Cart & UI States
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineSearch, setInlineSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempQtyMap, setTempQtyMap] = useState<Record<string, string>>({});

  // --- DUPLICATE PROTECTIONS STATES ---
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<React.ReactNode>("");
  const [draftPayload, setDraftPayload] = useState<any>(null);

  // --- MEMOS & EFFECTS ---
  useEffect(() => {
    if (!isPusat && wmsState?.branchId) {
      setTargetEntity(wmsState.branchId);
    }
  }, [isPusat, wmsState?.branchId]);

  useEffect(() => {
    if (isPusat) {
      setPaymentMethod("TEMPO");
      setFundingSource("");
      const tgl = new Date(tanggalPenerimaan);
      tgl.setDate(tgl.getDate() + 7);
      const jatuhTempo = tgl.toISOString().split("T")[0];
      setTanggalJatuhTempo(jatuhTempo);
    }
  }, [isPusat, tanggalPenerimaan]);

  const regionalVendors = useMemo(() => {
    return vendors.filter(
      (v) => v.regionId === wmsState?.regionId && v.isActive,
    );
  }, [vendors, wmsState?.regionId]);

  const regionalOutlets = useMemo(() => {
    return branches.filter((b) => {
      const isPusatEntity =
        b.name.toLowerCase().includes("pusat") ||
        b.code.toLowerCase().includes("pst");
      const matchRegion = b.regionId === wmsState?.regionId;
      return !isPusatEntity && matchRegion;
    });
  }, [branches, wmsState?.regionId]);

  const crossRegionOutlets = useMemo(() => {
    if (!selectedSourceRegion) return [];
    return branches.filter((b) => {
      const isPusatEntity =
        b.name.toLowerCase().includes("pusat") ||
        b.code.toLowerCase().includes("pst");
      return !isPusatEntity && b.regionId === selectedSourceRegion;
    });
  }, [branches, selectedSourceRegion]);

  const pusatLokalName = useMemo(() => {
    const r = regions.find((r) => r.id === wmsState?.regionId);
    return r ? `PUSAT ${r.name.toUpperCase()}` : "GUDANG PUSAT";
  }, [regions, wmsState?.regionId]);

  // Handle Drafts & ClickOutside
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        setCart(JSON.parse(savedDraft));
      } catch (e) {
        console.error(e);
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setTempQtyMap((prev) => {
      const cartIds = new Set(cart.map((item) => item.product_id));
      const newMap = { ...prev };
      Object.keys(newMap).forEach((id) => {
        if (!cartIds.has(id)) delete newMap[id];
      });
      return newMap;
    });
  }, [cart]);

  useEffect(() => {
    setSourceEntity("");
    setInvoiceNumber("");
    setProofFile(null);
    setRekeningNumber("");
    setRekeningName("");
    if (transaksiType === "MUTASI_PINJAMAN") {
      setPaymentMethod("MUTASI");
      setFundingSource("");
    } else {
      if (isPusat) {
        setPaymentMethod("TEMPO");
      } else {
        setPaymentMethod("CASH");
      }
    }
  }, [transaksiType, isPusat]);

  const activeRegionId = isPusat
    ? branches.find((b) => b.id === targetEntity)?.regionId ||
      wmsState?.regionId
    : wmsState?.regionId;

  const regionProducts = useMemo(() => {
    return outletProducts.filter(
      (p) => p.regionId === activeRegionId && p.status === "ACTIVE",
    );
  }, [outletProducts, activeRegionId]);

  // --- FUNGSI CART ---
  const cleanNum = (num: number) => Math.round(num * 100) / 100;

  const handleUpdateQty = (productId: string, newQty: number | string) => {
    let val = parseLocalNumber(newQty);
    if (isNaN(val) || val < 0) val = 0;

    const productRef = regionProducts.find((p) => p.id === productId);
    if (!productRef) return;

    const harga = productRef.purchasePrice || 0;

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

      // 1. Ambil dari Collection Receivings yang sudah disinkronisasi
      const localReceivings = await db.wms_receivings
        .find({
          selector: { branchId: payload.branchId },
        })
        .exec();

      // 2. Ambil dari Collection Outbox (transaksi lokal yang belum disinkronisasi)
      const localOutbox = await db.wms_outbox
        .find({
          selector: {
            type: {
              $in: ["RECEIVING_PUSAT_SUBMITTED", "RECEIVING_OUTLET_SUBMITTED"],
            },
          },
        })
        .exec();

      // Gabungkan data
      const pastDocs = [
        ...localReceivings.map((d) => d.toJSON()),
        ...localOutbox.map((d) => d.payload),
      ];

      // Filter khusus hari ini & ID berbeda (menghindari deteksi ke diri sendiri)
      const todaysDocs = pastDocs.filter((doc: any) => {
        if (!doc || !doc.receivedAt) return false;
        return doc.receivedAt.startsWith(todayDate) && doc.id !== payload.id;
      });

      // Kriteria 1: Pembelian Eksternal (Vendor + Invoice) -> HARD BLOCK
      if (
        payload.transactionType === "PEMBELIAN_BARANG" &&
        payload.invoiceNumber &&
        !payload.invoiceNumber.startsWith("INV-RO/")
      ) {
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
      } else {
        // Kriteria 2: Internal / Pengeluaran / Pinjaman (Source + Nominal) -> SOFT WARNING
        const isDuplicate = todaysDocs.some(
          (d: any) =>
            d.sourceEntity === payload.sourceEntity &&
            d.totalAmount === payload.totalAmount,
        );
        if (isDuplicate) {
          return {
            status: "SOFT_WARNING",
            message: (
              <span>
                Transaksi serupa dari <strong>{payload.sourceEntity}</strong>{" "}
                senilai{" "}
                <strong>
                  Rp {payload.totalAmount.toLocaleString("id-ID")}
                </strong>{" "}
                sudah ada di hari ini.
              </span>
            ),
          };
        }
      }

      return { status: "SAFE", message: "" };
    } catch (err) {
      console.error("Error checking duplicate:", err);
      return { status: "SAFE", message: "" }; // Jika error RxDB, izinkan bypass agar tidak memblokir operasional
    }
  };

  // --- LOGIKA SIMPAN FINAL (Dipanggil setelah lolos validasi/konfirmasi) ---
  const executeSubmit = async (payloadToSubmit: any) => {
    setLoading(true);
    try {
      const eventType = isPusat
        ? "RECEIVING_PUSAT_SUBMITTED"
        : "RECEIVING_OUTLET_SUBMITTED";
      await publishEvent(eventType, payloadToSubmit.id, payloadToSubmit);

      showToast(
        `Dokumen ${payloadToSubmit.id} Masuk Antrean Lokal!`,
        "SUCCESS",
      );

      // Reset form
      setCart([]);
      if (isPusat) setTargetEntity("");
      setSourceEntity("");
      setInvoiceNumber("");
      setProofFile(null);
      setExpenseName("");
      setExpenseAmount("");
      setReimburseName("");
      setRekeningNumber("");
      setRekeningName("");
      localStorage.removeItem(STORAGE_KEY);

      const today = new Date();
      setTanggalPenerimaan(today.toISOString().split("T")[0]);
      if (isPusat) {
        today.setDate(today.getDate() + 7);
        setTanggalJatuhTempo(today.toISOString().split("T")[0]);
      } else {
        setTanggalJatuhTempo("");
      }

      // Reset status modal
      setIsDuplicateModalOpen(false);
      setDraftPayload(null);
    } catch (error) {
      showToast("Gagal memproses Transaksi ke database lokal.", "ERROR");
    } finally {
      setLoading(false);
    }
  };

  // --- HUB PENGECEKAN SUBMIT SEBELUM EXECUTE ---
  const processSubmit = async (payloadToProcess: any) => {
    setLoading(true);
    const checkResult = await checkDuplicateLocal(payloadToProcess);
    setLoading(false);

    if (checkResult.status === "HARD_BLOCK") {
      showToast(checkResult.message as string, "ERROR");
      return;
    }

    if (checkResult.status === "SOFT_WARNING") {
      setDraftPayload(payloadToProcess);
      setDuplicateMessage(checkResult.message);
      setIsDuplicateModalOpen(true);
      return;
    }

    // Jika SAFE
    await executeSubmit(payloadToProcess);
  };

  // --- HANDLER UTAMA DARI TOMBOL UI ---
  const handleSubmit = async (customPayload?: any) => {
    // PROTEKSI: Mencegah fungsi menerima event onClick sebagai parameter
    const isReactEvent =
      customPayload &&
      typeof customPayload === "object" &&
      ("nativeEvent" in customPayload ||
        typeof customPayload.preventDefault === "function");

    if (customPayload && !isReactEvent) {
      // Langsung proses payload yang sudah dirakit oleh form (seperti pinjaman/pengeluaran jika menggunakan format ini)
      return processSubmit(customPayload);
    }

    // Validasi Field Standar
    if (!targetEntity) return showToast("Pilih Outlet penerima!", "ERROR");
    if (!isPusat && !sourceEntity)
      return showToast("Pilih Sumber/Vendor!", "ERROR");

    if (transaksiType !== "PEMBAYARAN_BIAYA" && cart.length === 0) {
      return showToast("Keranjang kosong!", "ERROR");
    }

    if (transaksiType === "PEMBAYARAN_BIAYA") {
      if (!expenseName || !expenseAmount || Number(expenseAmount) <= 0) {
        return showToast("Lengkapi nama biaya dan nominal!", "ERROR");
      }
      if (paymentMethod === "TEMPO" && (!rekeningNumber || !rekeningName)) {
        return showToast(
          "Lengkapi Nomor Rekening dan Atas Nama untuk Finance!",
          "ERROR",
        );
      }
    }

    if (paymentMethod === "TEMPO" && !tanggalJatuhTempo) {
      return showToast("Tanggal jatuh tempo wajib diisi!", "ERROR");
    }

    if (
      paymentMethod === "CASH" &&
      !fundingSource &&
      transaksiType !== "MUTASI_PINJAMAN"
    ) {
      return showToast(
        "Pilih sumber dana (Kasir/Petty Cash/Pribadi)!",
        "ERROR",
      );
    }
    if (fundingSource === "PRIBADI" && !reimburseName) {
      return showToast("Masukkan nama untuk Reimburse!", "ERROR");
    }

    setLoading(true);

    try {
      // 1. Generate Struktur Payload
      const region = regions.find((r) => r.id === activeRegionId);
      const regionCode = region
        ? region.name.substring(0, 3).toUpperCase()
        : "REG";
      const timestamp = Date.now();
      const outletAbbr = generateOutletAbbreviation(targetEntity, branches);

      let docPrefix = "RO";
      if (!isPusat && transaksiType === "MUTASI_PINJAMAN") docPrefix = "MUT";
      if (!isPusat && transaksiType === "PEMBAYARAN_BIAYA") docPrefix = "EXP";

      const generatedDocId = `${docPrefix}/${regionCode}/${outletAbbr}/${timestamp}`;

      let finalSourceEntity = isPusat ? pusatLokalName : sourceEntity;

      if (fundingSource === "PRIBADI") {
        finalSourceEntity = `REIMBURSE - ${reimburseName.toUpperCase()}`;
      } else if (transaksiType === "PEMBAYARAN_BIAYA") {
        if (paymentMethod === "TEMPO") {
          finalSourceEntity = `${sourceEntity.toUpperCase()} - [${rekeningNumber.toUpperCase()} | A/N ${rekeningName.toUpperCase()}]`;
        } else {
          finalSourceEntity = sourceEntity.toUpperCase();
        }
      }

      const isFromPusat = finalSourceEntity === pusatLokalName;
      const finalInvoiceNumber =
        !isPusat && !isFromPusat && transaksiType !== "MUTASI_PINJAMAN"
          ? invoiceNumber
          : `INV-${generatedDocId}`;

      let proofBase64 = null;
      if (proofFile) {
        proofBase64 = await toBase64(proofFile);
      }

      let finalItems = [];
      let totalAmount = 0;

      if (transaksiType === "PEMBAYARAN_BIAYA") {
        const amt = Number(expenseAmount);
        totalAmount = amt;
        finalItems = [
          {
            regionalItemId: `EXPENSE-${Date.now()}`,
            itemName: expenseName.toUpperCase(),
            uom: "DOC",
            qty: 1,
            price: amt,
            subtotal: amt,
          },
        ];
      } else {
        totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
        finalItems = cart.map((item) => ({
          regionalItemId: item.product_id,
          itemName: item.nama,
          uom: item.uom,
          qty: item.qty,
          price: item.harga,
          subtotal: item.subtotal,
        }));
      }

      const generatedPayload = {
        id: generatedDocId,
        regionId: activeRegionId || "UNKNOWN",
        branchId: targetEntity,
        transactionType: isPusat ? "PEMBELIAN_BARANG" : transaksiType,
        sourceEntity: finalSourceEntity,
        invoiceNumber: finalInvoiceNumber,
        totalAmount: totalAmount,
        paymentStatus: paymentMethod === "TEMPO" ? "UNPAID" : "PAID",
        totalPayment: paymentMethod === "TEMPO" ? 0 : totalAmount,
        dueDate: tanggalJatuhTempo || null,
        proofOfTransaction: proofBase64,
        receivedAt: tanggalPenerimaan,
        paymentMethod: paymentMethod,
        fundingSource: fundingSource || null,
        mutationType:
          transaksiType === "MUTASI_PINJAMAN" ? mutationScope : null,
        targetRegionId:
          transaksiType === "MUTASI_PINJAMAN" &&
          mutationScope === "CROSS_REGION"
            ? selectedSourceRegion
            : null,
        loanStatus: transaksiType === "MUTASI_PINJAMAN" ? "OPEN" : null,
        returnMethod: null,
        items: finalItems,
      };

      setLoading(false); // Selesai merakit payload

      // 2. Lempar payload ke fungsi validasi & eksekusi
      await processSubmit(generatedPayload);
    } catch (error) {
      setLoading(false);
      showToast("Gagal mempersiapkan payload Transaksi.", "ERROR");
    }
  };

  // Data yang akan di-pass ke komponen anak
  const sharedProps = {
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
    mutationScope,
    setMutationScope,
    selectedSourceRegion,
    setSelectedSourceRegion,
    expenseName,
    setExpenseName,
    expenseAmount,
    setExpenseAmount,
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
    vendors,
    regionalVendors,
    regionalOutlets,
    crossRegionOutlets,
    pusatLokalName,
    activeRegionId,
    cleanNum,
    handleUpdateQty,
    handleRemoveItem,
    handleQtyChange,
    handleQtyCommit,
    handleQtyReset,
    handleSubmit,
    filteredInlineSearch: regionProducts
      .filter((p) =>
        (p.localName || "").toLowerCase().includes(inlineSearch.toLowerCase()),
      )
      .slice(0, 5),
    handleInlineSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      const filtered = regionProducts.filter((p) =>
        (p.localName || "").toLowerCase().includes(inlineSearch.toLowerCase()),
      );
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        handleUpdateQty(filtered[0].id, 1);
        setInlineSearch("");
        setShowDropdown(false);
      }
    },
    totalEstimasi: cart.reduce((sum, item) => sum + item.subtotal, 0),
    isHideUpload: sourceEntity === pusatLokalName,
  };

  return (
    <>
      <div className="space-y-6 pb-10 animate-fade">
        {/* Header Umum */}
        {isPusat ? (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <PackagePlus className="text-sky-600" /> Kirim Barang ke Cabang
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Form Pusat: Pembelian Barang untuk Outlet Tujuan
            </p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <PackagePlus className="text-sky-600" /> RECEIVING OUTLET
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Form Outlet: Penerimaan, Mutasi & Pengeluaran Kas
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <Store size={16} className="text-sky-600" />
                <span className="font-black text-sm text-slate-700 uppercase">
                  {branches.find((b) => b.id === targetEntity)?.name ||
                    "Pilih Outlet"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransaksiType("PEMBELIAN_BARANG")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${
                    transaksiType === "PEMBELIAN_BARANG"
                      ? "bg-sky-600 text-white border-sky-600 shadow-md"
                      : "bg-white text-sky-700 border-sky-200 hover:bg-sky-100"
                  }`}
                >
                  PEMBELIAN
                </button>
                <button
                  onClick={() => setTransaksiType("PEMBAYARAN_BIAYA")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${
                    transaksiType === "PEMBAYARAN_BIAYA"
                      ? "bg-amber-500 text-white border-amber-500 shadow-md"
                      : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  PENGELUARAN
                </button>
                <button
                  onClick={() => setTransaksiType("MUTASI_PINJAMAN")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${
                    transaksiType === "MUTASI_PINJAMAN"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  PINJAMAN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Konten dinamis */}
        {isPusat ? (
          <ReceivingPembelian {...sharedProps} isPusat={true} />
        ) : (
          <>
            {transaksiType === "PEMBELIAN_BARANG" && (
              <ReceivingPembelian {...sharedProps} isPusat={false} />
            )}
            {transaksiType === "PEMBAYARAN_BIAYA" && (
              <ReceivingPembayaran {...sharedProps} />
            )}
            {transaksiType === "MUTASI_PINJAMAN" && (
              <ReceivingPinjaman {...sharedProps} />
            )}
          </>
        )}
      </div>

      {/* MODAL KONFIRMASI DUPLIKAT (Hanya muncul jika isDuplicateModalOpen = true) */}
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
    </>
  );
};
