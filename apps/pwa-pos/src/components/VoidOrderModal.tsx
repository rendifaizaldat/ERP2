// Path: apps/pwa-pos/src/components/VoidOrderModal.tsx
import React, { useState } from "react";
import {
  X,
  Trash2,
  ShieldCheck,
  Plus,
  Minus,
  AlertTriangle,
  Lock,
  ListX,
  ClipboardList,
  UserCog,
  ArrowRight,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface VoidOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTableData: any;
  onConfirmVoid: (
    sku: string,
    qtyToVoid: number,
    voidType: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    managerPin?: string,
    voidNote?: string,
  ) => Promise<void>;
}

export const VoidOrderModal: React.FC<VoidOrderModalProps> = ({
  isOpen,
  onClose,
  activeTableData,
  onConfirmVoid,
}) => {
  const { showToast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isVoidAll, setIsVoidAll] = useState(false);

  const [voidStep, setVoidStep] = useState<
    "LIST" | "CONFIRM_TYPE" | "PIN_VERIFY" | "CANCEL_NOTE"
  >("LIST");
  const [chosenType, setChosenType] = useState<
    "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL" | null
  >(null);
  const [managerPin, setManagerPin] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [qtyToVoid, setQtyToVoid] = useState<number>(1);

  if (!isOpen || !activeTableData) return null;

  const allSavedItems = activeTableData.savedItems || [];

  const savedKitchenItems = allSavedItems.filter((item: any) => {
    const activeQty =
      item.qty - (item.voidedQty || 0) - (item.refundedQty || 0);
    return activeQty > 0;
  });

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
    const maxQty =
      selectedItem.qty -
      (selectedItem.voidedQty || 0) -
      (selectedItem.refundedQty || 0);
    if (qtyToVoid >= maxQty) {
      showToast(`Maksimal void adalah ${maxQty} porsi!`, "WARNING");
      return;
    }
    setQtyToVoid((prev) => prev + 1);
  };

  const handleDecrementVoidQty = () => {
    if (qtyToVoid <= 1) return;
    setQtyToVoid((prev) => prev - 1);
  };

  const executeVoidTransaction = async (
    type: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    pin?: string,
    note?: string,
  ) => {
    if (isVoidAll) {
      showToast("Sedang memproses pembatalan seluruh meja...", "INFO");
      await onConfirmVoid("ALL", 0, type, pin, note);
    } else {
      if (!selectedItem) return;
      const id = selectedItem.id;
      await onConfirmVoid(id, qtyToVoid, type, pin, note);
    }
  };

  const handleSalahInput = async () => {
    try {
      await executeVoidTransaction("SALAH_INPUT");
      handleResetModalState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarangKosong = async () => {
    try {
      await executeVoidTransaction("BARANG_KOSONG");
      showToast(
        isVoidAll
          ? "VOID SEMUA & SOLD OUT BERHASIL!"
          : `VOID & SOLD OUT: Produk dinonaktifkan!`,
        "WARNING",
      );
      handleResetModalState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelRequest = () => {
    setChosenType("CANCEL");
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

  const handleSubmitCancelWithNote = async () => {
    if (!isVoidAll && !selectedItem) return;
    if (!voidNote.trim()) {
      showToast("Catatan pembatalan wajib diisi!", "WARNING");
      return;
    }

    try {
      await executeVoidTransaction("CANCEL", managerPin, voidNote);
      showToast(
        isVoidAll
          ? `VOID SEMUA CANCEL berhasil dibatalkan.`
          : `VOID CANCEL: ${qtyToVoid}x ${selectedItem?.name} dibatalkan.`,
        "SUCCESS",
      );
      handleResetModalState();
    } catch (e: any) {
      showToast(
        e.message || "Otorisasi Gagal. Silakan ulangi PIN Anda.",
        "ERROR",
      );
      setManagerPin("");
      setVoidStep("PIN_VERIFY");
    }
  };

  const handleResetModalState = () => {
    setSelectedItem(null);
    setIsVoidAll(false);
    setChosenType(null);
    setManagerPin("");
    setVoidNote("");
    setQtyToVoid(1);
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                Void Order
              </h3>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                {activeTableData.label
                  ? `Meja ${activeTableData.label}`
                  : "Pembatalan Pesanan"}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModalState}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {voidStep === "LIST" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Daftar Pesanan Aktif
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                  {savedKitchenItems.length} item
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300">
                {savedKitchenItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <ClipboardList size={32} className="mb-3 opacity-30" />
                    <p className="font-bold text-sm">Tidak ada pesanan</p>
                    <p className="text-xs">Meja ini kosong</p>
                  </div>
                ) : (
                  savedKitchenItems.map((item: any, idx: number) => {
                    const activeQty =
                      item.qty -
                      (item.voidedQty || 0) -
                      (item.refundedQty || 0);
                    const displayName = item.nameSnapshot || item.name;
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-orange-200 transition-all shadow-sm hover:shadow"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-800 truncate">
                            {displayName}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500 font-medium">
                              Qty:{" "}
                              <span className="font-extrabold text-slate-700">
                                ×{activeQty}
                              </span>
                            </span>
                            {item.voidedQty > 0 && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                -{item.voidedQty} void
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectItemToVoid(item)}
                          className="p-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all hover:shadow-md active:scale-95"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {savedKitchenItems.length > 0 && (
                <button
                  onClick={handleSelectVoidAll}
                  className="w-full py-3.5 bg-red-50 border-2 border-red-200 hover:bg-red-600 hover:border-red-600 hover:text-white text-red-600 font-extrabold text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <ListX size={16} />
                  Batalkan Seluruh Pesanan
                </button>
              )}
            </div>
          )}

          {voidStep === "CONFIRM_TYPE" && (isVoidAll || selectedItem) && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Info Card */}
              <div
                className={`p-4 rounded-xl shadow-md ${
                  isVoidAll ? "bg-red-600" : "bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between text-white">
                  <span className="font-extrabold text-sm truncate flex-1">
                    {isVoidAll
                      ? `Void Seluruh Meja (${savedKitchenItems.length} item)`
                      : selectedItem?.nameSnapshot || selectedItem?.name}
                  </span>
                  {!isVoidAll && selectedItem && (
                    <span className="text-orange-300 font-extrabold text-sm bg-white/10 px-3 py-1 rounded-full">
                      ×
                      {selectedItem.qty -
                        (selectedItem.voidedQty || 0) -
                        (selectedItem.refundedQty || 0)}{" "}
                      aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector (hanya untuk item individual dengan qty > 1) */}
              {!isVoidAll &&
                selectedItem &&
                selectedItem.qty -
                  (selectedItem.voidedQty || 0) -
                  (selectedItem.refundedQty || 0) >
                  1 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Jumlah Void
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleDecrementVoidQty}
                        className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-extrabold text-lg w-8 text-center text-slate-800">
                        {qtyToVoid}
                      </span>
                      <button
                        onClick={handleIncrementVoidQty}
                        className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}

              {/* Void Type Options */}
              <div className="space-y-2.5">
                <button
                  onClick={handleSalahInput}
                  className="w-full p-3.5 bg-white border-2 border-amber-200 rounded-xl hover:bg-amber-50 transition-all flex items-center gap-3 hover:shadow-md active:scale-[0.99] group"
                >
                  <div className="p-2.5 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                    <AlertTriangle size={16} className="text-amber-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-extrabold text-sm text-slate-800">
                      1. Salah Input / Cancel Kasir
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Tanpa PIN Supervisor
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-300 group-hover:text-amber-600 transition-colors"
                  />
                </button>

                <button
                  onClick={handleBarangKosong}
                  className="w-full p-3.5 bg-white border-2 border-red-200 rounded-xl hover:bg-red-50 transition-all flex items-center gap-3 hover:shadow-md active:scale-[0.99] group"
                >
                  <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Lock size={16} className="text-red-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-extrabold text-sm text-slate-800">
                      2. Barang Habis / Sold Out
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Otomatis nonaktifkan produk
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-300 group-hover:text-red-600 transition-colors"
                  />
                </button>

                <button
                  onClick={handleCancelRequest}
                  className="w-full p-3.5 bg-white border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition-all flex items-center gap-3 hover:shadow-md active:scale-[0.99] group"
                >
                  <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <ShieldCheck size={16} className="text-purple-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-extrabold text-sm text-slate-800">
                      3. Makanan Sudah Keluar
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Wajib PIN Admin & Catatan Audit
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-300 group-hover:text-purple-600 transition-colors"
                  />
                </button>
              </div>

              <button
                onClick={() => setVoidStep("LIST")}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl transition-colors"
              >
                ← Kembali ke Daftar
              </button>
            </div>
          )}

          {voidStep === "PIN_VERIFY" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={28} className="text-purple-600" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-800">
                  Otorisasi Admin
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Masukkan PIN Supervisor
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <input
                  type="password"
                  readOnly
                  inputMode="none"
                  value={"•".repeat(managerPin.length)}
                  placeholder="PIN ADMIN"
                  className="w-full bg-slate-50 rounded-lg p-3 font-extrabold text-center text-2xl tracking-[0.5em] focus:outline-none border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumpadPress(num)}
                    className="py-3.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-extrabold text-base transition-colors active:scale-95 shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadPress("CLEAR")}
                  className="py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 font-bold text-xs uppercase transition-colors active:scale-95"
                >
                  CLR
                </button>
                <button
                  onClick={() => handleNumpadPress("0")}
                  className="py-3.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-extrabold text-base transition-colors active:scale-95 shadow-sm"
                >
                  0
                </button>
                <button
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  className="py-3.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl hover:bg-amber-100 font-bold transition-colors active:scale-95"
                >
                  ⌫
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setVoidStep("CONFIRM_TYPE");
                    setManagerPin("");
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitPin}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase rounded-xl transition-colors shadow-md hover:shadow-purple-600/30"
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {voidStep === "CANCEL_NOTE" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Alasan Pembatalan (Audit)
                </label>
                <textarea
                  value={voidNote}
                  readOnly
                  inputMode="none"
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 resize-none text-slate-800 transition-all"
                  placeholder="Tulis alasan dengan keyboard di bawah..."
                />
              </div>

              {/* QWERTY Keyboard */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                {qwertyRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-1">
                    {row.map((key) => {
                      const isBackspace = key === "⌫";
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            handleQwertyPress(isBackspace ? "BACKSPACE" : key)
                          }
                          className={`px-2 py-2.5 min-w-[32px] flex-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 font-bold text-xs transition-all shadow-sm ${
                            isBackspace
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "text-slate-700"
                          }`}
                        >
                          {key}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="flex justify-center gap-1 mt-0.5">
                  <button
                    onClick={() => handleQwertyPress("CLEAR")}
                    className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 font-bold text-xs uppercase transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleQwertyPress("SPACE")}
                    className="flex-1 px-6 py-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-bold text-xs uppercase transition-colors shadow-sm"
                  >
                    Spasi
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setVoidStep("PIN_VERIFY")}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSubmitCancelWithNote}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase rounded-xl transition-colors shadow-md hover:shadow-purple-600/30"
                >
                  Submit Void
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
