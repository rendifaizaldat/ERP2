import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export const Footer = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  return (
    <footer className="h-7 bg-slate-900 text-[9px] font-black text-slate-500 px-4 flex items-center justify-between uppercase tracking-widest shrink-0">
      {/* Kiri: Status Jaringan */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi size={12} className="text-green-500" />
        ) : (
          <WifiOff size={12} className="text-red-500" />
        )}
        <span className={isOnline ? "text-slate-300" : "text-red-400"}>
          {isOnline ? "System Sedang Online" : "System Sedang Offline"}
        </span>
      </div>

      {/* Tengah: Kredit */}
      <div className="text-slate-400">rendifaizaldat &copy;2026</div>

      {/* Kanan: Versi + beta */}
      <div className="text-slate-500">
        ALMA v1.0.0 <span className="text-orange-500">beta test</span>
      </div>
    </footer>
  );
};
