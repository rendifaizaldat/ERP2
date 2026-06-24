// Path: apps/pwa-pos/src/components/SplitBillModal.tsx
import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingBag,
  ArrowRight,
  Save,
  Plus,
  Minus,
  Search,
  ArrowRightLeft,
  Users,
  Copy,
  Table,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { SmartInput } from "../components/shared/keyboard/SmartInput";
import { usePos } from "../core/PosProvider";

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  tableLabel: string | null;
  operatorName: string;
  activeOrderId?: string | null;
  dbTables: any[];
  onConfirmSplit: (
    virtualTables: Array<any>,
    remainingSourceItems?: any[],
    sourceOrderId?: string | null,
    splitMode?: "NEW_VIRTUAL" | "EXISTING_TABLE",
  ) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableLabel,
  activeOrderId,
  dbTables,
  onConfirmSplit,
}) => {
  const { showToast } = useToast();
  const { state } = usePos();

  const [step, setStep] = useState<1 | 2>(1);
  const [splitMode, setSplitMode] = useState<"NEW_VIRTUAL" | "EXISTING_TABLE">(
    "NEW_VIRTUAL",
  );

  const [numSplits, setNumSplits] = useState("2");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetTable, setSelectedTargetTable] = useState<any>(null);

  const [virtualBins, setVirtualBins] = useState<Array<any>>([]);
  const [sourceCart, setSourceCart] = useState<any[]>([]);

  const existingTables =
    dbTables?.filter(
      (t: any) =>
        t.label !== tableLabel &&
        (t.status === "TERISI" ||
          t.status === "OPENED" ||
          (t.savedItems && t.savedItems.length > 0)),
    ) || [];

  const filteredTables = existingTables.filter((t: any) => {
    const lbl = t.label.toLowerCase();
    const cName = (
      sessionStorage.getItem(`asstro_tamu_meja_${t.label}`) || ""
    ).toLowerCase();
    const q = searchQuery.toLowerCase();
    return lbl.includes(q) || cName.includes(q);
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSplitMode("NEW_VIRTUAL");
    setNumSplits("2");
    setSearchQuery("");
    setSelectedTargetTable(null);
    setVirtualBins([]);
    setSourceCart(JSON.parse(JSON.stringify(cart)));
  }, [isOpen, cart]);

  const handleGenerateBinsVirtual = () => {
    const parsedSplits = parseInt(numSplits) || 2;
    if (parsedSplits < 2) {
      showToast("Minimal pembagian split invoice adalah 2 pecahan!", "ERROR");
      return;
    }
    setSplitMode("NEW_VIRTUAL");
    const bins = Array.from({ length: parsedSplits - 1 }, (_, i) => ({
      name: `Tamu ${i + 1}`,
      items: [],
      isExisting: false,
    }));
    setVirtualBins(bins);
    setStep(2);
  };

  const handleProceedToExisting = (targetObj: any) => {
    if (!targetObj) return;
    setSplitMode("EXISTING_TABLE");
    setSelectedTargetTable(targetObj);
    const tamuName =
      sessionStorage.getItem(`asstro_tamu_meja_${targetObj.label}`) || "Tamu";

    setVirtualBins([
      {
        name: tamuName,
        label: targetObj.label,
        items: targetObj.savedItems
          ? JSON.parse(JSON.stringify(targetObj.savedItems))
          : [],
        existingOrderId: targetObj.activeOrderId || null,
        isExisting: true,
      },
    ]);
    setStep(2);
  };

  const handleTransferItem = (sourceIdx: number, binIdx: number) => {
    const targetItem = sourceCart[sourceIdx];
    if (!targetItem || targetItem.qty <= 0) return;

    const targetSku = targetItem.skuSnapshot || targetItem.sku;

    setVirtualBins((prev) =>
      prev.map((bin, idx) => {
        if (idx !== binIdx) return bin;
        const existIdx = bin.items.findIndex(
          (i: any) => (i.skuSnapshot || i.sku) === targetSku,
        );

        if (existIdx >= 0) {
          const nextItems = [...bin.items];
          nextItems[existIdx] = {
            ...nextItems[existIdx],
            qty: nextItems[existIdx].qty + 1,
            isMoved: true,
            movedQty: (nextItems[existIdx].movedQty || 0) + 1,
          };
          return { ...bin, items: nextItems };
        } else {
          return {
            ...bin,
            items: [
              ...bin.items,
              {
                ...targetItem,
                qty: 1,
                isMoved: true,
                isNewItem: true,
                movedQty: 1,
              },
            ],
          };
        }
      }),
    );

    setSourceCart((prev) =>
      prev.map((item, idx) =>
        idx === sourceIdx ? { ...item, qty: item.qty - 1 } : item,
      ),
    );
  };

  const handleReturnItem = (sourceIdx: number, binIdx: number) => {
    const targetItem = sourceCart[sourceIdx];
    const targetSku = targetItem.skuSnapshot || targetItem.sku;
    const bin = virtualBins[binIdx];

    const existIdx = bin.items.findIndex(
      (i: any) => (i.skuSnapshot || i.sku) === targetSku,
    );

    if (splitMode === "EXISTING_TABLE" && existIdx >= 0) {
      const binItem = bin.items[existIdx];
      if (!binItem.isMoved || (binItem.movedQty && binItem.movedQty <= 0)) {
        showToast(
          "Anda tidak bisa mengurangi pesanan asli milik meja tujuan!",
          "ERROR",
        );
        return;
      }
    }

    if (existIdx >= 0) {
      setVirtualBins((prev) =>
        prev.map((b, idx) => {
          if (idx !== binIdx) return b;
          const nextItems = [...b.items];
          const binItem = nextItems[existIdx];

          if (binItem.isNewItem && binItem.qty <= 1) {
            nextItems.splice(existIdx, 1);
          } else {
            nextItems[existIdx] = {
              ...binItem,
              qty: binItem.qty - 1,
              movedQty: (binItem.movedQty || 1) - 1,
            };
          }
          return { ...b, items: nextItems };
        }),
      );

      setSourceCart((prev) =>
        prev.map((item, idx) =>
          idx === sourceIdx ? { ...item, qty: item.qty + 1 } : item,
        ),
      );
    }
  };

  const calculateCartTotals = (items: any[]) => {
    const subtotal = items.reduce((acc, c) => acc + c.price * c.qty, 0);
    const taxConfig = (state as any)?.settings?.pajak || {
      ppn: 0,
      serviceCharge: 0,
      taxIncluded: false,
    };
    const taxRate = Number(taxConfig.ppn) / 100 || 0;
    const serviceRate = Number(taxConfig.serviceCharge) / 100 || 0;
    const service = subtotal * serviceRate;
    const dpp = subtotal + service;
    const tax = taxConfig.taxIncluded
      ? dpp - dpp / (1 + taxRate)
      : dpp * taxRate;
    const grandTotal = taxConfig.taxIncluded ? dpp : dpp + tax;
    return { subtotal, service, tax, grandTotal };
  };

  const handleSaveFinalSplit = () => {
    const finalSourceCart = sourceCart.filter((item) => item.qty > 0);

    if (splitMode === "EXISTING_TABLE") {
      const movedItemsCheck = virtualBins[0].items.filter(
        (i: any) => i.isMoved,
      );
      if (movedItemsCheck.length === 0) {
        showToast(
          "Anda belum memindahkan menu apapun ke meja target!",
          "ERROR",
        );
        return;
      }

      const payload = [
        {
          label: virtualBins[0].label,
          customerName: virtualBins[0].name,
          items: virtualBins[0].items,
          existingOrderId: virtualBins[0].existingOrderId,
        },
      ];

      onConfirmSplit(payload, finalSourceCart, activeOrderId, splitMode);
      showToast(
        `Sukses transfer item ke Meja ${virtualBins[0].label}!`,
        "SUCCESS",
      );
    } else {
      const formattedTables = virtualBins
        .filter((bin) => bin.items.length > 0)
        .map((bin) => ({
          label: `${tableLabel}-${(bin.name.trim() || "TAMU").toUpperCase()}`,
          customerName: bin.name,
          items: bin.items,
          currentBill: calculateCartTotals(bin.items).grandTotal,
          isVirtual: true,
          parentTableId: tableLabel || "",
        }));

      if (formattedTables.length > 0) {
        onConfirmSplit(
          formattedTables,
          finalSourceCart,
          activeOrderId,
          splitMode,
        );
        showToast("Nota virtual resmi sukses didaftarkan!", "SUCCESS");
      } else {
        showToast(
          "Harap pindahkan minimal satu menu ke target pecah!",
          "ERROR",
        );
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col h-[90vh] max-h-[800px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              {splitMode === "NEW_VIRTUAL" ? (
                <Copy size={18} />
              ) : (
                <ArrowRightLeft size={18} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                {step === 1
                  ? "Pemisahan Pesanan"
                  : splitMode === "EXISTING_TABLE"
                    ? `Transfer ke Meja ${virtualBins[0]?.label || ""}`
                    : `Split Bill — Meja ${tableLabel}`}
              </h3>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                {step === 1
                  ? "Pilih metode pemisahan"
                  : splitMode === "EXISTING_TABLE"
                    ? "Pindahkan item ke meja yang sudah ada"
                    : "Buat nota virtual terpisah"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-start">
              {/* Opsi 1: Split Virtual */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-orange-600">
                    Opsi 1
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 mb-1">
                  Split Menjadi Beberapa Nota
                </h4>
                <p className="text-xs text-slate-500 mb-5">
                  Bagi pesanan menjadi beberapa nota virtual terpisah.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                      Jumlah pecahan
                    </label>
                    <SmartInput
                      type="number"
                      value={numSplits}
                      onChange={(val) =>
                        setNumSplits(val.replace(/\D/g, "") || "2")
                      }
                      placeholder="2"
                      className="w-full text-center text-2xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl py-3 text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBinsVirtual}
                    disabled={!numSplits || parseInt(numSplits) < 2}
                    className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md hover:shadow-orange-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Buat Split</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Opsi 2: Transfer ke Meja Existing */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Table size={16} />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-600">
                    Opsi 2
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 mb-1">
                  Pindahkan ke Meja Aktif
                </h4>
                <p className="text-xs text-slate-500 mb-5">
                  Pindahkan sebagian item ke meja yang sudah terisi.
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={15} />
                    </div>
                    <SmartInput
                      type="text"
                      value={searchQuery}
                      onChange={(val) => setSearchQuery(val)}
                      placeholder="Cari meja atau nama tamu..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                  </div>
                  {searchQuery && (
                    <div className="bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-inner divide-y divide-slate-100">
                      {filteredTables.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs italic py-4">
                          Meja / Tamu tidak ditemukan.
                        </p>
                      ) : (
                        filteredTables.map((t: any) => {
                          const cName =
                            sessionStorage.getItem(
                              `asstro_tamu_meja_${t.label}`,
                            ) || "Tamu";
                          return (
                            <button
                              key={t.label}
                              onClick={() => handleProceedToExisting(t)}
                              className="w-full px-4 py-3 hover:bg-emerald-50 flex items-center justify-between transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-sm text-slate-700 group-hover:text-emerald-700">
                                  Meja {t.label}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {cName}
                                </span>
                              </div>
                              <ArrowRight
                                size={14}
                                className="text-slate-300 group-hover:text-emerald-600 transition-colors"
                              />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Manajemen Transfer */
            <div className="grid grid-cols-5 gap-4 h-full">
              {/* Kolom Sumber (kiri) */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    📦 Sumber: Meja {tableLabel}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {sourceCart.filter((i) => i.qty > 0).length} item
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300">
                  {sourceCart.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`bg-slate-50 border rounded-xl p-3 transition-all ${
                        item.qty === 0
                          ? "opacity-40 border-slate-200"
                          : "border-slate-200 hover:border-orange-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-extrabold text-xs text-slate-800 truncate block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Rp {item.price.toLocaleString()}
                          </span>
                        </div>
                        <span className="font-black text-sm text-slate-700 ml-2 shrink-0">
                          ×{item.qty}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {virtualBins.map((bin, bIdx) => {
                          const binItem = bin.items.find(
                            (i: any) =>
                              (i.skuSnapshot || i.sku) ===
                              (item.skuSnapshot || item.sku),
                          );
                          const qtyInBin =
                            binItem && binItem.isMoved
                              ? binItem.movedQty || 0
                              : 0;
                          return (
                            <div
                              key={bIdx}
                              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                            >
                              <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[60px]">
                                {bin.isExisting
                                  ? `M${bin.label}`
                                  : `T${bIdx + 1}`}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleReturnItem(idx, bIdx)}
                                  disabled={qtyInBin === 0}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-red-100 text-slate-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="font-black text-xs w-4 text-center text-slate-700">
                                  {qtyInBin}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTransferItem(idx, bIdx)}
                                  disabled={item.qty === 0}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {sourceCart.every((i) => i.qty === 0) && (
                    <div className="text-center text-slate-400 text-xs italic py-8">
                      Semua item telah dipindahkan
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Target (kanan) */}
              <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    🎯 Target Kompartemen
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {virtualBins.length} kompartemen
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300">
                  {virtualBins.map((bin, bIdx) => (
                    <div
                      key={bIdx}
                      className={`border-2 rounded-xl p-3 transition-all ${
                        bin.isExisting
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">
                          {bin.isExisting
                            ? `Meja ${bin.label}`
                            : `#${bIdx + 1}`}
                        </span>
                        <SmartInput
                          type="text"
                          value={bin.name}
                          disabled={bin.isExisting}
                          onChange={(val) =>
                            setVirtualBins((prev) =>
                              prev.map((b, i) =>
                                i === bIdx ? { ...b, name: val } : b,
                              ),
                            )
                          }
                          placeholder="Nama tamu"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-[11px] uppercase focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:bg-transparent disabled:border-transparent disabled:text-emerald-700 disabled:font-extrabold"
                        />
                        {bin.isExisting && (
                          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-200 px-2 py-0.5 rounded-full uppercase">
                            Existing
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {bin.items.length === 0 ? (
                          <p className="text-[10px] text-slate-300 italic text-center py-2">
                            Belum ada menu
                          </p>
                        ) : (
                          bin.items.map((i: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-xs ${
                                i.isMoved && !i.isNewItem
                                  ? "border-blue-200 bg-blue-50/50"
                                  : i.isNewItem
                                    ? "border-orange-200 bg-orange-50/50"
                                    : "border-slate-200"
                              }`}
                            >
                              <span className="font-bold text-slate-700 truncate flex-1">
                                {i.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {i.isNewItem && (
                                  <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                    Baru
                                  </span>
                                )}
                                {i.isMoved && !i.isNewItem && (
                                  <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                    +{i.movedQty}
                                  </span>
                                )}
                                <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                  ×{i.qty}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center">
          {step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Batal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <X size={14} /> Batal & Reset
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={handleSaveFinalSplit}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <Save size={14} /> Konfirmasi Pemindahan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
