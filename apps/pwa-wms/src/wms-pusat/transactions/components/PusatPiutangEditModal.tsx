import React, { useState, useEffect, useMemo, useRef } from "react";
import { useWms } from "../../../core/WmsProvider";
import { useToast } from "../../../shared/components/Toast";
import { X, Save, Plus } from "lucide-react";
import {
  ProductCombobox,
  ComboboxItem,
} from "../../../shared/components/ProductCombobox";

// Helper: konversi input string dengan koma menjadi angka (titik sebagai desimal)
const parseLocalNumber = (value: string): number => {
  if (!value) return 0;
  // Ganti koma dengan titik, lalu parseFloat
  const normalized = value.replace(/,/g, ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export const PusatPiutangEditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { updateReceivingTransaction, outletProducts } = useWms();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<ComboboxItem | null>(
    null,
  );
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);

  const comboboxRef = useRef<{ focus: () => void }>(null);

  useEffect(() => {
    if (isOpen && data?.items) {
      setItems(JSON.parse(JSON.stringify(data.items)));
      setSelectedProduct(null);
      setNewItemQty(1);
      setNewItemPrice(0);
    }
  }, [isOpen, data]);

  const comboboxProducts: ComboboxItem[] = useMemo(() => {
    return outletProducts.map((p) => ({
      id: p.id,
      nama: p.localName,
      unit: p.uom,
      harga_jual: p.sellingPrice,
    }));
  }, [outletProducts]);

  if (!isOpen || !data) return null;

  const handleItemChange = (
    index: number,
    field: "qty" | "price",
    value: number,
  ) => {
    const newItems = [...items];
    const safeValue = isNaN(value) || value < 0 ? 0 : value;

    newItems[index][field] = safeValue;
    newItems[index].subtotal =
      Number(newItems[index].qty) * Number(newItems[index].price);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSelectProduct = (product: ComboboxItem) => {
    setSelectedProduct(product);
    setNewItemPrice(product.harga_jual);
    document.getElementById("input-new-qty")?.focus();
  };

  const handleAddNewItem = () => {
    if (!selectedProduct)
      return showToast("Pilih produk terlebih dahulu!", "ERROR");
    if (newItemQty <= 0) return showToast("Qty harus lebih dari 0!", "ERROR");

    const hargaFinal =
      newItemPrice > 0 ? newItemPrice : selectedProduct.harga_jual;

    const newItem = {
      regionalItemId: selectedProduct.id,
      itemName: selectedProduct.nama,
      uom: selectedProduct.unit,
      qty: newItemQty,
      price: hargaFinal,
      subtotal: newItemQty * hargaFinal,
    };

    setItems([...items, newItem]);

    setSelectedProduct(null);
    setNewItemQty(1);
    setNewItemPrice(0);
    setTimeout(() => comboboxRef.current?.focus(), 100);
  };

  const totalTagihanBaru = items.reduce(
    (sum, i) => sum + (Number(i.subtotal) || 0),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      return showToast(
        "Transaksi tidak boleh kosong. Hapus transaksi jika ingin dibatalkan.",
        "ERROR",
      );
    }

    if (
      !confirm(
        "Simpan perubahan? Stok akan disesuaikan secara otomatis di gudang.",
      )
    )
      return;

    setLoading(true);
    try {
      const cleanItems = items.map((item) => ({
        regionalItemId: item.regionalItemId,
        itemName: item.itemName,
        uom: item.uom,
        qty: Number(item.qty),
        price: Number(item.price),
        subtotal: Number(item.qty) * Number(item.price),
      }));

      const accurateTotalAmount = cleanItems.reduce(
        (sum, i) => sum + i.subtotal,
        0,
      );

      const payload = {
        totalAmount: accurateTotalAmount,
        items: cleanItems,
      };

      await updateReceivingTransaction(data.id, payload);
      showToast("Koreksi berhasil disimpan dan disinkronkan!", "SUCCESS");
      onClose();
    } catch (error) {
      console.error("[EDIT_ERROR]", error);
      showToast("Gagal menyimpan koreksi transaksi", "ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl shrink-0">
          <div>
            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">
              Koreksi Transaksi
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {data.id} - {data.outlet}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="editPiutangForm" onSubmit={handleSubmit}>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3 text-center w-24">Qty</th>
                    <th className="px-4 py-3 text-center w-24">Satuan</th>
                    <th className="px-4 py-3 text-right w-36">Harga</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-sky-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-slate-700 text-xs">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "qty",
                              parseLocalNumber(e.target.value),
                            )
                          }
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-center font-bold text-xs focus:border-sky-500 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500 text-xs">
                        {item.uom}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "price",
                              parseLocalNumber(e.target.value),
                            )
                          }
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-right font-bold text-xs focus:border-sky-500 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800 text-xs">
                        Rp {Number(item.subtotal).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest"
                      >
                        Tidak ada item dalam transaksi ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Cari & Pilih Produk Baru
                </label>
                {selectedProduct ? (
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedProduct.nama}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Unit: {selectedProduct.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <ProductCombobox
                    ref={comboboxRef}
                    products={comboboxProducts}
                    onSelect={handleSelectProduct}
                  />
                )}
              </div>
              <div className="w-full md:w-24">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Qty
                </label>
                <input
                  id="input-new-qty"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newItemQty}
                  onChange={(e) =>
                    setNewItemQty(parseLocalNumber(e.target.value))
                  }
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs font-bold focus:border-sky-500 outline-none text-center bg-white disabled:bg-slate-100"
                  disabled={!selectedProduct}
                />
              </div>
              <div className="w-full md:w-32">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Harga Satuan
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemPrice}
                  onChange={(e) =>
                    setNewItemPrice(parseLocalNumber(e.target.value))
                  }
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs font-bold focus:border-sky-500 outline-none text-right bg-white disabled:bg-slate-100"
                  disabled={!selectedProduct}
                />
              </div>
              <button
                type="button"
                onClick={handleAddNewItem}
                disabled={!selectedProduct}
                className="w-full md:w-auto px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 h-[34px]"
              >
                <Plus size={14} /> Tambah
              </button>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-3xl shrink-0">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Total Tagihan Baru
            </span>
            <span className="text-2xl font-black text-sky-600 tracking-tighter">
              Rp {totalTagihanBaru.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
            >
              Batal
            </button>
            <button
              type="submit"
              form="editPiutangForm"
              disabled={loading}
              className="px-6 py-3 bg-sky-600 text-white rounded-xl font-black text-xs hover:bg-sky-700 shadow-lg shadow-sky-600/30 disabled:opacity-50 transition-all uppercase tracking-widest flex items-center gap-2"
            >
              <Save size={16} /> {loading ? "Menyimpan..." : "Simpan Koreksi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
