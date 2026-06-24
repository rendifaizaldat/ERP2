import React, { useEffect, useState } from "react";
import { Maximize, ShieldAlert, AlertTriangle } from "lucide-react";

interface SecurityEnforcerProps {
  children: React.ReactNode;
}

export const SecurityEnforcer: React.FC<SecurityEnforcerProps> = ({
  children,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Inisialisasi awal
    setIsFullscreen(!!document.fullscreenElement);
    setIsReady(true);

    // 2. Listener perubahan Fullscreen (misal kasir menekan tombol ESC)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // 3. Memblokir akses Developer Tools & Inspect Element
    const handleKeyDown = (e: KeyboardEvent) => {
      // Blokir F12
      if (e.key === "F12") {
        e.preventDefault();
      }
      // Blokir Ctrl+Shift+I / J / C (Windows/Linux) atau Cmd+Opt+I / J / C (Mac)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ["I", "J", "C"].includes(e.key.toUpperCase())
      ) {
        e.preventDefault();
      }
      // Blokir Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U") {
        e.preventDefault();
      }
      // Blokir Ctrl+P / Cmd+P (Cetak default browser)
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "P") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // 4. Memblokir Klik Kanan (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    // HANYA BLOKIR JIKA DI PRODUCTION (Bisa di-adjust jika Anda sedang tahap dev)
    if (
      import.meta.env.MODE === "production" ||
      import.meta.env.VITE_LOCK_KIOSK === "true"
    ) {
      document.addEventListener("contextmenu", handleContextMenu);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Gagal masuk mode fullscreen:", err);
      alert(
        "Browser Anda memblokir mode layar penuh. Harap izinkan popup/fullscreen.",
      );
    }
  };

  if (!isReady) return null;

  return (
    <>
      {children}

      {/* MODAL KUNCI JIKA KELUAR DARI FULLSCREEN */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95 border-4 border-red-500/20">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-3">
              Terminal Terkunci
            </h2>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-8">
              <p className="text-amber-800 font-bold text-sm leading-relaxed flex flex-col gap-2">
                <span className="flex justify-center">
                  <AlertTriangle size={20} />
                </span>
                Demi keamanan sistem (Kiosk Mode) dan mencegah gangguan
                operasional kasir, aplikasi ini <b>wajib</b> dijalankan dalam
                mode Layar Penuh (Fullscreen).
              </p>
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-95"
            >
              <Maximize size={20} /> Kembali Ke Mode Kasir (Fullscreen)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
