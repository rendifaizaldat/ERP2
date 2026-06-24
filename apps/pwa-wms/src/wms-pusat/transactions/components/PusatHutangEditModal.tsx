import React, { useState, useEffect, useMemo } from "react";
import { useWms } from "../../../core/hooks";
import { useToast } from "../../../shared/components/Toast";
import {
  X,
  Save,
  AlertTriangle,
  Package,
  Trash2,
  Archive,
  Plus,
} from "lucide-react";

interface PusatHutangEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  vendorName: string;
}

export default function PusatHutangEditModal({
  isOpen,
  onClose,
  transaction,
  vendorName,
}: PusatHutangEditModalProps) {
  const { updateReceivingTransaction, archiveReceiving } = useWms();
  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && transaction) {
      const clonedItems = transaction.items
        ? JSON.parse(JSON.stringify(transaction.items)).map((item: any) => ({
            ...item,
            discount: item.discount || 0,
          }))
        : [];
      setItems(clonedItems);
    }
  }, [isOpen, transaction]);

  const newTotalAmount = useMemo(() => {
    return items.reduce((acc, curr) => {
      const qty = parseFloat(curr.qty) || 0;
      const price = Number(curr.price) || 0;
      const discount = Number(curr.discount) || 0;
      return acc + qty * price - discount;
    }, 0);
  }, [items]);

  if (!isOpen || !transaction) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];

    if (field === "qty") {
      // Handle Desimal: Konversi koma ke titik
      const normalizedValue = value.replace(/,/g, ".");
      newItems[index].qty = normalizedValue;
    } else if (field === "price" || field === "discount") {
      newItems[index][field] = Number(value.replace(/[^0-9]/g, ""));
    } else {
      newItems[index][field] = value;
    }

    // Kalkulasi Subtotal Baru
    const numQty = parseFloat(newItems[index].qty) || 0;
    const numPrice = Number(newItems[index].price) || 0;
    const numDiscount = Number(newItems[index].discount) || 0;
    newItems[index].subtotal = numQty * numPrice - numDiscount;

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemName: "",
        regionalItemId: `MANUAL-${Date.now()}`,
        qty: "1",
        uom: "PCS",
        price: 0,
        discount: 0,
        subtotal: 0,
        isNew: true,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      showToast(
        "Dokumen tidak boleh kosong. Gunakan Batalkan Dokumen.",
        "WARNING",
      );
      return;
    }

    if (newTotalAmount < transaction.dibayar) {
      showToast(
        "Total baru tidak boleh lebih kecil dari jumlah yang sudah dibayarkan!",
        "ERROR",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Pastikan qty diparsing sebagai float sebelum disimpan ke DB
      const sanitizedItems = items.map((item) => ({
        ...item,
        qty: parseFloat(item.qty) || 0,
      }));

      const payload = {
        ...transaction,
        totalAmount: newTotalAmount,
        items: sanitizedItems,
      };

      await updateReceivingTransaction(transaction.id, payload);
      showToast("Rincian nota hutang berhasil diperbarui!", "SUCCESS");
      onClose();
    } catch (error) {
      showToast("Gagal memperbarui transaksi.", "ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (transaction.dibayar > 0) {
      showToast(
        "Tidak bisa membatalkan dokumen yang sudah memiliki riwayat pembayaran!",
        "ERROR",
      );
      return;
    }

    const confirmArchive = window.confirm(
      "PERINGATAN: Anda yakin ingin membatalkan dokumen ini? Tindakan ini tidak dapat diurungkan.",
    );

    if (!confirmArchive) return;

    setIsArchiving(true);
    try {
      await archiveReceiving(transaction.id);
      showToast("Dokumen berhasil dibatalkan.", "SUCCESS");
      onClose();
    } catch (error) {
      showToast("Gagal membatalkan dokumen.", "ERROR");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col animate-scale-up max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={22} className="text-blue-600" /> Koreksi Nota
              Hutang
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Ref: <span className="text-blue-600">{transaction.id}</span> •
              Vendor: <span className="text-gray-800">{vendorName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 text-yellow-800">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Perhatian Koreksi Nilai</p>
              <p>
                Anda dapat menambah item yang tertinggal, menginput QTY desimal
                (contoh: 3,5), dan memasukkan potongan/diskon per item.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-600">
                      Nama Produk
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-24">
                      Qty
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-24">
                      UoM
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-36 text-right">
                      Harga Beli
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-36 text-right">
                      Diskon
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-36 text-right">
                      Subtotal
                    </th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50">
                      <td className="p-3">
                        {item.isNew ? (
                          <input
                            type="text"
                            placeholder="Ketik Nama Produk..."
                            value={item.itemName}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "itemName",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                        ) : (
                          <>
                            <p className="font-medium text-gray-900 text-sm">
                              {item.itemName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {item.regionalItemId}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, "qty", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                      </td>
                      <td className="p-3">
                        {item.isNew ? (
                          <input
                            type="text"
                            value={item.uom}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "uom",
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase"
                          />
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase">
                            {item.uom}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={Number(item.price || 0).toLocaleString(
                              "id-ID",
                            )}
                            onChange={(e) =>
                              handleItemChange(index, "price", e.target.value)
                            }
                            className="w-full pr-2 pl-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={Number(item.discount || 0).toLocaleString(
                              "id-ID",
                            )}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "discount",
                                e.target.value,
                              )
                            }
                            className="w-full pr-2 pl-2 py-1.5 border border-red-300 rounded text-right text-sm text-red-600 focus:ring-2 focus:ring-red-500 outline-none font-medium"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900 text-sm">
                        {formatRupiah(item.subtotal)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Hapus Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={7} className="p-3">
                      <button
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 border-dashed w-full justify-center"
                      >
                        <Plus size={16} /> Tambah Item Baru
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="flex justify-between w-full max-w-sm text-sm text-gray-600">
              <span>Total Sebelumnya:</span>
              <span className="line-through">
                {formatRupiah(transaction.total)}
              </span>
            </div>
            <div className="flex justify-between w-full max-w-sm text-lg font-bold text-gray-900">
              <span>Total Hutang Baru:</span>
              <span className="text-blue-600">
                {formatRupiah(newTotalAmount)}
              </span>
            </div>
            {transaction.dibayar > 0 && (
              <div className="flex justify-between w-full max-w-sm text-sm text-green-600 font-medium">
                <span>Sudah Dibayar:</span>
                <span>-{formatRupiah(transaction.dibayar)}</span>
              </div>
            )}
            <div className="flex justify-between w-full max-w-sm text-sm text-red-600 font-bold border-t border-gray-200 pt-2 mt-1">
              <span>Sisa Hutang:</span>
              <span>
                {formatRupiah(
                  Math.max(0, newTotalAmount - transaction.dibayar),
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleArchive}
            disabled={isSubmitting || isArchiving || transaction.dibayar > 0}
            className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isArchiving ? (
              <span className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></span>
            ) : (
              <Archive size={18} />
            )}
            Batalkan Dokumen
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isArchiving}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || isArchiving}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <Save size={18} /> Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
