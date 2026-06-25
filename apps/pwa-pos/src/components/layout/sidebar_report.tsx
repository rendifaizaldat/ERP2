import React, { useState } from "react";
import {
  X,
  FileBarChart,
  Printer,
  PieChart,
  Tag,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePos } from "../../core/PosProvider";
import { EodClosingModal } from "../modals/EodClosingModal";

export const SidebarReport = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state, executeEndOfDay } = usePos();
  const [activeTab, setActiveTab] = useState<"MOD" | "PLU" | "VOID">("MOD");
  const [showEodModal, setShowEodModal] = useState(false);

  // Mengambil hasil kalkulasi langsung dari Projection
  const reportData = state?.report || {
    totalTrx: 0,
    initialCash: 0,
    cashSales: 0,
    systemCash: 0,
    totalGross: 0,
    totalNet: 0,
    totalTax: 0,
    totalService: 0,
    catSales: {},
    paymentSales: {},
    pettyCashOut: 0,
    totalVoid: 0,
    totalRefund: 0,
    staffList: [],
    pluData: [],
  };

  const activeTablesCount = state?.recon?.activeTables || 0;

  const systemCash = reportData.systemCash;
  const modData = reportData;
  const pluData = reportData.pluData;
  const audits = state?.auditLogs || [];

  const handlePrintPDF = () => {
    if (activeTab === "MOD") return;

    const doc = new jsPDF();
    doc.setFontSize(16);

    if (activeTab === "PLU") {
      doc.text("Laporan PLU Item Terjual", 14, 20);
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 26);

      const tableColumn = [
        "No",
        "Nama Produk (Menu)",
        "Qty Terjual",
        "Total Rupiah",
      ];
      const tableRows = pluData.map(([name, data], idx) => [
        idx + 1,
        name.toUpperCase(),
        data.qty,
        `Rp ${data.total.toLocaleString("id-ID")}`,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`Laporan_PLU_${Date.now()}.pdf`);
    } else if (activeTab === "VOID") {
      doc.text("Laporan Audit Void & Refund", 14, 20);
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 26);

      const tableColumn = [
        "Tgl & Jam",
        "Meja/Cust",
        "Item (Menu)",
        "Nilai (Rp)",
        "Kasir / Manager",
        "Catatan",
        "Jenis",
      ];
      const tableRows = audits.map((a: any) => {
        const dt = new Date(a.timestamp);
        return [
          `${dt.toLocaleDateString("id-ID")} ${dt.toLocaleTimeString("id-ID")}`,
          `${a.tableOrInvoice}\n${a.customerName || "-"}`,
          a.itemsInfo,
          `Rp ${a.totalAmount.toLocaleString("id-ID")}`,
          `K: ${a.cashierName}\nM: ${a.managerName}`,
          a.note || "-",
          a.type,
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      });

      doc.save(`Laporan_Audit_${Date.now()}.pdf`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-200 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fade-in">
        <div className="w-full md:max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <FileBarChart size={18} className="text-slate-800" />
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">
                Report & Rekapitulasi Kasir
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {activeTab !== "MOD" && (
                <button
                  onClick={handlePrintPDF}
                  className="px-4 py-2 bg-slate-900 text-white font-black uppercase text-[10px] rounded-lg flex items-center gap-2 hover:bg-slate-800 cursor-pointer shadow-md transition-all"
                >
                  <Printer size={12} /> Unduh PDF Laporan
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-200 shrink-0 bg-white">
            <button
              onClick={() => setActiveTab("MOD")}
              className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                activeTab === "MOD"
                  ? "border-orange-600 text-slate-900 bg-orange-50/30"
                  : "border-transparent text-slate-400 hover:text-slate-800"
              }`}
            >
              <PieChart size={14} /> MOD (Closing)
            </button>
            <button
              onClick={() => setActiveTab("PLU")}
              className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                activeTab === "PLU"
                  ? "border-orange-600 text-slate-900 bg-orange-50/30"
                  : "border-transparent text-slate-400 hover:text-slate-800"
              }`}
            >
              <Tag size={14} /> PLU (Item Sales)
            </button>
            <button
              onClick={() => setActiveTab("VOID")}
              className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                activeTab === "VOID"
                  ? "border-orange-600 text-slate-900 bg-orange-50/30"
                  : "border-transparent text-slate-400 hover:text-slate-800"
              }`}
            >
              <ShieldAlert size={14} /> VOID / REFUND
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 bg-slate-100 scrollbar-thin">
            {/* TAB MOD */}
            {activeTab === "MOD" && (
              <div className="space-y-4 max-w-2xl mx-auto animate-fade-in text-slate-800">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowEodModal(true)}
                    className="px-5 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                  >
                    <CheckCircle size={16} />
                    Selesaikan Transaksi Hari Ini (Closing)
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                    Summary Transaksi (Tidak Boleh Dicetak)
                  </h3>
                  <div className="space-y-2 text-sm font-bold">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Modal Awal Laci (Kasir)
                      </span>
                      <span className="text-blue-600">
                        Rp {modData.initialCash.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-1">
                      <span className="text-slate-500">
                        Total Transaksi Lunas
                      </span>
                      <span>{modData.totalTrx} Trx</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Sales</span>
                      <span>Rp {modData.totalGross.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax PPN</span>
                      <span className="text-red-500">
                        - Rp {modData.totalTax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service Charge</span>
                      <span className="text-red-500">
                        - Rp {modData.totalService.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-black text-green-600">
                      <span className="uppercase">Net Sales Bersih</span>
                      <span>Rp {modData.totalNet.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-black text-xs uppercase border-b pb-2 mb-3 text-slate-900">
                    Deduction (Pengurangan Kas & Audit)
                  </h3>
                  <div className="space-y-2 text-sm font-bold">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Total VOID (Batal Sebelum Cetak)
                      </span>
                      <span className="text-red-500">
                        Rp {modData.totalVoid.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Total REFUND (Uang Kembali)
                      </span>
                      <span className="text-red-500">
                        Rp {modData.totalRefund.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-slate-500">
                        Pengeluaran Kasir / Petty Cash
                      </span>
                      <span className="text-orange-500">
                        Rp {modData.pettyCashOut.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB PLU */}
            {activeTab === "PLU" && (
              <div className="animate-fade-in text-slate-800">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="p-3 w-12 text-center">No</th>
                        <th className="p-3">Nama Produk (Menu)</th>
                        <th className="p-3 text-center">Qty Terjual</th>
                        <th className="p-3 text-right">Total Rupiah</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-bold text-slate-700">
                      {pluData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-slate-400"
                          >
                            Data penjualan masih kosong.
                          </td>
                        </tr>
                      ) : (
                        pluData.map(([name, data], idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="p-3 text-center text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="p-3 uppercase">{name}</td>
                            <td className="p-3 text-center font-black text-slate-900">
                              {data.qty}
                            </td>
                            <td className="p-3 text-right text-green-600">
                              Rp {data.total.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB VOID/REFUND */}
            {activeTab === "VOID" && (
              <div className="animate-fade-in text-slate-800">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="p-3">Tgl & Jam</th>
                        <th className="p-3">Meja / Cust</th>
                        <th className="p-3">Item Di-Audit</th>
                        <th className="p-3">Nilai (Rp)</th>
                        <th className="p-3">Kasir & Manager</th>
                        <th className="p-3">Catatan</th>
                        <th className="p-3 text-center">Jenis</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-slate-700">
                      {audits.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-slate-400"
                          >
                            Tidak ada riwayat pembatalan/pengembalian hari ini.
                          </td>
                        </tr>
                      ) : (
                        audits.map((a: any, idx: number) => {
                          const dt = new Date(a.timestamp);
                          return (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="p-3">
                                {dt.toLocaleDateString("id-ID")}
                                <br />
                                <span className="text-[9px] text-slate-400">
                                  {dt.toLocaleTimeString("id-ID")}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="block font-black uppercase text-slate-900">
                                  {a.tableOrInvoice}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  {a.customerName}
                                </span>
                              </td>
                              <td className="p-3 text-red-600 uppercase max-w-[150px] break-words">
                                {a.itemsInfo}
                              </td>
                              <td className="p-3 font-black">
                                Rp {a.totalAmount.toLocaleString()}
                              </td>
                              <td className="p-3 uppercase">
                                <span className="block text-slate-800">
                                  K: {a.cashierName}
                                </span>
                                <span className="block text-orange-600 text-[9px]">
                                  M: {a.managerName}
                                </span>
                              </td>
                              <td className="p-3 italic text-slate-500">
                                {a.note}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                    a.type === "VOID"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {a.type}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EodClosingModal
        isOpen={showEodModal}
        onClose={() => setShowEodModal(false)}
        systemCash={systemCash}
        activeTablesCount={activeTablesCount}
        onConfirm={executeEndOfDay}
      />
    </>
  );
};
