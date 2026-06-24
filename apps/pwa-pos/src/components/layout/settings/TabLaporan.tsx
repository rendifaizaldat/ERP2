import React from "react";

interface TabLaporanProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabLaporan = ({ settings, setSettings }: TabLaporanProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Ekspor Laporan & Otomatisasi
      </h3>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Periode Render Default
          </label>
          <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white">
            <option>Shift Berjalan (Real-time)</option>
            <option>Harian (End of Day)</option>
            <option>Siklus Mingguan</option>
          </select>
        </div>
        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
          <h4 className="font-black uppercase text-blue-900 text-sm mb-1">
            Email Auto-Broadcast Laporan Shift
          </h4>
          <p className="text-xs text-blue-700 mb-3">
            Sistem akan otomatis mengirimkan rekap PDF & Excel ke email saat
            kasir melakukan aksi Tutup Kas/Shift.
          </p>
          <input
            type="email"
            placeholder="owner@asstro.com, manajer@asstro.com"
            className="w-full border border-blue-200 rounded-lg p-3 text-sm font-medium mb-3 bg-white"
          />
          <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-blue-600"
            />{" "}
            Aktifkan Pengiriman Otomatis Email
          </label>
        </div>
        <div>
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Standard Template Ekspor Cepat
          </label>
          <div className="flex gap-3">
            <button className="flex-1 py-3 border-2 border-green-200 bg-green-50 text-green-700 rounded-xl text-sm font-black uppercase hover:bg-green-100 transition-colors">
              SET TO EXCEL (.XLSX)
            </button>
            <button className="flex-1 py-3 border-2 border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-black uppercase hover:bg-red-100 transition-colors">
              SET TO PDF DOCUMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
