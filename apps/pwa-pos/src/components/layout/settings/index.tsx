import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usePos } from "../../../core/PosProvider";
import { usePosActions } from "../../../core/hooks/usePosActions";

// Import Tabs
import { TabStruk } from "./TabStruk";
import { TabPrinter } from "./TabPrinter";
import { TabPajak } from "./TabPajak";
import { TabPembayaran } from "./TabPembayaran";
import { TabQris } from "./TabQris";
import { TabLaporan } from "./TabLaporan";
import { TabKoneksi } from "./TabKoneksi";
import { TabKasir } from "./TabKasir";
import { TabLog } from "./TabLog";
import { TabBackup } from "./TabBackup";
import { TabSistem } from "./TabSistem";
import { TabIO } from "./TabIO";

interface SidebarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarSettings = ({ isOpen, onClose }: SidebarSettingsProps) => {
  // 1. SEMUA HOOKS HARUS BERADA DI BAGIAN PALING ATAS
  const [activeMenu, setActiveMenu] = useState("STRUK");
  const [isSaving, setIsSaving] = useState(false);

  // State sentral untuk menampung seluruh perubahan sebelum di-save
  const [settings, setSettings] = useState({
    struk: {
      header: "",
      footer: "",
      paperSize: "58mm",
      showCashier: true,
      showQris: true,
    },
    printer: { mainType: "Thermal", autoPrint: true, copy: 1 },
    pajak: { ppn: 11, serviceCharge: 5, taxIncluded: true },
    pembayaran: { cash: true, debit: true, qris: true },
    debit: {
      bankName: "BCA", // Enum: BCA, MANDIRI, BNI, BRI, ETC
    },
    qris: {
      bankName: "",
      accountNumber: "",
      accountName: "",
      qrUrl: "",
    },
    io: { useSmartInput: true },
  });

  // 2. Ambil data dari Global State, BUKAN membuat instance usePosSync baru
  const globalContextData = usePos();
  const posActions = usePosActions(globalContextData);

  // 3. LOAD EXISTING SETTINGS DARI GLOBAL STATE KETIKA MODAL DIBUKA
  useEffect(() => {
    if (isOpen && globalContextData?.state?.settings) {
      const globalSettings = globalContextData.state.settings;

      // Handle backward compatibility: convert "edc" to "debit"
      const pembayaranSettings = globalSettings?.pembayaran
        ? {
            ...globalSettings.pembayaran,
            // Jika ada property "edc", copy ke "debit" untuk compatibility
            debit:
              globalSettings.pembayaran.debit ??
              globalSettings.pembayaran.edc ??
              true,
          }
        : undefined;

      setSettings((prev) => ({
        ...prev,
        ...globalSettings,
        ...(pembayaranSettings && { pembayaran: pembayaranSettings }),
      }));
    }
  }, [isOpen, globalContextData?.state?.settings]);

  // 4. EARLY RETURN HARUS BERADA DI BAWAH SEMUA HOOKS
  if (!isOpen) return null;

  const menuList = [
    { id: "STRUK", label: "Struk & Invoice" },
    { id: "PRINTER", label: "Koneksi Printer" },
    { id: "PAJAK", label: "Pajak & Harga" },
    { id: "PEMBAYARAN", label: "Metode Pembayaran" },
    { id: "QRIS", label: "QRIS & Rekening" },
    { id: "LAPORAN", label: "Laporan & Export" },
    { id: "KONEKSI", label: "Koneksi & Sync" },
    { id: "KASIR", label: "Kasir & Shift" },
    { id: "LOG", label: "Log & Audit" },
    { id: "BACKUP", label: "Backup & Restore" },
    { id: "SISTEM", label: "Sistem & Aplikasi" },
    { id: "IO", label: "Input & Output (I/O)" },
  ];

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await posActions.updateSettings(settings);
      alert("Konfigurasi berhasil disimpan dan akan disinkronisasi ke server!");
      onClose();
    } catch (error) {
      console.error("Gagal menyimpan settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-70 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[85vw] max-w-5xl bg-slate-50 z-80 shadow-2xl flex flex-col animate-slide-left">
        {/* Header Modal */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Pengaturan Sistem{" "}
              <span className="text-orange-600">Enterprise</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Konfigurasi Menyeluruh Operasional POS Asstro
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Menu Kiri */}
          <div className="w-1/4 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
              {menuList.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenu(menu.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-tight transition-all ${
                    activeMenu === menu.id
                      ? "bg-slate-900 text-white shadow-md scale-[1.02]"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {menu.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Kanan */}
          <div className="w-3/4 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto scrollbar-thin relative">
            <div className="p-6 md:p-8 max-w-4xl pb-24">
              {activeMenu === "STRUK" && (
                <TabStruk settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "PRINTER" && (
                <TabPrinter settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "PAJAK" && (
                <TabPajak settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "PEMBAYARAN" && (
                <TabPembayaran settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "QRIS" && (
                <TabQris settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "LAPORAN" && (
                <TabLaporan settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "KONEKSI" && (
                <TabKoneksi settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "KASIR" && (
                <TabKasir settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "LOG" && (
                <TabLog settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "BACKUP" && (
                <TabBackup settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "SISTEM" && (
                <TabSistem settings={settings} setSettings={setSettings} />
              )}
              {activeMenu === "IO" && (
                <TabIO settings={settings} setSettings={setSettings} />
              )}
            </div>
          </div>

          <div className="absolute bottom-6 right-8">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isSaving ? "Menyimpan & Sinkronisasi..." : "Simpan Konfigurasi"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
