import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Receipt,
  CreditCard,
  Banknote,
  Landmark,
  Printer,
  Share2,
} from "lucide-react";
import { usePos } from "../core/PosProvider";
import { useToast } from "../components/Toast";

interface BillingModalProps {
  selectedTable: string | null;
  cart: any[];
  cartSubtotal: number;
  discountAmount: number;
  serviceCharge: number;
  restaurantTax: number;
  cartGrandTotal: number;
  paymentType: "CASH" | "DEBIT" | "QRIS" | "PRIVE";
  setPaymentType: (type: "CASH" | "DEBIT" | "QRIS" | "PRIVE") => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  calculatedChange: number;
  cardNumber: string; // Legacy prop (dipertahankan agar parent tidak error)
  setCardNumber: (val: string) => void; // Legacy prop
  priveNote: string;
  setPriveNote: (val: string) => void;
  setShowPaymentModal: (show: boolean) => void;
  handleFinalCheckoutSubmit: (e: React.FormEvent) => void;
  // Arsitektur 3-Lapis: props baru (opsional, backward-compatible)
  activeOrderId?: string | null;
  onInvoiceCreated?: (invoiceId: string, orderId: string) => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  selectedTable,
  cart,
  cartSubtotal,
  discountAmount,
  serviceCharge,
  restaurantTax,
  cartGrandTotal,
  paymentType,
  setPaymentType,
  cashReceived,
  setCashReceived,
  calculatedChange,
  cardNumber,
  setCardNumber,
  priveNote,
  setPriveNote,
  setShowPaymentModal,
  handleFinalCheckoutSubmit,
  activeOrderId,
  onInvoiceCreated,
}) => {
  const { state } = usePos();
  const { showToast } = useToast();

  // =========================================================================
  // ARSITEKTUR 3-LAPIS: INVOICE_CREATED saat modal pertama kali terbuka
  // =========================================================================
  const invoiceIdRef = React.useRef<string>("");
  const invoiceCreatedForRef = React.useRef<string>("");

  useEffect(() => {
    if (!activeOrderId || !onInvoiceCreated) return;
    // Pastikan hanya fire sekali per activeOrderId unik
    if (invoiceCreatedForRef.current === activeOrderId) return;
    invoiceCreatedForRef.current = activeOrderId;

    const newInvoiceId =
      "INV-" +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    invoiceIdRef.current = newInvoiceId;

    onInvoiceCreated(newInvoiceId, activeOrderId);
  }, [activeOrderId, onInvoiceCreated]);

  // =========================================================================
  // MEMBACA KONFIGURASI SETTINGS DARI STATE RXDB
  // =========================================================================
  const companyName = state?.companyName || "ASSTRO HOLDING ECOSYSTEM";
  const branchId = state?.branchId || "LOCAL NODE";

  const taxSettings = state?.settings?.pajak || {
    ppn: 11,
    serviceCharge: 5,
    taxIncluded: true,
  };
  const taxRateSetting = Number(taxSettings.ppn) || 0;
  const serviceRateSetting = Number(taxSettings.serviceCharge) || 0;

  const debitSettings = state?.settings?.debit || { bankName: "BCA" };
  const selectedDebitBank = debitSettings.bankName;
  // Provider yang diizinkan sesuai Schema Backend (BCA_EDC, MANDIRI_EDC, dll)
  const debitBankOptions = ["BCA", "MANDIRI", "BNI", "BRI"];

  const qrisSettings = state?.settings?.qris || {
    bankName: "",
    accountNumber: "",
    accountName: "",
    qrUrl: "",
  };
  const dynamicAccountNo = qrisSettings.accountNumber;
  const dynamicQrCodeUrl = qrisSettings.qrUrl;

  const paymentSettings = state?.settings?.pembayaran || {
    cash: true,
    debit: true,
    qris: true,
  };

  const availablePaymentTypes = useMemo(() => {
    const types: Array<"CASH" | "DEBIT" | "QRIS" | "PRIVE"> = [];
    if (paymentSettings.cash) types.push("CASH");
    if (paymentSettings.debit || paymentSettings.edc) types.push("DEBIT");
    if (paymentSettings.qris) types.push("QRIS");
    types.push("PRIVE");
    return types;
  }, [paymentSettings]);

  useEffect(() => {
    if (
      !availablePaymentTypes.includes(paymentType) &&
      availablePaymentTypes.length > 0
    ) {
      setPaymentType(availablePaymentTypes[0]);
    }
  }, [availablePaymentTypes, paymentType, setPaymentType]);

  // =========================================================================
  // STATE LOKAL & PENGENDALI INPUT DINAMIS
  // =========================================================================
  const [selectedBank, setSelectedBank] = useState(
    selectedDebitBank || debitBankOptions[0] || "BCA",
  );
  const [managerPinForPrive, setManagerPinForPrive] = useState("");
  const [isPriveAuthorized, setIsPriveAuthorized] = useState(false);
  const [isQwertyShift, setIsQwertyShift] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Metadata Rekonsiliasi EDC
  const [activeDebitInput, setActiveDebitInput] = useState<
    "APPROVAL_CODE" | "TRACE_NUMBER"
  >("APPROVAL_CODE");
  const [approvalCode, setApprovalCode] = useState("");
  const [traceNumber, setTraceNumber] = useState("");

  // Transformasi Method untuk Skema Baru
  const actualPaymentMethod = useMemo(() => {
    if (paymentType === "DEBIT") return "CARD"; // Skema baru menggunakan "CARD"
    return paymentType;
  }, [paymentType]);

  const paymentProvider = useMemo(() => {
    if (paymentType === "DEBIT") return `${selectedBank}_EDC`;
    if (paymentType === "QRIS") return "MIDTRANS"; // Contoh default provider QRIS
    return "";
  }, [paymentType, selectedBank]);

  // =========================================================================
  // LOGIKA NUMPAD & KEYBOARD FISIK
  // =========================================================================
  const handleUniversalNumpadPress = (val: string) => {
    if (paymentType === "CASH") {
      if (val === "CLEAR") {
        setCashReceived("");
      } else if (val === "BACKSPACE") {
        setCashReceived(cashReceived.slice(0, -1));
      } else {
        const next = cashReceived + val;
        setCashReceived(next.replace(/^0+/, "") || "0");
      }
    } else if (paymentType === "DEBIT") {
      const currentVal =
        activeDebitInput === "APPROVAL_CODE" ? approvalCode : traceNumber;
      const setter =
        activeDebitInput === "APPROVAL_CODE" ? setApprovalCode : setTraceNumber;

      if (val === "CLEAR") {
        setter("");
      } else if (val === "BACKSPACE") {
        setter(currentVal.slice(0, -1));
      } else {
        setter(currentVal + val);
      }
    } else if (paymentType === "PRIVE" && !isPriveAuthorized) {
      if (val === "CLEAR") {
        setManagerPinForPrive("");
      } else if (val === "BACKSPACE") {
        setManagerPinForPrive(managerPinForPrive.slice(0, -1));
      } else {
        if (managerPinForPrive.length < 4) {
          setManagerPinForPrive(managerPinForPrive + val);
        }
      }
    }
  };

  const handleInternalQwertyPress = (char: string) => {
    if (char === "BACKSPACE") {
      setPriveNote(priveNote.slice(0, -1));
    } else if (char === "SPACE") {
      setPriveNote(priveNote + " ");
    } else if (char === "CLEAR") {
      setPriveNote("");
    } else if (char === "SHIFT") {
      setIsQwertyShift(!isQwertyShift);
    } else {
      const targetChar = isQwertyShift
        ? char.toUpperCase()
        : char.toLowerCase();
      setPriveNote(priveNote + targetChar);
    }
  };

  useEffect(() => {
    const handleHardwareKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (paymentType === "PRIVE" && isPriveAuthorized) {
        if (key === "Backspace") {
          e.preventDefault();
          handleInternalQwertyPress("BACKSPACE");
        } else if (key === " ") {
          e.preventDefault();
          handleInternalQwertyPress("SPACE");
        } else if (key.length === 1) {
          e.preventDefault();
          setPriveNote(priveNote + key);
        }
        return;
      }

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleUniversalNumpadPress(key);
      } else if (key === "Backspace") {
        e.preventDefault();
        handleUniversalNumpadPress("BACKSPACE");
      } else if (key === "Escape" || key === "Delete") {
        e.preventDefault();
        handleUniversalNumpadPress("CLEAR");
      }
    };

    window.addEventListener("keydown", handleHardwareKeyDown);
    return () => window.removeEventListener("keydown", handleHardwareKeyDown);
  }, [
    paymentType,
    cashReceived,
    approvalCode,
    traceNumber,
    activeDebitInput,
    managerPinForPrive,
    isPriveAuthorized,
    priveNote,
  ]);

  // =========================================================================
  // FUNGSI UTILITAS & VALIDASI
  // =========================================================================
  const handlePrintProformaThermal = () => {
    const timestamp = new Date().toLocaleString("id-ID");
    const itemLines = cart
      .map(
        (i) =>
          `${i.name} (x${i.qty}) - Rp ${(i.price * i.qty).toLocaleString()}`,
      )
      .join("\n");

    showToast(
      `====== ${companyName} ======\n` +
        `CABANG: ${branchId}\n` +
        `WAKTU: ${timestamp}\n` +
        `MEJA / SESI: ${selectedTable}\n` +
        `----------------------------------------\n` +
        `[*** INVOICE SEMENTARA / PRE-BILL ***]\n` +
        `----------------------------------------\n` +
        `${itemLines}\n` +
        `----------------------------------------\n` +
        `SUBTOTAL: Rp ${cartSubtotal.toLocaleString()}\n` +
        `DISKON MANAJER: -Rp ${discountAmount.toLocaleString()}\n` +
        `SERVICE CHARGE (${serviceRateSetting}%): Rp ${serviceCharge.toLocaleString()}\n` +
        `PPN RESTAURANT (${taxRateSetting}%): Rp ${restaurantTax.toLocaleString()}\n` +
        `========================================\n` +
        `TOTAL BILL: Rp ${cartGrandTotal.toLocaleString()}\n` +
        `========================================\n` +
        `Harap Periksa Kembali Pesanan Anda.\n` +
        `Belum Berupa Bukti Pembayaran Lunas.\n` +
        `TERIMA KASIH ATAS KUNJUNGAN ANDA`,
      "INFO",
    );
  };

  const handleShareProformaPDF = async () => {
    const docData = {
      title: `Invoice_Sementara_${selectedTable}.pdf`,
      text: `Halo, berikut rincian nota tagihan sementara untuk Meja ${selectedTable} di ${companyName}. Total Tagihan: Rp ${cartGrandTotal.toLocaleString()}.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(docData);
      } catch (err) {}
    } else {
      showToast(
        `Fitur Web Share tidak didukung browser ini.\nTautan PDF Nota Sementara Meja ${selectedTable} disalin ke clipboard kasir!`,
        "WARNING",
      );
    }
  };

  const handleVerifyPriveManagerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (managerPinForPrive === "0000") {
      setIsPriveAuthorized(true);
      showToast("Otorisasi Prive Disetujui Manajer.", "SUCCESS");
    } else {
      setIsPriveAuthorized(false);
      showToast("PIN SUPERVISOR SALAH! AKSES PRIVE DITOLAK.", "ERROR");
      setManagerPinForPrive("");
    }
  };

  const isCheckoutDisabled = useMemo(() => {
    if (paymentType === "CASH" && (Number(cashReceived) || 0) < cartGrandTotal)
      return true;
    // Validasi Metadata Wajib untuk Rekonsiliasi EDC
    if (paymentType === "DEBIT" && !approvalCode.trim()) return true;
    if (paymentType === "PRIVE" && (!isPriveAuthorized || !priveNote.trim()))
      return true;
    return false;
  }, [
    paymentType,
    cashReceived,
    cartGrandTotal,
    approvalCode,
    isPriveAuthorized,
    priveNote,
  ]);

  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ["CLEAR", "SPACE"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-300 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (paymentType === "PRIVE" && !isPriveAuthorized) {
            showToast(
              "Harap lakukan verifikasi PIN Manajer terlebih dahulu!",
              "ERROR",
            );
            return;
          }
          if (isSubmitting) return;
          setIsSubmitting(true);
          try {
            await handleFinalCheckoutSubmit(e);
          } catch (err) {
            setIsSubmitting(false);
          }
        }}
        data-active-order-id={activeOrderId || ""}
        data-pre-invoice-id={invoiceIdRef.current || ""}
        className="w-full max-w-5xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 h-[90vh] max-h-170 overflow-hidden animate-fade-in"
      >
        {/* ========================================================================= */}
        {/* GRID 1: STATIS PANEL (INVOICE & RINGKASAN BIAYA)                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col h-full justify-between overflow-hidden pr-2">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight flex items-center gap-2 text-slate-800">
              <Receipt size={16} className="text-orange-600" /> Detail Invoice:{" "}
              {selectedTable || "TA"}
            </h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handlePrintProformaThermal}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Print Bill
              </button>
              <button
                type="button"
                onClick={handleShareProformaPDF}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Share PDF
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 my-2 p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl scrollbar-thin">
            {cart.map((item) => {
              const activeQty = Math.max(
                0,
                item.qty - (item.voidedQty || 0) - (item.refundedQty || 0),
              );
              if (activeQty === 0) return null;
              const unitPrice = item.basePriceSnapshot || item.price;
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-1 border-b border-slate-200/40 last:border-b-0 text-[11px] font-bold uppercase tracking-tight"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-slate-900 font-black truncate block">
                      {item.nameSnapshot || item.name}
                    </span>
                    {(item.notes || item.note) && (
                      <span className="text-[9px] text-orange-600 italic bg-orange-50/70 px-1 rounded inline-block font-bold">
                        Ket: {item.notes || item.note}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 font-black text-slate-700 text-right">
                    Rp {unitPrice.toLocaleString("id-ID")}{" "}
                    <span className="text-slate-400 font-medium">
                      x {activeQty}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-1 text-[11px] font-bold text-slate-500 uppercase tracking-tight shrink-0 mb-3">
            <div className="flex justify-between">
              <span>Subtotal Menu</span>
              <span className="text-slate-900">
                Rp {cartSubtotal.toLocaleString("id-ID")}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon Manager</span>
                <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Service Charge ({serviceRateSetting}%)</span>
              <span className="text-slate-900">
                Rp {serviceCharge.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-dashed border-slate-300">
              <span>PPN Restaurant ({taxRateSetting}%)</span>
              <span className="text-slate-900">
                Rp {restaurantTax.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-xs font-black text-slate-900">
              <span>TOTAL BILL</span>
              <span className="text-orange-600 font-black text-base">
                Rp {cartGrandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 shrink-0 border-t border-slate-100 pt-3">
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 block">
              Pilih Tipe Pembayaran Kasir
            </span>
            <div className="grid grid-cols-2 gap-2">
              {availablePaymentTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPaymentType(t)}
                  className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                    paymentType === t
                      ? "bg-slate-900 border-slate-900 text-white shadow-md scale-[1.01]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t === "CASH" && <Banknote size={14} />}
                  {t === "DEBIT" && <CreditCard size={14} />}
                  {t === "QRIS" && <Receipt size={14} />}
                  {t === "PRIVE" && <Landmark size={14} />}
                  {t === "CASH"
                    ? "TUNAI"
                    : t === "DEBIT"
                      ? "EDC/KARTU"
                      : t === "QRIS"
                        ? "QRIS"
                        : "COMPLIMENT"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID 2: DINAMIS PANEL (METODE INTERACTIVE FORM & KEYBOARD HUB)            */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between h-full bg-slate-50 p-4 rounded-4xl border border-slate-200/60 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-3 shrink-0">
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">
              {paymentType === "CASH" && "Metode Tunai / Cash Operasional"}
              {paymentType === "DEBIT" && "Metode Mesin EDC / Standalone Mode"}
              {paymentType === "QRIS" && "Metode Scan QRIS / Transfer"}
              {paymentType === "PRIVE" &&
                "Metode Otorisasi Internal Compliment"}
            </span>
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="text-slate-400 hover:text-slate-900 cursor-pointer p-0.5"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-0.5 scrollbar-thin">
            {/* 1. TUNAI CASH */}
            {paymentType === "CASH" && (
              <div className="space-y-2.5 animate-fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="none"
                    value={Number(cashReceived).toLocaleString("id-ID")}
                    readOnly
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 shadow-inner font-black text-xl text-slate-900 text-right tracking-tight"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCashReceived(Math.ceil(cartGrandTotal).toString())
                    }
                    className="py-2 bg-orange-600 text-white hover:bg-orange-700 font-black text-[9px] rounded-lg uppercase border border-orange-600 cursor-pointer text-center"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 150000, 200000, 300000, 500000, 1000000].map(
                    (denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => setCashReceived(denom.toString())}
                        className="py-2 bg-white hover:bg-slate-100 text-slate-800 font-black text-[9px] rounded-lg border border-slate-200 cursor-pointer text-center"
                      >
                        {denom >= 1000000
                          ? `${denom / 1000000}M`
                          : `${denom / 1000}k`}
                      </button>
                    ),
                  )}
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex justify-between items-center mt-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Uang Kembali
                  </span>
                  <span className="text-base font-black text-slate-900">
                    Rp {calculatedChange.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            {/* 2. GESEK KARTU DEBIT / EDC (MODE METADATA REKONSILIASI) */}
            {paymentType === "DEBIT" && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Pilih Provider Mesin EDC
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 font-black text-xs text-slate-900 uppercase tracking-wider cursor-pointer"
                  >
                    {debitBankOptions.map((bank: string) => (
                      <option key={bank} value={bank}>
                        {bank} EDC Terminal
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                  <span className="text-[9px] font-bold text-blue-700 block text-center uppercase">
                    Status: Menunggu Kasir Input Manual dari Kertas Setruk EDC
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setActiveDebitInput("APPROVAL_CODE")}
                    className={`p-2.5 border-2 rounded-xl cursor-pointer transition-colors ${activeDebitInput === "APPROVAL_CODE" ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                  >
                    <label
                      className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${activeDebitInput === "APPROVAL_CODE" ? "text-orange-700" : "text-slate-500"}`}
                    >
                      Approval Code (Wajib)
                    </label>
                    <input
                      type="text"
                      inputMode="none"
                      value={approvalCode}
                      placeholder="Input Numpad..."
                      readOnly
                      className="w-full bg-transparent font-black text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  <div
                    onClick={() => setActiveDebitInput("TRACE_NUMBER")}
                    className={`p-2.5 border-2 rounded-xl cursor-pointer transition-colors ${activeDebitInput === "TRACE_NUMBER" ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                  >
                    <label
                      className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${activeDebitInput === "TRACE_NUMBER" ? "text-orange-700" : "text-slate-500"}`}
                    >
                      Trace Number (Opsional)
                    </label>
                    <input
                      type="text"
                      inputMode="none"
                      value={traceNumber}
                      placeholder="Input Numpad..."
                      readOnly
                      className="w-full bg-transparent font-black text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. DIGITAL QRIS */}
            {paymentType === "QRIS" && (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-white animate-fade-in flex flex-col items-center justify-center h-full min-h-70">
                <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center font-black text-[9px] uppercase text-slate-400 p-2 border border-slate-200 relative">
                  {dynamicQrCodeUrl ? (
                    <img
                      src={dynamicQrCodeUrl}
                      alt="QRIS Holding"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    "QRIS BARCODE"
                  )}
                </div>
                <div className="text-center">
                  {qrisSettings?.accountName ? (
                    <>
                      <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">
                        {qrisSettings.bankName || "BANK"} -{" "}
                        {qrisSettings.accountName}
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase block tracking-tight mt-0.5">
                        REK: {dynamicAccountNo}
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] font-black text-orange-600 uppercase block">
                      ⚠️ QRIS Belum Dikonfigurasi di Settings
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 4. COMPLIMENT / PRIVE */}
            {paymentType === "PRIVE" && (
              <div className="space-y-2 animate-fade-in">
                {!isPriveAuthorized ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Proteksi Keuangan: Input PIN Manajer via Numpad
                    </label>
                    <input
                      type="text"
                      inputMode="none"
                      value={"• ".repeat(managerPinForPrive.length)}
                      placeholder="Ketik 4 digit PIN Manajer..."
                      readOnly
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-center font-black text-lg text-slate-900 tracking-widest"
                    />
                    {managerPinForPrive.length === 4 && (
                      <button
                        type="button"
                        onClick={() => handleVerifyPriveManagerPin()}
                        className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all animate-pulse"
                      >
                        Verifikasi Kode Otorisasi PIN
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-center">
                      ✓ Otorisasi Compliment Disetujui Manajer
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                        Alasan / Nama Jajaran Jabatan Owner (Internal QWERTY)
                      </label>
                      <input
                        type="text"
                        inputMode="none"
                        value={priveNote}
                        placeholder="Gunakan keyboard internal di bawah untuk mengisi alasan..."
                        readOnly
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* HUB KONTROL INTERAKTIF: PAPAN KETIK DINAMIS                               */}
          {/* ========================================================================= */}
          <div className="w-full pt-2 border-t border-slate-200 shrink-0 mt-3">
            {paymentType === "PRIVE" && isPriveAuthorized ? (
              <div className="space-y-1.5 animate-fade-in">
                {qwertyRows.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1 w-full">
                    {row.map((key) => {
                      const isSpecial = [
                        "SHIFT",
                        "BACKSPACE",
                        "CLEAR",
                        "SPACE",
                      ].includes(key);
                      let btnStyle =
                        "bg-white hover:bg-slate-100 text-slate-900 text-xs font-black border border-slate-200 shadow-xs active:scale-95";
                      if (key === "SHIFT" && isQwertyShift)
                        btnStyle =
                          "bg-orange-600 text-white border-orange-600 shadow-md";
                      else if (key === "BACKSPACE" || key === "SHIFT")
                        btnStyle =
                          "bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black border border-slate-300";
                      else if (key === "CLEAR")
                        btnStyle =
                          "bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black border border-red-200";
                      else if (key === "SPACE")
                        btnStyle =
                          "bg-white hover:bg-slate-100 text-slate-900 font-black border border-slate-200 px-12 flex-1";

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleInternalQwertyPress(key)}
                          className={`h-11 px-2 rounded-lg transition-all flex items-center justify-center select-none cursor-pointer ${isSpecial ? btnStyle : `flex-1 ${btnStyle}`}`}
                        >
                          {key === "BACKSPACE"
                            ? "← Del"
                            : key === "SPACE"
                              ? "Spasi"
                              : key}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : paymentType !== "QRIS" ? (
              <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleUniversalNumpadPress(num)}
                    className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl transition-all border border-slate-200/80 shadow-xs cursor-pointer active:scale-95 flex items-center justify-center select-none"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("CLEAR")}
                  className="py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl border border-red-200 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("0")}
                  className="py-3 bg-white hover:bg-slate-100 text-slate-900 font-black text-base rounded-xl border border-slate-200/80 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleUniversalNumpadPress("BACKSPACE")}
                  className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-200 cursor-pointer active:scale-95 flex items-center justify-center select-none"
                >
                  ← Del
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isCheckoutDisabled || isSubmitting}
            className="w-full bg-slate-900 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md mt-3 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] select-none text-center"
          >
            {isSubmitting
              ? "MEMPROSES TRANSAKSI..."
              : "SELESAIKAN & CETAK STRUK LUNAS"}
          </button>

          {/* ========================================================================= */}
          {/* HIDDEN INPUTS (TRANSMISI DATA KE PARENT ONSUBMIT)                         */}
          {/* ========================================================================= */}
          <input
            type="hidden"
            name="actualPaymentMethod"
            value={actualPaymentMethod}
          />
          <input type="hidden" name="paymentProvider" value={paymentProvider} />
          <input type="hidden" name="captureMode" value="MANUAL" />
          <input type="hidden" name="approvalCode" value={approvalCode} />
          <input type="hidden" name="traceNumber" value={traceNumber} />
          {/* Arsitektur 3-Lapis: ID untuk parent fire PAYMENT_RECEIVED dengan invoice yang benar */}
          <input
            type="hidden"
            name="activeOrderId"
            value={activeOrderId || ""}
          />
          <input
            type="hidden"
            name="preInvoiceId"
            value={invoiceIdRef.current || ""}
          />
        </div>
      </form>
    </div>
  );
};
