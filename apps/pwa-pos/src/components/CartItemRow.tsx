import React, { useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  Pencil,
  ChefHat,
  UtensilsCrossed,
  Clock,
} from "lucide-react";
import { SmartInput } from "../components/shared/keyboard/SmartInput";

interface CartItemRowProps {
  item: any;
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateNote: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onKdsToggle?: (
    id: string,
    currentStatus: "PENDING" | "COOKING" | "SERVED",
  ) => void;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "PENDING",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
    next: "COOKING" as const,
    nextLabel: "Mulai Masak",
  },
  COOKING: {
    label: "MEMASAK",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: ChefHat,
    next: "SERVED" as const,
    nextLabel: "Sudah Saji",
  },
  SERVED: {
    label: "TERSAJI",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: UtensilsCrossed,
    next: null,
    nextLabel: null,
  },
};

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onUpdateQty,
  onUpdateNote,
  onRemove,
  onKdsToggle,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);

  const kitchenStatus = item.status as
    | "PENDING"
    | "COOKING"
    | "SERVED"
    | "READ_ONLY"
    | undefined;
  const isReadOnly =
    kitchenStatus === "READ_ONLY" ||
    item.isSaved === true ||
    kitchenStatus === "PENDING" ||
    kitchenStatus === "COOKING" ||
    kitchenStatus === "SERVED";

  const isKitchenItem =
    kitchenStatus === "PENDING" ||
    kitchenStatus === "COOKING" ||
    kitchenStatus === "SERVED";

  // Kalkulasi qty aktif setelah void & refund
  const activeQty = Math.max(
    0,
    item.qty - (item.voidedQty || 0) - (item.refundedQty || 0),
  );
  const isFullyVoided = isKitchenItem && activeQty === 0;

  const statusConf = isKitchenItem
    ? STATUS_CONFIG[kitchenStatus as "PENDING" | "COOKING" | "SERVED"]
    : null;

  const canDelete =
    !isReadOnly ||
    (kitchenStatus !== "COOKING" &&
      kitchenStatus !== "SERVED" &&
      !item.isSaved);

  return (
    <div
      className={`relative p-2.5 border rounded-xl flex flex-col gap-1 transition-all shadow-sm ${
        isFullyVoided
          ? "bg-slate-50 border-slate-100 opacity-50"
          : isReadOnly
            ? "bg-slate-100/80 border-slate-200/60"
            : "bg-white border-slate-200"
      }`}
    >
      {/* Badge icon dapur */}
      {isReadOnly && (
        <div className="absolute -top-2 -left-2 z-10 bg-white rounded-full p-1 shadow-md border border-slate-200">
          <ChefHat size={14} className="text-emerald-600" />
        </div>
      )}

      {isReadOnly ? (
        <div className="flex justify-between items-center w-full gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`font-black text-xs text-slate-900 uppercase tracking-tight truncate ${isFullyVoided ? "line-through text-slate-400" : ""}`}
            >
              {item.nameSnapshot || item.name}
            </span>
            <span
              className={`font-black text-[11px] shrink-0 ${isFullyVoided ? "text-red-400 line-through" : "text-slate-500"}`}
            >
              x{isKitchenItem ? activeQty : item.qty}
            </span>
            {item.voidedQty > 0 && !isFullyVoided && (
              <span className="text-[10px] font-black text-red-500 shrink-0">
                (-{item.voidedQty} void)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badge status KDS */}
            {statusConf && !isFullyVoided && (
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${statusConf.color}`}
              >
                {statusConf.label}
              </span>
            )}

            {/* Tombol KDS toggle — sejajar dengan icon trash */}
            {statusConf && statusConf.next && !isFullyVoided && onKdsToggle && (
              <button
                type="button"
                title={statusConf.nextLabel || "Update Status"}
                onClick={() =>
                  onKdsToggle(
                    item.skuSnapshot || item.sku,
                    kitchenStatus as "PENDING" | "COOKING" | "SERVED",
                  )
                }
                className={`p-1 rounded-md border text-[10px] font-black transition-all cursor-pointer ${
                  kitchenStatus === "COOKING"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white"
                }`}
              >
                {kitchenStatus === "COOKING" ? (
                  <UtensilsCrossed size={12} />
                ) : (
                  <ChefHat size={12} />
                )}
              </button>
            )}

            <span className="text-xs font-black text-slate-900 text-right">
              {!isFullyVoided &&
                `Rp ${((item.basePriceSnapshot || item.price) * activeQty).toLocaleString("id-ID")}`}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-black text-xs text-slate-900 uppercase tracking-tight truncate">
              {item.name}
            </span>
            <span className="text-xs font-black text-slate-400 shrink-0">
              |
            </span>
            <span className="text-xs font-black text-slate-900 shrink-0">
              Rp {(item.price * item.qty).toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, -1)}
                className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <Minus size={9} />
              </button>
              <span className="px-1.5 font-black text-[11px] min-w-4 text-center text-slate-900">
                {item.qty}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQty(item.id, 1)}
                className="p-1 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <Plus size={9} />
              </button>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                showNoteInput
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Pencil size={12} />
            </button>
          </div>
        </div>
      )}

      {isReadOnly && (item.notes || item.note) && !isFullyVoided && (
        <div className="mt-1 pt-1 border-t border-slate-100">
          <p className="text-[11px] font-medium text-slate-500 italic break-words leading-tight">
            NB: {item.notes || item.note}
          </p>
        </div>
      )}

      {!isReadOnly && (
        <>
          {!showNoteInput && item.note && (
            <div className="mt-1">
              <span className="text-[10px] text-slate-400 italic truncate block">
                {item.note.length > 40
                  ? item.note.slice(0, 40) + "…"
                  : item.note}
              </span>
            </div>
          )}

          {showNoteInput && (
            <div className="mt-2 pt-1">
              <SmartInput
                type="text"
                value={item.note || ""}
                onChange={(val) => onUpdateNote(item.id, val)}
                placeholder="Isi catatan untuk dapur..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
