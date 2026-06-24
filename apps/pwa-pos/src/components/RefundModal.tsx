// Path: apps/pwa-pos/src/components/RefundModal.tsx
import React, { useState, useMemo } from "react";
import {
  X,
  Undo2,
  ShieldCheck,
  Plus,
  Minus,
  Lock,
  ListX,
  Banknote,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onConfirmRefund: (
    invoiceId: string,
    items: Array<{
      productId: string;
      sku: string;
      qtyRefunded: number;
      amountRefunded: number;
    }>,
    refundMethod: "CASH" | "CARD" | "QRIS" | "EWALLET" | "BANK_TRANSFER",
    totalRefundAmount: number,
    reason: string,
    managerPin: string,
    refundType: "CANCEL" | "SOLD_OUT",
  ) => Promise<void>;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirmRefund,
}) => {
  const { showToast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isVoidAll, setIsVoidAll] = useState(false);

  const [voidStep, setVoidStep] = useState<
    "LIST" | "CONFIRM_TYPE" | "PIN_VERIFY" | "CANCEL_NOTE"
  >("LIST");
  const [chosenType, setChosenType] = useState<"CANCEL" | "SOLD_OUT" | null>(
    null,
  );
  const [managerPin, setManagerPin] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [qtyToVoid, setQtyToVoid] = useState<number>(1);
  const [refundMethod, setRefundMethod] = useState<
    "CASH" | "CARD" | "QRIS" | "EWALLET" | "BANK_TRANSFER"
  >("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !transaction) return null;

  const validItems = transaction.items || [];
  const isDPOnly = validItems.length === 0;

  const availableItemsToRefund = validItems.filter(
    (it: any) => it.qty > (it.refundedQty || 0),
  );

  const handleSelectItemToVoid = (item: any) => {
    setIsVoidAll(false);
    setSelectedItem(item);
    setQtyToVoid(1);
    setVoidStep("CONFIRM_TYPE");
  };

  const handleSelectVoidAll = () => {
    setIsVoidAll(true);
    setSelectedItem(null);
    setVoidStep("CONFIRM_TYPE");
  };

  const handleIncrementVoidQty = () => {
    if (!selectedItem) return;
    const maxQty = selectedItem.qty - (selectedItem.refundedQty || 0);
    if (qtyToVoid >= maxQty) {
      showToast(
        `Maksimal refund untuk produk ini adalah ${maxQty} porsi!`,
        "WARNING",
      );
      return;
    }
    setQtyToVoid((prev) => prev + 1);
  };

  const handleDecrementVoidQty = () => {
    if (qtyToVoid <= 1) return;
    setQtyToVoid((prev) => prev - 1);
  };

  const handleRefundTypeSelect = (type: "CANCEL" | "SOLD_OUT") => {
    setChosenType(type);
    setVoidStep("PIN_VERIFY");
  };

  const handleNumpadPress = (val: string) => {
    if (val === "CLEAR") {
      setManagerPin("");
    } else if (val === "BACKSPACE") {
      setManagerPin((prev) => prev.slice(0, -1));
    } else {
      if (managerPin.length < 6) {
        setManagerPin((prev) => prev + val);
      }
    }
  };

  const handleSubmitPin = () => {
    if (managerPin.length < 4) {
      showToast("PIN terlalu pendek!", "WARNING");
      return;
    }
    setVoidStep("CANCEL_NOTE");
  };

  // LOGIKA MATEMATIKA KALKULASI PRO-RATA & DOWN PAYMENT
  const calculationData = useMemo(() => {
    const rawGrandTotal = Number(
      transaction.grand_total || transaction.grandTotal || 0,
    );

    // Skenario 1: Refund DP (Belum ada pesanan menu)
    if (isDPOnly) {
      return {
        prevGrandTotal: rawGrandTotal,
        newGrandTotal: isVoidAll ? 0 : rawGrandTotal,
        refundAmount: isVoidAll ? rawGrandTotal : 0,
        taxRate: 0,
        serviceRate: 0,
      };
    }

    // Skenario 2: Refund Normal berbasis Item
    const originalSubtotal = validItems.reduce(
      (acc: number, it: any) => acc + it.price * it.qty,
      0,
    );
    const taxRate =
      originalSubtotal > 0
        ? Number(transaction.tax_amount || 0) / originalSubtotal
        : 0.1;
    const serviceRate =
      originalSubtotal > 0
        ? Number(transaction.service_amount || 0) / originalSubtotal
        : 0.05;

    const prevValidSubtotal = validItems.reduce(
      (acc: number, it: any) =>
        acc + it.price * Math.max(0, it.qty - (it.refundedQty || 0)),
      0,
    );
    const prevTax = prevValidSubtotal * taxRate;
    const prevService = prevValidSubtotal * serviceRate;
    const prevGrandTotal = prevValidSubtotal + prevTax + prevService;

    let newValidSubtotal = prevValidSubtotal;
    if (isVoidAll) {
      newValidSubtotal = 0;
    } else if (selectedItem) {
      newValidSubtotal = prevValidSubtotal - selectedItem.price * qtyToVoid;
    }

    const newTax = newValidSubtotal * taxRate;
    const newService = newValidSubtotal * serviceRate;
    const newGrandTotal = newValidSubtotal + newTax + newService;

    const refundAmount = prevGrandTotal - newGrandTotal;

    return {
      prevGrandTotal,
      newGrandTotal,
      refundAmount,
      taxRate,
      serviceRate,
    };
  }, [validItems, transaction, isVoidAll, selectedItem, qtyToVoid, isDPOnly]);

  const executeRefundTransaction = async () => {
    if (!isVoidAll && !selectedItem && !isDPOnly) return;
    if (!voidNote.trim()) {
      showToast("Catatan pembatalan wajib diisi!", "WARNING");
      return;
    }

    // PROTEKSI DOUBLE CLICK
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let itemsToRefund: any[] = [];
      const { taxRate, serviceRate, refundAmount } = calculationData;

      if (!isDPOnly) {
        if (isVoidAll) {
          itemsToRefund = availableItemsToRefund.map((i: any) => {
            const qty = i.qty - (i.refundedQty || 0);
            return {
              productId: i.product_id || i.productId || "UNKNOWN",
              sku: i.sku,
              qtyRefunded: qty,
              amountRefunded: Math.round(
                i.price * qty * (1 + taxRate + serviceRate),
              ),
            };
          });
        } else if (selectedItem) {
          itemsToRefund = [
            {
              productId:
                selectedItem.product_id || selectedItem.productId || "UNKNOWN",
              sku: selectedItem.sku,
              qtyRefunded: qtyToVoid,
              amountRefunded: Math.round(
                selectedItem.price * qtyToVoid * (1 + taxRate + serviceRate),
              ),
            },
          ];
        }
      }

      const finalRefundAmount = Math.round(refundAmount);

      await onConfirmRefund(
        transaction.id || transaction.invoice_id,
        itemsToRefund,
        refundMethod,
        finalRefundAmount,
        voidNote,
        managerPin,
        chosenType!,
      );

      showToast(
        isVoidAll
          ? `FULL REFUND (Rp ${finalRefundAmount.toLocaleString()}) BERHASIL!`
          : `REFUND: ${qtyToVoid}x ${selectedItem?.name} berhasil dikembalikan.`,
        "SUCCESS",
      );
      handleResetModalState();
      // Perhatikan: Kita tidak men-set isSubmitting(false) saat sukses karena Modal otomatis di-unmount/ditutup
    } catch (e: any) {
      showToast(
        e.message || "Otorisasi Gagal. Silakan ulangi PIN Anda.",
        "ERROR",
      );
      setManagerPin("");
      setVoidStep("PIN_VERIFY");
      setIsSubmitting(false); // Kembalikan ke false agar bisa dicoba lagi
    }
  };

  const handleResetModalState = () => {
    setSelectedItem(null);
    setIsVoidAll(false);
    setChosenType(null);
    setManagerPin("");
    setVoidNote("");
    setQtyToVoid(1);
    setRefundMethod("CASH");
    setVoidStep("LIST");
    onClose();
  };

  const handleQwertyPress = (key: string) => {
    if (key === "BACKSPACE") {
      setVoidNote((prev) => prev.slice(0, -1));
    } else if (key === "SPACE") {
      setVoidNote((prev) => prev + " ");
    } else if (key === "CLEAR") {
      setVoidNote("");
    } else {
      setVoidNote((prev) => prev + key);
    }
  };

  const qwertyRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "⌫"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-350 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white text-slate-900 rounded-4xl shadow-2xl p-5 border border-slate-200 flex flex-col max-h-[90vh] text-xs overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Undo2 size={16} className="text-orange-600" />
            <h3 className="font-black text-xs md:text-sm uppercase tracking-tight text-slate-800">
              Sistem Refund Kasir
            </h3>
          </div>
          <button
            onClick={handleResetModalState}
            className="text-slate-400 hover:text-slate-900 cursor-pointer p-0.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {voidStep === "LIST" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                INV: {transaction.invoice_id || transaction.id}
              </span>
              <span className="text-[9px] font-bold text-slate-400">
                {isDPOnly ? "DOWN PAYMENT" : `${validItems.length} item`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-3">
              {isDPOnly ? (
                <div className="border p-4 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50 border-slate-200">
                  <Banknote size={24} className="text-slate-400" />
                  <span className="font-black text-slate-600 uppercase tracking-widest text-[10px]">
                    Transaksi DP / Tanpa Item
                  </span>
                  <span className="font-black text-slate-900 text-lg">
                    Rp {calculationData.prevGrandTotal.toLocaleString()}
                  </span>
                </div>
              ) : (
                validItems.map((item: any, idx: number) => {
                  const isFullyRefunded = item.refundedQty >= item.qty;
                  const isPartiallyRefunded =
                    item.refundedQty > 0 && !isFullyRefunded;

                  return (
                    <div
                      key={idx}
                      className={`border p-2.5 rounded-xl flex items-center justify-between gap-3 font-bold text-[11px] transition-all
                        ${isFullyRefunded ? "bg-slate-100 border-slate-200 opacity-60" : "bg-slate-50 border-slate-200 hover:border-orange-200"}
                      `}
                    >
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-black block uppercase truncate ${item.refundedQty > 0 ? "text-red-600 line-through decoration-red-400" : "text-slate-900"}`}
                        >
                          {item.name}{" "}
                          {isPartiallyRefunded
                            ? `(Refund ${item.refundedQty})`
                            : ""}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-400 text-[9px] font-medium">
                            Qty Awal:{" "}
                            <span className="text-slate-700 font-black">
                              x{item.qty}
                            </span>
                          </span>
                        </div>
                      </div>
                      {!isFullyRefunded && (
                        <button
                          onClick={() => handleSelectItemToVoid(item)}
                          className="p-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          <Undo2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {(availableItemsToRefund.length > 0 || isDPOnly) && (
              <button
                onClick={handleSelectVoidAll}
                className="w-full p-3.5 bg-red-50 border-2 border-red-200 hover:bg-red-600 hover:border-red-600 hover:text-white text-red-600 font-black uppercase rounded-xl flex justify-center items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <ListX size={16} />
                {isDPOnly ? "Refund Seluruh DP" : "Refund Seluruh Transaksi"}
              </button>
            )}
          </div>
        )}

        {voidStep === "CONFIRM_TYPE" && (isVoidAll || selectedItem) && (
          <div className="flex-1 flex flex-col justify-between min-h-0 animate-fade-in">
            <div className="space-y-3 overflow-y-auto pr-0.5">
              <div
                className={`p-3 text-white rounded-xl shadow-lg ${isVoidAll ? "bg-red-600" : "bg-slate-900"}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase text-xs truncate">
                    {isVoidAll
                      ? `FULL REFUND (${isDPOnly ? "DP" : `${availableItemsToRefund.length} ITEM`})`
                      : selectedItem?.name}
                  </span>
                  {!isVoidAll && !isDPOnly && (
                    <span className="text-orange-400 font-black">
                      x{selectedItem?.qty - (selectedItem?.refundedQty || 0)}{" "}
                      Maks
                    </span>
                  )}
                </div>
              </div>

              {!isVoidAll &&
                !isDPOnly &&
                selectedItem?.qty - (selectedItem?.refundedQty || 0) > 1 && (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Jumlah Refund:
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDecrementVoidQty}
                        className="w-8 h-8 bg-white border rounded hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-black text-sm w-6 text-center">
                        {qtyToVoid}
                      </span>
                      <button
                        onClick={handleIncrementVoidQty}
                        className="w-8 h-8 bg-white border rounded hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-wider">
                  Metode Pengembalian Dana:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "CASH",
                      "CARD",
                      "QRIS",
                      "EWALLET",
                      "BANK_TRANSFER",
                    ] as const
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundMethod(m)}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all cursor-pointer ${
                        refundMethod === m
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {m.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex justify-between text-[10px] font-black text-green-700 uppercase mb-1">
                  <span>Grand Total Lama</span>
                  <span>
                    Rp{" "}
                    {Math.round(
                      calculationData.prevGrandTotal,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-black text-green-700 uppercase mb-2">
                  <span>Sisa Grand Total (Baru)</span>
                  <span>
                    Rp{" "}
                    {Math.round(calculationData.newGrandTotal).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 border-t border-green-200 pt-2">
                  <Banknote size={16} className="text-green-600" />
                  <span className="text-xs font-black uppercase text-green-800">
                    KEMBALIKAN DANA: Rp{" "}
                    {Math.round(calculationData.refundAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleRefundTypeSelect("CANCEL")}
                  className="w-full p-3 bg-white border-2 border-orange-200 rounded-xl text-left hover:bg-orange-50 cursor-pointer flex gap-3 items-center"
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ShieldCheck size={14} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-slate-900 text-[11px] font-black">
                      1. Cancel / Pengembalian Dana
                    </p>
                    <p className="text-slate-400 text-[8px]">
                      Hanya mengembalikan uang ke pelanggan
                    </p>
                  </div>
                </button>

                {!isDPOnly && (
                  <button
                    onClick={() => handleRefundTypeSelect("SOLD_OUT")}
                    className="w-full p-3 bg-white border-2 border-red-200 rounded-xl text-left hover:bg-red-50 cursor-pointer flex gap-3 items-center"
                  >
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Lock size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-slate-900 text-[11px] font-black">
                        2. Refund & Sold Out Menu
                      </p>
                      <p className="text-slate-400 text-[8px]">
                        Kembalikan uang & otomatis matikan produk
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setVoidStep("LIST")}
              className="w-full py-2.5 mt-3 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
            >
              ← Kembali
            </button>
          </div>
        )}

        {voidStep === "PIN_VERIFY" && (
          <div className="flex-1 flex flex-col justify-between min-h-0 animate-fade-in">
            <div>
              <div className="text-center mb-4">
                <ShieldCheck
                  size={32}
                  className="text-purple-600 mx-auto mb-2"
                />
                <h4 className="font-black text-sm uppercase text-slate-800">
                  Otorisasi PIN Manajer
                </h4>
              </div>
              <input
                type="password"
                readOnly
                value={"•".repeat(managerPin.length)}
                className="w-full bg-slate-100 rounded-xl p-3 font-black text-center text-lg tracking-[0.5em] mb-4 outline-none"
              />
              <div className="grid grid-cols-3 gap-2 max-w-50 mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="py-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer font-black"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadPress("CLEAR")}
                  className="py-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer font-black text-xs uppercase"
                >
                  CLR
                </button>
                <button
                  onClick={() => handleNumpadPress("0")}
                  className="py-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer font-black"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  className="py-2.5 border border-amber-200 text-amber-500 rounded-lg hover:bg-amber-50 cursor-pointer font-black"
                >
                  ⌫
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setVoidStep("CONFIRM_TYPE");
                  setManagerPin("");
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitPin}
                className="flex-1 py-2.5 bg-purple-600 text-white font-black uppercase rounded-xl cursor-pointer"
              >
                Lanjut →
              </button>
            </div>
          </div>
        )}

        {voidStep === "CANCEL_NOTE" && (
          <div className="flex-1 flex flex-col animate-fade-in h-full">
            <div className="mb-2 shrink-0">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">
                Catatan Alasan Refund (Audit)
              </label>
              <textarea
                value={voidNote}
                readOnly
                rows={2}
                className="w-full bg-slate-50 border-2 rounded-xl p-3 text-sm font-black focus:outline-none focus:border-orange-400 resize-none text-slate-800"
                placeholder="Alasan kembalikan uang..."
              />
            </div>

            <div className="flex-1 flex flex-col justify-end gap-1.5 mb-3 bg-slate-100 p-2 rounded-xl border border-slate-200">
              {qwertyRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex justify-center gap-1.5">
                  {row.map((key) => {
                    const isBackspace = key === "⌫";
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          handleQwertyPress(isBackspace ? "BACKSPACE" : key)
                        }
                        className={`py-2 px-3 sm:px-4 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-xs transition-colors cursor-pointer ${isBackspace ? "bg-amber-100 text-amber-700 border-amber-300" : "text-slate-800"}`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="flex justify-center gap-1.5 mt-0.5">
                <button
                  onClick={() => handleQwertyPress("CLEAR")}
                  className="py-2 px-4 bg-red-100 border border-red-300 text-red-600 rounded-lg shadow-sm hover:bg-red-200 font-black text-[10px] uppercase cursor-pointer"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => handleQwertyPress("SPACE")}
                  className="py-2 px-16 sm:px-24 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-200 active:bg-slate-300 font-black text-[10px] uppercase cursor-pointer text-slate-800"
                >
                  SPACE
                </button>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setVoidStep("PIN_VERIFY")}
                className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-600 font-black uppercase rounded-xl cursor-pointer hover:bg-slate-200"
              >
                Kembali
              </button>
              <button
                onClick={executeRefundTransaction}
                disabled={isSubmitting}
                className={`flex-1 py-3 bg-orange-600 text-white font-black uppercase rounded-xl cursor-pointer hover:bg-orange-700 shadow-md flex items-center justify-center gap-2 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? "MEMPROSES..." : "SUBMIT REFUND"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
