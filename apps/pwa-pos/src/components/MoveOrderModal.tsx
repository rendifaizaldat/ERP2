import React, { useState, useEffect } from "react";
import { X, Move, HelpCircle, Save, ArrowRight } from "lucide-react";
import { useToast } from "../components/Toast";

interface MoveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  tableLabel: string | null;
  dbTables: any[];
  operatorName: string;
  activeOrderId?: string | null;
  onConfirmMove: (
    targetTableLabel: string,
    itemsToMove: any[],
    orderId?: string | null,
    targetCustomerName?: string,
  ) => void;
}

export const MoveOrderModal: React.FC<MoveOrderModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableLabel,
  dbTables,
  activeOrderId,
  onConfirmMove,
}) => {
  const { showToast } = useToast();

  const [targetTable, setTargetTable] = useState("");
  const [targetCustomerName, setTargetCustomerName] = useState("");

  const [activeFieldFocus, setActiveFieldFocus] = useState<"TABLE" | "NAME">(
    "TABLE",
  );
  const [isQwertyShift, setIsQwertyShift] = useState(false);

  const handleNumpadPress = (val: string) => {
    if (activeFieldFocus !== "TABLE") return;

    if (val === "CLEAR") {
      setTargetTable("");
    } else if (val === "BACKSPACE") {
      setTargetTable((prev) => prev.slice(0, -1));
    } else {
      setTargetTable((prev) => {
        const next = prev + val;
        return next.replace(/^0+/, "");
      });
    }
  };

  const handleInternalQwertyPress = (char: string) => {
    if (activeFieldFocus !== "NAME") return;

    if (char === "BACKSPACE") {
      setTargetCustomerName((prev) => prev.slice(0, -1));
    } else if (char === "SPACE") {
      setTargetCustomerName((prev) => prev + " ");
    } else if (char === "CLEAR") {
      setTargetCustomerName("");
    } else if (char === "SHIFT") {
      setIsQwertyShift(!isQwertyShift);
    } else {
      const targetChar = isQwertyShift
        ? char.toUpperCase()
        : char.toLowerCase();
      setTargetCustomerName((prev) => prev + targetChar);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleHardwareKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (activeFieldFocus === "TABLE") {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          handleNumpadPress(key);
        } else if (key === "Backspace") {
          e.preventDefault();
          handleNumpadPress("BACKSPACE");
        } else if (key === "Escape" || key === "Delete") {
          e.preventDefault();
          handleNumpadPress("CLEAR");
        }
      } else if (activeFieldFocus === "NAME") {
        if (key === "Backspace") {
          e.preventDefault();
          handleInternalQwertyPress("BACKSPACE");
        } else if (key === " ") {
          e.preventDefault();
          handleInternalQwertyPress("SPACE");
        } else if (key.length === 1) {
          e.preventDefault();
          setTargetCustomerName((prev) => prev + key);
        }
      }
    };

    window.addEventListener("keydown", handleHardwareKeyDown);
    return () => window.removeEventListener("keydown", handleHardwareKeyDown);
  }, [
    isOpen,
    activeFieldFocus,
    targetTable,
    targetCustomerName,
    isQwertyShift,
  ]);

  if (!isOpen) return null;

  const handleExecuteMoveWholeTable = (e: React.FormEvent) => {
    e.preventDefault();

    const targetLabelClean = targetTable.trim();

    const originalName =
      sessionStorage.getItem(`asstro_tamu_meja_${tableLabel}`) || "Tamu";
    const targetNameClean = targetCustomerName.trim()
      ? targetCustomerName.trim().toUpperCase()
      : originalName.toUpperCase();

    if (!targetLabelClean) {
      showToast(
        "Harap isi nomor meja tujuan transfer terlebih dahulu!",
        "ERROR",
      );
      return;
    }
    if (cart.length === 0) {
      showToast(
        "Meja asal tidak memiliki item aktif untuk dipindahkan!",
        "ERROR",
      );
      return;
    }
    if (targetLabelClean === tableLabel) {
      showToast(
        "Nomor meja tujuan tidak boleh sama dengan nomor meja asal!",
        "ERROR",
      );
      return;
    }

    const isTargetOccupied = dbTables.some((t) => {
      const isSameLabel =
        t.label &&
        t.label.toString().toLowerCase() === targetLabelClean.toLowerCase();
      const hasActiveOrder =
        (t.savedItems && t.savedItems.length > 0) || t.currentBill > 0;
      return isSameLabel && hasActiveOrder;
    });

    if (isTargetOccupied) {
      showToast(
        `Meja ${targetLabelClean} saat ini sedang terisi aktif! Gunakan nomor meja lain.`,
        "ERROR",
      );
      return;
    }

    onConfirmMove(targetLabelClean, cart, activeOrderId, targetNameClean);
    showToast(
      `Seluruh pesanan Meja ${tableLabel} berhasil dipindahkan ke Meja ${targetLabelClean}!`,
      "SUCCESS",
    );

    setTargetTable("");
    setTargetCustomerName("");
    onClose();
  };

  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
    ["CLEAR", "SPACE"],
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Move size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                Pindah Lokasi Meja
              </h3>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                {tableLabel} → Meja Tujuan
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
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-5">
          {/* Info Card */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <HelpCircle size={16} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold">Seluruh pesanan aktif</span> dari Meja{" "}
              <span className="font-extrabold text-orange-700">
                {tableLabel}
              </span>{" "}
              (<span className="font-bold">{cart.length}</span> menu) akan
              ditransfer secara utuh menuju lokasi baru.
            </div>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setActiveFieldFocus("TABLE")}
              className="cursor-pointer"
            >
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Meja Tujuan
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                placeholder="Nomor meja..."
                value={targetTable}
                className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 font-extrabold text-sm text-center transition-all focus:outline-none ${
                  activeFieldFocus === "TABLE"
                    ? "border-orange-500 ring-2 ring-orange-500/20 text-slate-900"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              />
            </div>

            <div
              onClick={() => setActiveFieldFocus("NAME")}
              className="cursor-pointer"
            >
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Nama Pelanggan
              </label>
              <input
                type="text"
                inputMode="none"
                readOnly
                placeholder={`Default: ${sessionStorage.getItem(`asstro_tamu_meja_${tableLabel}`) || "Tamu"}`}
                value={targetCustomerName}
                className={`w-full bg-white border-2 rounded-xl px-3 py-2.5 font-extrabold text-sm text-center uppercase transition-all focus:outline-none ${
                  activeFieldFocus === "NAME"
                    ? "border-orange-500 ring-2 ring-orange-500/20 text-slate-900"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              />
            </div>
          </div>

          {/* Internal Keyboard */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            {activeFieldFocus === "TABLE" ? (
              <div className="space-y-2">
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Numpad
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumpadPress(num)}
                      className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-base rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center select-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpadPress("CLEAR")}
                    className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-200 shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center select-none"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress("0")}
                    className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-base rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress("BACKSPACE")}
                    className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-base rounded-lg border border-amber-200 shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center select-none"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    QWERTY Keyboard
                  </span>
                </div>
                {qwertyRows.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-0.5">
                    {row.map((key) => {
                      const isSpecial = [
                        "SHIFT",
                        "BACKSPACE",
                        "CLEAR",
                        "SPACE",
                      ].includes(key);

                      let btnClass =
                        "h-8 px-1.5 rounded-lg transition-all flex items-center justify-center select-none cursor-pointer text-xs font-bold border shadow-sm hover:shadow active:scale-95";

                      if (key === "SHIFT" && isQwertyShift) {
                        btnClass +=
                          " bg-orange-600 text-white border-orange-600";
                      } else if (key === "SHIFT") {
                        btnClass +=
                          " bg-slate-200 hover:bg-slate-300 text-slate-600 border-slate-300";
                      } else if (key === "BACKSPACE") {
                        btnClass +=
                          " bg-slate-200 hover:bg-slate-300 text-slate-600 border-slate-300 flex-1";
                      } else if (key === "CLEAR") {
                        btnClass +=
                          " bg-red-50 hover:bg-red-100 text-red-600 border-red-200 flex-1";
                      } else if (key === "SPACE") {
                        btnClass +=
                          " bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 flex-1";
                      } else {
                        btnClass +=
                          " bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 flex-1";
                      }

                      let displayLabel = key;
                      if (key === "BACKSPACE") displayLabel = "⌫";
                      else if (key === "SPACE") displayLabel = "Spasi";
                      else if (key === "SHIFT") displayLabel = "⇧";

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleInternalQwertyPress(key)}
                          className={btnClass}
                        >
                          {displayLabel}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteMoveWholeTable}
            disabled={!targetTable.trim()}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Konfirmasi Pindah
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
