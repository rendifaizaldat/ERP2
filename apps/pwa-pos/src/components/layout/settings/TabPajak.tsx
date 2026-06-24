import React from "react";

interface TabPajakProps {
  settings: any;
  // setSettings tetap di-pass agar tidak error di parent, tapi tidak digunakan di sini.
  setSettings?: React.Dispatch<React.SetStateAction<any>>;
}

export const TabPajak = ({ settings }: TabPajakProps) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
    {/* Badge Informasi Read-Only */}
    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
      <span>🔒</span> DIKONTROL PUSAT
    </div>

    <h3 className="text-lg font-black uppercase text-slate-800 mb-1 border-b pb-2 mt-1">
      Regulasi Harga & Pajak
    </h3>
    <p className="text-xs font-bold text-slate-500 mb-5">
      Tarif pajak dan layanan dikonfigurasi secara terpusat oleh Head Office
      (HO).
    </p>

    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 opacity-90 pointer-events-none">
        <div>
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Persentase PPN (%)
          </label>
          <div className="relative">
            <input
              type="number"
              value={settings?.pajak?.ppn || 0}
              disabled
              className="w-full border-2 border-slate-200 bg-slate-100 rounded-lg py-2.5 pl-3 pr-10 text-lg font-black text-slate-500 cursor-not-allowed"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              %
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Service Charge (%)
          </label>
          <div className="relative">
            <input
              type="number"
              value={settings?.pajak?.serviceCharge || 0}
              disabled
              className="w-full border-2 border-slate-200 bg-slate-100 rounded-lg py-2.5 pl-3 pr-10 text-lg font-black text-slate-500 cursor-not-allowed"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
