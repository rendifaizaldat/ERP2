import React, { useRef, useState } from "react";
import { X, AlertTriangle, FileSpreadsheet, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "../Toast";
import { usePos } from "../../core/PosProvider";

interface ImportMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterCategories: Array<{ id: string; name: string }>;
  masterProducts: Array<{
    sku: string;
    name: string;
    price: number;
    categoryId: string;
  }>;
}

export const ImportMenuModal: React.FC<ImportMenuModalProps> = ({
  isOpen,
  onClose,
  masterCategories,
  masterProducts,
}) => {
  const { showToast } = useToast();
  const { addMasterCategory, addMasterProduct } = usePos();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        SKU: "SKU-001",
        KATEGORI: "MINUMAN",
        "NAMA MENU": "ES TEH MANIS",
        HARGA: 5000,
      },
      {
        SKU: "SKU-002",
        KATEGORI: "MAKANAN",
        "NAMA MENU": "NASI GORENG SPESIAL",
        HARGA: 25000,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Menu_Asstro");
    XLSX.writeFile(wb, "Template_Import_Menu_Asstro.xlsx");
    showToast("Template berhasil diunduh. Silakan isi data Anda.", "SUCCESS");
  };

  const processImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0)
          throw new Error("File Excel kosong atau format tidak sesuai.");

        let successCount = 0;
        const localCategoryCache = [...masterCategories];

        for (const row of data as any[]) {
          const skuRaw = row["SKU"];
          const catRaw = row["KATEGORI"];
          const nameRaw = row["NAMA MENU"];
          const priceRaw = row["HARGA"];

          if (!skuRaw || !catRaw || !nameRaw || priceRaw === undefined)
            continue;

          const catName = String(catRaw).trim().toUpperCase();
          const sku = String(skuRaw).trim().toUpperCase();
          const name = String(nameRaw).trim().toUpperCase();
          const price = Number(priceRaw) || 0;

          let targetCat = localCategoryCache.find((c) => c.name === catName);
          let targetCatId = targetCat?.id;

          if (!targetCatId && addMasterCategory) {
            targetCatId = await addMasterCategory(catName);
            if (targetCatId)
              localCategoryCache.push({ id: targetCatId, name: catName });
          }

          const isExist = masterProducts.some((p) => p.sku === sku);

          if (!isExist && targetCatId && addMasterProduct) {
            await addMasterProduct({
              sku,
              name,
              price,
              categoryId: targetCatId,
            });
            successCount++;
          }
        }

        showToast(
          `Import Berhasil! ${successCount} menu ditambahkan ke Database Lokal.`,
          "SUCCESS",
        );
        onClose();
      } catch (err: any) {
        showToast(`Gagal memproses file: ${err.message}`, "ERROR");
      } finally {
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-100 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">
              Import Produk
            </h3>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Tambahkan menu massal via Excel (XLSX)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="text-orange-500 shrink-0" size={20} />
            <div>
              <h4 className="font-black text-xs text-orange-800 uppercase tracking-wider">
                Catatan Penting
              </h4>
              <p className="text-orange-700/80 text-[11px] mt-1 leading-relaxed">
                Sistem hanya menerima file Excel dengan format kolom yang
                spesifik.{" "}
                <strong>
                  Unduh template di bawah ini jika Anda belum memiliki format
                  yang sesuai.
                </strong>
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="mt-3 flex items-center gap-2 px-3 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-[10px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet size={14} /> Unduh Template Excel
              </button>
            </div>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-orange-400 transition-all group">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={processImportFile}
          />
          <UploadCloud
            className="text-slate-400 group-hover:text-orange-500 mx-auto mb-3 transition-colors"
            size={32}
          />
          <h4 className="font-black text-sm text-slate-700">
            Pilih File Excel
          </h4>
          <p className="text-[10px] text-slate-400 mt-1 mb-4">
            Maksimal ukuran file: 5MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isProcessingFile ? "Memproses..." : "Cari File (.xlsx)"}
          </button>
        </div>
      </div>
    </div>
  );
};
