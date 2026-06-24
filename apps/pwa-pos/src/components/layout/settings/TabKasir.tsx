import React from "react";

interface TabKasirProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabKasir = ({ settings, setSettings }: TabKasirProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Kontrol Laci & Shift
      </h3>

      <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between mb-6">
        <div>
          <h4 className="font-black text-slate-800 uppercase">
            Perintah Hardware Cash Drawer
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kirim sinyal RJ11 ke Printer untuk pop-up laci uang.
          </p>
        </div>
        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 shadow-md">
          Pop Drawer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-5 border-2 border-emerald-100 bg-emerald-50 rounded-2xl">
          <h4 className="font-black text-emerald-800 uppercase mb-4 text-center">
            Inflow (Kas Masuk)
          </h4>
          <input
            type="number"
            placeholder="Nominal Rp"
            className="w-full border border-emerald-200 rounded-xl p-3 text-lg font-black text-center mb-3 bg-white"
          />
          <button className="w-full bg-emerald-600 text-white rounded-xl p-3 text-sm font-black uppercase tracking-wider hover:bg-emerald-700 shadow-md">
            Catat Inflow
          </button>
        </div>
        <div className="p-5 border-2 border-rose-100 bg-rose-50 rounded-2xl">
          <h4 className="font-black text-rose-800 uppercase mb-4 text-center">
            Outflow (Kas Keluar)
          </h4>
          <input
            type="number"
            placeholder="Nominal Rp"
            className="w-full border border-rose-200 rounded-xl p-3 text-lg font-black text-center mb-3 bg-white"
          />
          <button className="w-full bg-rose-600 text-white rounded-xl p-3 text-sm font-black uppercase tracking-wider hover:bg-rose-700 shadow-md">
            Catat Outflow
          </button>
        </div>
      </div>
    </div>
  );
};
