import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../Toast";

interface ExportMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterProducts: Array<{
    sku: string;
    name: string;
    price: number;
    categoryId: string;
    isActive?: boolean;
    isArchived?: boolean;
  }>;
  masterCategories: Array<{ id: string; name: string }>;
}

export const ExportMenuModal: React.FC<ExportMenuModalProps> = ({
  isOpen,
  onClose,
  masterProducts,
  masterCategories,
}) => {
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleExportExcel = () => {
    const exportData = masterProducts.map((p) => {
      const cat = masterCategories.find((c) => c.id === p.categoryId);
      return {
        SKU: p.sku,
        KATEGORI: cat ? cat.name : "UNKNOWN",
        "NAMA MENU": p.name,
        HARGA: p.price,
        STATUS: p.isArchived
          ? "ARSIP"
          : p.isActive === false
            ? "OFFLINE"
            : "AKTIF",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Katalog_Menu");
    XLSX.writeFile(wb, `Asstro_Katalog_${new Date().getTime()}.xlsx`);
    showToast("Berhasil mengekspor data ke Excel.", "SUCCESS");
    onClose();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Katalog Menu Asstro POS", 14, 20);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 26);

    const tableColumn = ["SKU", "Kategori", "Nama Menu", "Harga", "Status"];
    const tableRows = masterProducts.map((p) => {
      const cat = masterCategories.find((c) => c.id === p.categoryId);
      return [
        p.sku,
        cat ? cat.name : "-",
        p.name,
        `Rp ${p.price.toLocaleString()}`,
        p.isArchived ? "ARSIP" : p.isActive === false ? "OFFLINE" : "AKTIF",
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] },
    });

    doc.save(`Asstro_Katalog_${new Date().getTime()}.pdf`);
    showToast("Berhasil mengekspor data ke PDF.", "SUCCESS");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-100 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 text-center">
        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight mb-2">
          Export Katalog
        </h3>
        <p className="text-slate-500 text-xs font-medium mb-6">
          Pilih format unduhan untuk database menu ruko ini.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleExportExcel}
            className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileSpreadsheet size={18} /> Format Excel (.XLSX)
          </button>

          <button
            onClick={handleExportPDF}
            className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-700 border-2 border-red-100 hover:border-red-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileText size={18} /> Format Dokumen (.PDF)
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 py-3 text-slate-400 hover:text-slate-800 font-bold text-xs uppercase cursor-pointer transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
