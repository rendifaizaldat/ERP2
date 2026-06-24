import React, { useState, useRef } from "react";
import { DownloadCloud, UploadCloud } from "lucide-react";
import { usePos } from "../../../core/PosProvider";
import {
  exportLedgerToJson,
  importLedgerFromJson,
} from "../../../core/instances";

interface TabBackupProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabBackup = ({ settings, setSettings }: TabBackupProps) => {
  const { state } = usePos();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualBackup = async () => {
    setIsExporting(true);
    try {
      const branchId = state?.branchId || "UNKNOWN-CABANG";
      await exportLedgerToJson(branchId);
      alert("File Backup JSON berhasil diunduh!");
    } catch (err: any) {
      alert(`Gagal membuat backup: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "PERINGATAN: Memulihkan file JSON ini akan menyuntikkan data transaksi masa lalu ke dalam sistem lokal Anda. Lanjutkan?",
    );

    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsRestoring(true);
    try {
      const importedCount = await importLedgerFromJson(file);
      alert(
        `RESTORE SUKSES! ${importedCount} event berhasil dipulihkan ke dalam Ledger. Sistem sekarang akan mensinkronisasikannya ke Server Pusat jika internet tersedia.`,
      );
    } catch (err: any) {
      alert(`GAGAL RESTORE: ${err.message}`);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Manajemen File Basis Data (Disaster Recovery)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KOTAK 1: EKSPOR JSON */}
        <div className="border-2 border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:border-blue-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <DownloadCloud size={32} />
            </div>
            <h4 className="font-black uppercase text-slate-800 mb-2">
              Buat Backup Lokal
            </h4>
            <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
              Ekspor snapshot Ledger lokal ke file{" "}
              <span className="font-mono bg-slate-200 px-1 rounded">.json</span>{" "}
              untuk pengamanan manual (offline backup).
            </p>
          </div>
          <button
            onClick={handleManualBackup}
            disabled={isExporting}
            className="w-full bg-slate-900 text-white font-black text-xs tracking-widest uppercase py-3.5 rounded-xl shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? "Memproses..." : "Download .JSON"}
          </button>
        </div>

        {/* KOTAK 2: IMPORT JSON */}
        <div className="border-2 border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:border-orange-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UploadCloud size={32} />
            </div>
            <h4 className="font-black uppercase text-slate-800 mb-2">
              Restore File Basis Data
            </h4>
            <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
              Pilih file backup{" "}
              <span className="font-mono bg-slate-200 px-1 rounded">.json</span>{" "}
              dari perangkat ini untuk dipulihkan ke dalam Ledger transaksi PWA.
            </p>
          </div>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              disabled={isRestoring}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button
              disabled={isRestoring}
              className="w-full bg-orange-600 text-white font-black text-xs tracking-widest uppercase py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRestoring ? "Memulihkan Data..." : "Pilih File & Restore"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
