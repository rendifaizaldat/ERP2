import React from "react";

interface TabKoneksiProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabKoneksi = ({ settings, setSettings }: TabKoneksiProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Arsitektur Database & Ledger
      </h3>

      <div className="flex items-center justify-between p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-6">
        <div>
          <h4 className="font-black text-emerald-900 uppercase text-lg">
            P2P Network: ONLINE
          </h4>
          <p className="text-xs font-bold text-emerald-700 mt-0.5">
            RxDB Sync Active. Node ID: ASSTRO-ND-001
          </p>
        </div>
        <span className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md animate-pulse">
          CONNECTED
        </span>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
          <div>
            <span className="block text-sm font-black text-slate-800 uppercase">
              CouchDB Central Sync
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Replikasi P2P transaksi ke Server Pusat (Cloud)
            </span>
          </div>
          <input
            type="checkbox"
            checked={true}
            readOnly
            className="w-5 h-5 accent-orange-600"
          />
        </label>
        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
          <div>
            <span className="block text-sm font-black text-slate-800 uppercase">
              Offline Buffer Mode
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Simpan Event Ledger di IndexedDB saat internet mati
            </span>
          </div>
          <input
            type="checkbox"
            checked={true}
            readOnly
            className="w-5 h-5 accent-orange-600"
          />
        </label>
        <div className="pt-4">
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Central Node Endpoint (Otomatis dari Server)
          </label>
          <input
            type="text"
            value={
              import.meta.env.VITE_API_URL || "https://api.asstro.com/sync"
            }
            readOnly
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-mono font-bold bg-slate-200 text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};
