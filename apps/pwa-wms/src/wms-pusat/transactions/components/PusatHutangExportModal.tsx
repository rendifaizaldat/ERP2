import React, { useState } from "react";
import { X, Download, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PusatHutangExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[]; // AccountPayableData[]
  vendors: any[]; // Vendor[]
}

export default function PusatHutangExportModal({
  isOpen,
  onClose,
  data,
  vendors,
}: PusatHutangExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  if (!isOpen) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getVendorName = (vendorId: string) => {
    const v = vendors.find((v) => v.id === vendorId);
    return v ? v.name : vendorId;
  };

  // Logika Penyaringan Data
  const getFilteredData = () => {
    return data.filter((item) => {
      let isMatch = true;

      if (startDate && item.tanggal < startDate) isMatch = false;
      if (endDate && item.tanggal > endDate) isMatch = false;
      if (selectedVendor !== "ALL" && item.vendor !== selectedVendor)
        isMatch = false;
      if (selectedStatus !== "ALL" && item.status !== selectedStatus)
        isMatch = false;

      return isMatch;
    });
  };

  // EXPORT EXCEL
  const handleExportExcel = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      alert("Tidak ada data yang sesuai dengan filter ini.");
      return;
    }

    const exportData = filtered.map((item) => ({
      "No. Dokumen": item.id,
      Tanggal: item.tanggal,
      "Jatuh Tempo": item.jatuhTempo || "-",
      Vendor: getVendorName(item.vendor),
      "Total Hutang": item.total,
      "Total Dibayar": item.dibayar,
      "Sisa Hutang (Outstanding)": item.sisa,
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Hutang");

    const fileName = `Laporan_Hutang_Vendor_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onClose();
  };

  // EXPORT PDF
  const handleExportPDF = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      alert("Tidak ada data yang sesuai dengan filter ini.");
      return;
    }

    const doc = new jsPDF("landscape");

    // Header Laporan
    doc.setFontSize(16);
    doc.text("LAPORAN HUTANG VENDOR (ACCOUNT PAYABLE)", 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
      14,
      22,
    );

    let filterText = `Filter -> Status: ${selectedStatus} | Vendor: ${selectedVendor === "ALL" ? "Semua" : getVendorName(selectedVendor)}`;
    if (startDate || endDate) {
      filterText += ` | Periode: ${startDate || "Awal"} s.d ${endDate || "Akhir"}`;
    }
    doc.text(filterText, 14, 28);

    // Persiapan Data Tabel
    const tableColumn = [
      "No. Dokumen",
      "Tanggal",
      "Vendor",
      "Total Tagihan",
      "Dibayar",
      "Sisa Hutang",
      "Status",
    ];
    const tableRows: any[] = [];

    let sumTotal = 0;
    let sumDibayar = 0;
    let sumSisa = 0;

    filtered.forEach((item) => {
      sumTotal += item.total;
      sumDibayar += item.dibayar;
      sumSisa += item.sisa;

      const rowData = [
        item.id,
        item.tanggal,
        getVendorName(item.vendor),
        formatRupiah(item.total),
        formatRupiah(item.dibayar),
        formatRupiah(item.sisa),
        item.status,
      ];
      tableRows.push(rowData);
    });

    // Baris Total di akhir tabel
    tableRows.push([
      {
        content: "TOTAL KESELURUHAN",
        colSpan: 3,
        styles: { halign: "right", fontStyle: "bold" },
      },
      { content: formatRupiah(sumTotal), styles: { fontStyle: "bold" } },
      { content: formatRupiah(sumDibayar), styles: { fontStyle: "bold" } },
      { content: formatRupiah(sumSisa), styles: { fontStyle: "bold" } },
      "",
    ]);

    // Render Tabel
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const fileName = `Laporan_Hutang_Vendor_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Download size={20} className="text-blue-600" />
            Laporan Kustom
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Konten Filter */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Filter Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Status Pembayaran
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="UNPAID">Belum Dibayar (Unpaid)</option>
              <option value="PARTIAL">Dibayar Sebagian (Partial)</option>
              <option value="PAID">Lunas (Paid)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleExportPDF}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
          >
            <FileText size={18} />
            Cetak PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
          >
            <FileSpreadsheet size={18} />
            Cetak Excel
          </button>
        </div>
      </div>
    </div>
  );
}
