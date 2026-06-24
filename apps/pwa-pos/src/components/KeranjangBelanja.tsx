import React, { useMemo, useState } from "react";
import {
  ShoppingCart,
  Tag,
  Printer,
  Sliders,
  Move,
  Lock,
  XCircle,
} from "lucide-react";

import { VoidOrderModal } from "./VoidOrderModal";
import { CartItemRow } from "./CartItemRow";
import { usePos } from "../core/PosProvider"; // <-- Import Hook Global State

interface KeranjangBelanjaProps {
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  selectedTable: string | null;
  activeTableStatus: string;
  discountInput: string;
  handleApplyDiscountInput: (val: string) => void;
  handleUpdateRowQty: (rowId: string, delta: number) => void;
  handleUpdateRowNote: (rowId: string, text: string) => void;
  cartSubtotal: number;
  discountAmount: number;
  serviceCharge: number;
  restaurantTax: number;
  cartGrandTotal: number;
  isWaiter: boolean;
  handleMainActionButtonClick: () => void;
  handlePrintKitchenOnly: () => void;
  handleSplitBillAction: () => void;
  handleMoveOrderAction: () => void;
  onExecuteVoidLedger?: (
    sku: string,
    qty: number,
    type: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    pin?: string,
    voidNote?: string,
  ) => Promise<void>;
  onKdsToggle?: (
    itemId: string,
    currentStatus: "PENDING" | "COOKING" | "SERVED",
  ) => Promise<void>;
}

export const KeranjangBelanja: React.FC<KeranjangBelanjaProps> = ({
  cart,
  setCart,
  selectedTable,
  discountInput,
  handleApplyDiscountInput,
  handleUpdateRowQty,
  handleUpdateRowNote,
  cartSubtotal,
  discountAmount,
  serviceCharge,
  restaurantTax,
  cartGrandTotal,
  isWaiter,
  handleMainActionButtonClick,
  handlePrintKitchenOnly,
  handleSplitBillAction,
  handleMoveOrderAction,
  onExecuteVoidLedger,
  onKdsToggle,
}) => {
  const { state } = usePos(); // <-- Mengambil State Global RxDB
  const [showVoidModal, setShowVoidModal] = useState(false);

  // =========================================================================
  // MEMBACA KONFIGURASI PAJAK & HARGA DARI SETTINGS
  // =========================================================================
  const taxSettings = state?.settings?.pajak || {
    ppn: 11,
    serviceCharge: 5,
    taxIncluded: true,
  };
  const taxRateSetting = Number(taxSettings.ppn) || 0;
  const serviceRateSetting = Number(taxSettings.serviceCharge) || 0;
  const isTaxIncluded = Boolean(taxSettings.taxIncluded);

  const KITCHEN_STATUSES = ["PENDING", "COOKING", "SERVED", "READ_ONLY"];

  // KONDISI LAYER 1: Item yang sudah di-Order ke dapur (termasuk arsitektur 3-lapis baru)
  const hasSavedItems = cart.some(
    (item) => item.isSaved === true || KITCHEN_STATUSES.includes(item.status),
  );

  // KONDISI KERANJANG AKTIF: Item baru yang belum di-Order
  const hasNewItems = cart.some(
    (item) => !item.isSaved && !KITCHEN_STATUSES.includes(item.status),
  );

  const currentCustomerName = useMemo(() => {
    if (!selectedTable) return "";
    return sessionStorage.getItem(`asstro_tamu_meja_${selectedTable}`) || "";
  }, [selectedTable, cart]);

  const injectStaticOrderTime = () => {
    if (!selectedTable) return;
    const existingTime = sessionStorage.getItem(
      `asstro_jam_order_${selectedTable}`,
    );
    if (!existingTime) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const formattedTime = `${hours}:${minutes} WIB`;
      sessionStorage.setItem(
        `asstro_jam_order_${selectedTable}`,
        formattedTime,
      );
    }
  };

  const handleOrderActionWrapper = () => {
    injectStaticOrderTime();
    handlePrintKitchenOnly();
  };

  return (
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 select-none shadow-sm text-sm">
      {/* HEADER KERANJANG */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-slate-900 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <ShoppingCart size={16} className="text-slate-900 shrink-0" />
          <h3 className="font-black text-xs uppercase tracking-wider truncate">
            {selectedTable
              ? `MEJA ${selectedTable} - ${currentCustomerName || "TAMU"}`
              : "TAKE AWAY"}
          </h3>
        </div>
        <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-md shrink-0 uppercase tracking-wider">
          {cart.length} Item
        </span>
      </div>

      {/* DAFTAR ITEM PESANAN */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#F8FAFC]">
        {cart.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs uppercase tracking-widest text-center">
            Belum Ada Menu Baru
          </div>
        ) : (
          cart.map((item, index) => (
            <CartItemRow
              // [FIX] Cegah React Crash jika ada data korup bernama UNKNOWN dari masa lalu
              key={
                item.id && item.id !== "UNKNOWN"
                  ? item.id
                  : `${item.sku}-${index}`
              }
              item={item}
              onUpdateQty={handleUpdateRowQty}
              onUpdateNote={handleUpdateRowNote}
              onRemove={(id) =>
                setCart((prev) => prev.filter((i) => i.id !== id))
              }
              onKdsToggle={
                onKdsToggle
                  ? (id, currentStatus) => onKdsToggle(id, currentStatus)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {/* RINGKASAN BIAYA (LAYER 2: INVOICE PREVIEW) */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0 text-xs font-bold uppercase tracking-tight text-slate-600">
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div>Subtotal Menu:</div>
            <div className="text-slate-900 font-black">
              Rp {cartSubtotal.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Tag size={12} className="text-slate-900" /> Diskon Manajer:
            </div>
            {isWaiter ? (
              <div className="flex items-center gap-1 text-slate-400 font-black text-xs bg-slate-100 border px-2 py-1 rounded-lg">
                <Lock size={10} /> 0%
              </div>
            ) : (
              <input
                type="text"
                value={discountInput}
                onChange={(e) => handleApplyDiscountInput(e.target.value)}
                placeholder="0%"
                className="w-14 text-right bg-white border border-slate-200 rounded-lg px-2 py-1 font-black text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            )}
          </div>

          <div className="flex justify-between">
            <div>Service Charge ({serviceRateSetting}%):</div>
            <div className="text-slate-900 font-black">
              Rp {serviceCharge.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="flex justify-between">
            {/* Label Dinamis: PPN & Indikator (Include/Exclude) */}
            <div>
              PB1 / PPN ({taxRateSetting}%){isTaxIncluded ? " (Termasuk)" : ""}:
            </div>
            <div className="text-slate-900 font-black">
              Rp {restaurantTax.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-sm">
            <div className="text-slate-900 font-black">Grand Total:</div>
            <div className="text-orange-600 font-black text-base">
              Rp {cartGrandTotal.toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* TOMBOL AKSI */}
        <div className="space-y-2 pt-1 border-t border-slate-200">
          {/* TOMBOL EKSEKUSI LAYER 1 (Order ke Dapur) */}
          {hasNewItems && (
            <button
              type="button"
              onClick={handleOrderActionWrapper}
              disabled={cart.length === 0}
              className="w-full bg-orange-600 hover:bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer animate-fade-in"
            >
              ORDER / PESAN
            </button>
          )}

          {/* BARIS 1: EKSEKUSI LAYER 2 & 3 (Bayar = Buat Invoice & Catat Payment) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handleMainActionButtonClick}
              className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              Bayar
            </button>
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handlePrintKitchenOnly}
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
          </div>

          {/* BARIS 2: Split, Move, Void */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={handleSplitBillAction}
              className="px-3 py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300 text-slate-800 border border-slate-300 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders size={13} /> Split
            </button>
            <button
              type="button"
              disabled={!hasSavedItems}
              onClick={handleMoveOrderAction}
              className="px-3 py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-300 text-slate-800 border border-slate-300 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Move size={13} /> Pindah
            </button>
            <button
              type="button"
              disabled={!hasSavedItems || isWaiter}
              onClick={() => setShowVoidModal(true)}
              className="px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <XCircle size={13} /> Void
            </button>
          </div>
        </div>
      </div>

      <VoidOrderModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        activeTableData={{
          label: selectedTable,
          savedItems: cart.filter(
            (i) =>
              i.isSaved === true ||
              ["READ_ONLY", "PENDING", "COOKING", "SERVED"].includes(i.status),
          ),
        }}
        onConfirmVoid={async (
          sku,
          qtyToVoid,
          voidType,
          managerPin,
          voidNote,
        ) => {
          if (onExecuteVoidLedger) {
            await onExecuteVoidLedger(
              sku,
              qtyToVoid,
              voidType,
              managerPin,
              voidNote,
            );
          }
        }}
      />
    </div>
  );
};
