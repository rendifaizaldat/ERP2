import React, { useState, useEffect } from "react";
import { useWms } from "../../core/WmsProvider";
import { Wifi, WifiOff, Server } from "lucide-react";

export const Footer: React.FC = () => {
  const { wmsState } = useWms();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <footer className="h-8 bg-slate-900 text-slate-400 flex items-center justify-between px-4 text-[10px] font-bold tracking-widest uppercase flex-none z-20">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Server size={12} className="text-sky-500" />
          WMS ENGINE V1.0 by rendi faizal dat
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:inline">
          ID: {wmsState?.branchId || "UNKNOWN_NODE"}
        </span>
        <div className="h-3 w-px bg-slate-700" />
        <span
          className={`flex items-center gap-1.5 ${
            isOnline ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? "SYSTEM ONLINE" : "OFFLINE MODE"}
        </span>
      </div>
    </footer>
  );
};
