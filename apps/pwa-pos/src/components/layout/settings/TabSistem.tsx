import React from "react";

interface TabSistemProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabSistem = ({ settings, setSettings }: TabSistemProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Informasi Sistem Inti
      </h3>
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-5 border-b border-slate-100">
          <div>
            <h4 className="font-black text-slate-800 uppercase">
              Pembaruan Kode Sistem (OTA)
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Versi Build Aktif:{" "}
              <span className="font-mono bg-slate-100 px-1 rounded">
                v3.0.0-Stable
              </span>{" "}
              (PWA Cached)
            </p>
          </div>
          <button className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-sm">
            Check Update Web-Worker
          </button>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>

          <div className="font-black text-2xl uppercase tracking-widest mb-2 relative z-10">
            Asstro POS <span className="text-orange-500">Core</span>
          </div>
          <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed relative z-10">
            Sistem Kasir Enterprise tersentralisasi yang dirancang khusus untuk
            memenuhi standar skalabilitas infrastruktur Holding Group Asstro.
          </p>
          <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase relative z-10">
            Arsitektur CQRS/Event-Sourcing Engine | © 2026 Asstro IT Dept.
          </div>
        </div>
      </div>
    </div>
  );
};
