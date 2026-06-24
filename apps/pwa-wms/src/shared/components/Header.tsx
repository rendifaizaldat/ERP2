import React, { useState, useEffect } from "react";
import { useWms } from "../../core/WmsProvider";
import { LogOut, Lock, Network, Store } from "lucide-react";

export const Header: React.FC = () => {
  const { currentOperator, logoutOperator, lockScreen, wmsState } = useWms();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-sky-700 text-white flex items-center justify-between px-6 shadow-md select-none z-20 flex-none">
      {/* Kiri: Branding & Identitas Cabang */}
      <div className="flex items-center gap-4">
        <div className="bg-white text-sky-700 w-10 h-10 flex items-center justify-center rounded-xl font-black italic text-lg shadow-sm">
          AS
        </div>
        <div className="flex flex-col">
          <h1 className="font-black text-lg leading-tight tracking-tight uppercase">
            Asstro <span className="text-sky-300">WMS</span>
          </h1>
          <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase opacity-90 text-sky-100">
            {wmsState?.wmsType === "PUSAT" ? (
              <Network size={10} />
            ) : (
              <Store size={10} />
            )}
            <span>
              {wmsState?.wmsType} • {wmsState?.regionId}
            </span>
          </div>
        </div>
      </div>

      {/* Tengah: Jam Digital */}
      <div className="hidden md:flex flex-col items-center">
        <span className="font-black text-xl tracking-wider">
          {currentTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
        <span className="text-[10px] font-bold tracking-widest uppercase text-sky-200">
          {currentTime.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Kanan: Info Operator & Aksi */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="font-black text-sm uppercase leading-tight">
            {currentOperator?.name}
          </p>
          <p className="text-[10px] font-bold tracking-widest uppercase text-sky-200">
            {currentOperator?.role}
          </p>
        </div>
        <div className="h-8 w-px bg-sky-500 mx-2"></div>
        <button
          onClick={lockScreen}
          className="p-2 bg-sky-600 hover:bg-sky-800 rounded-xl transition-colors text-white active:scale-95"
          title="Kunci Layar"
        >
          <Lock size={20} />
        </button>
        <button
          onClick={logoutOperator}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl transition-colors text-white font-black text-xs uppercase tracking-widest shadow-inner active:scale-95"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
};
