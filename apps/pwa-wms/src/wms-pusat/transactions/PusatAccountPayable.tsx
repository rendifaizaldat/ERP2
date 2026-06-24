import React, { useState, useMemo, useEffect } from "react";
import { useWms } from "../../core/hooks";
import { useToast } from "../../shared/components/Toast";
import * as XLSX from "xlsx";
import {
  Search,
  Receipt,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Edit,
  Store,
  CreditCard,
} from "lucide-react";

import PusatHutangPaymentModal from "./components/PusatHutangPaymentModal";
import PusatHutangEditModal from "./components/PusatHutangEditModal";

export default function PusatAccountPayable() {
  const { hutangPusat, fetchHutangPusat, vendors } = useWms();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "UNPAID" | "PARTIAL" | "PAID"
  >("ALL");
  const [selectedGroup, setSelectedGroup] = useState<any>(null); // For Multi-payment
  const [selectedTxEdit, setSelectedTxEdit] = useState<any>(null); // For Edit Modal

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchHutangPusat();
  }, [fetchHutangPusat]);

  const getVendorName = (vendorId: string) => {
    const v = vendors.find((v) => v.id === vendorId);
    return v ? v.name : vendorId;
  };

  const filteredData = useMemo(() => {
    return hutangPusat.filter((item) => {
      if (item.docStatus === "CANCELLED") return false;
      const vendorName = getVendorName(item.vendor);
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        filterStatus === "ALL" || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [hutangPusat, searchQuery, filterStatus, vendors]);

  // GROUP BY VENDOR
  const groupedData = useMemo(() => {
    return filteredData.reduce((acc: any, item: any) => {
      const vendorName = getVendorName(item.vendor);
      if (!acc[vendorName]) {
        acc[vendorName] = {
          items: [],
          total: 0,
          totalDibayar: 0,
          totalSisa: 0,
        };
      }
      acc[vendorName].items.push(item);
      acc[vendorName].total += item.total;
      acc[vendorName].totalDibayar += item.dibayar;
      acc[vendorName].totalSisa += item.sisa;
      return acc;
    }, {});
  }, [filteredData]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { label: string; color: string }> = {
      PAID: {
        label: "LUNAS",
        color: "bg-green-100 text-green-700 border-green-200",
      },
      PARTIAL: {
        label: "SEBAGIAN",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      },
      UNPAID: {
        label: "BELUM BAYAR",
        color: "bg-red-100 text-red-700 border-red-200",
      },
    };
    const c = maps[status] || {
      label: status,
      color: "bg-gray-100 text-gray-700",
    };
    return (
      <span
        className={`px-2 py-1 text-[0.625rem] font-bold rounded border uppercase tracking-widest ${c.color}`}
      >
        {c.label}
      </span>
    );
  };

  const handleQuickExportExcel = () => {
    const exportData = filteredData.map((item) => ({
      "No Nota": item.id,
      Tanggal: item.tanggal,
      Vendor: getVendorName(item.vendor),
      "Total Hutang": item.total,
      Dibayar: item.dibayar,
      Sisa: item.sisa,
      Status: item.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hutang Pusat");
    XLSX.writeFile(
      workbook,
      `Rekap_Hutang_Vendor_${new Date().getTime()}.xlsx`,
    );
    showToast("Data diekspor ke Excel", "SUCCESS");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
              Account Payable
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Hutang ke Vendor Supplier
            </p>
          </div>
        </div>
        <button
          onClick={handleQuickExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-widest"
        >
          <Download size={14} /> Export Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari Nota / Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm uppercase placeholder:normal-case"
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(["ALL", "UNPAID", "PARTIAL", "PAID"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${filterStatus === status ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              {status === "ALL" ? "Semua" : status}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(groupedData).length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-xs uppercase tracking-widest">
            Tidak ada data hutang.
          </p>
        </div>
      ) : (
        Object.entries(groupedData).map(
          ([vendorName, group]: [string, any]) => (
            <div
              key={vendorName}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6"
            >
              <div className="bg-slate-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight text-lg">
                  <Store size={18} className="text-blue-600" /> {vendorName}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-2 text-[0.625rem] uppercase tracking-widest font-black">
                    <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-200">
                      Sisa: {formatRupiah(group.totalSisa)}
                    </div>
                    <div className="px-3 py-1.5 bg-slate-800 text-white rounded-xl shadow-md">
                      Total: {formatRupiah(group.total)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedGroup({ vendorName, items: group.items });
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-black text-xs uppercase tracking-widest shadow-md transition-all"
                  >
                    <CreditCard size={14} /> Bayar Tagihan
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-[0.625rem] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3">No Nota</th>
                      <th className="px-3 py-3">Tanggal / JT</th>
                      <th className="px-3 py-3 text-right">Total Tagihan</th>
                      <th className="px-3 py-3 text-right">Sisa Hutang</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-5 py-3 font-black text-gray-700 text-xs">
                          {item.id}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-gray-500 text-xs">
                            {item.tanggal}
                          </p>
                          <p className="text-[10px] text-red-400 font-bold uppercase">
                            JT: {item.jatuhTempo || "-"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-black text-gray-800 text-xs">
                            {formatRupiah(item.total)}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Dibayar: {formatRupiah(item.dibayar)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-black text-red-600 text-xs">
                          {formatRupiah(item.sisa)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedTxEdit(item);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Koreksi Transaksi"
                          >
                            <Edit size={16} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ),
        )
      )}

      {isPaymentModalOpen && selectedGroup && (
        <PusatHutangPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          transactions={selectedGroup.items}
          vendorName={selectedGroup.vendorName}
        />
      )}
      {isEditModalOpen && selectedTxEdit && (
        <PusatHutangEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          transaction={selectedTxEdit}
          vendorName={getVendorName(selectedTxEdit.vendor)}
        />
      )}
    </div>
  );
}
