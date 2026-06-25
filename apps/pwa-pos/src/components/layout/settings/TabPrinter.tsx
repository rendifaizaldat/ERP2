import React from "react";

interface TabPrinterProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabPrinter = ({ settings, setSettings }: TabPrinterProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Konektivitas Mesin Printer
      </h3>

      <div className="mb-6 p-5 border border-slate-200 bg-slate-50 rounded-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <h4 className="font-black uppercase text-slate-800 tracking-wider">
          Printer Utama (Kasir Depan)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Tipe Printer
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white"
              value={settings?.printer?.mainType || "Thermal"}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, printer: { ...prev.printer, mainType: e.target.value } }))}
            >
              <option value="Thermal">Thermal POS Printer</option>
              <option value="Inkjet">Inkjet/Laser Document</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Jalur Komunikasi
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white"
              value={settings?.printer?.connection || "Bluetooth"}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, printer: { ...prev.printer, connection: e.target.value } }))}
            >
              <option value="Bluetooth">Bluetooth (SPP/BLE)</option>
              <option value="LAN">TCP/IP LAN (Network)</option>
              <option value="USB">USB Serial</option>
            </select>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-4 pt-2">
          <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md">
            Print Test Page
          </button>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-3 py-2 border rounded-lg">
            <input
              type="checkbox"
              checked={settings?.printer?.autoPrint ?? true}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, printer: { ...prev.printer, autoPrint: e.target.checked } }))}
              className="w-4 h-4 accent-blue-600"
            />{" "}
            Auto-Print saat Checkout
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-3 py-2 border rounded-lg ml-auto">
            Total Copy:{" "}
            <input
              type="number"
              value={settings?.printer?.copy || 1}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, printer: { ...prev.printer, copy: parseInt(e.target.value) || 1 } }))}
              min={1}
              max={3}
              className="w-12 border rounded bg-slate-50 p-1 text-center"
            />
          </label>
        </div>
      </div>

      <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <h4 className="font-black uppercase text-slate-800 tracking-wider">
          Printer KDS (Dapur / Bar)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Alamat IP / Port
            </label>
            <input
              type="text"
              placeholder="192.168.1.100:9100"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Jalur Komunikasi
            </label>
            <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white">
              <option>LAN (Network) - Disarankan</option>
              <option>Bluetooth</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button className="px-5 py-2.5 bg-slate-200 text-slate-800 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-300 transition-colors">
            Test Dapur
          </button>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-3 py-2 border rounded-lg">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 accent-orange-600"
            />{" "}
            Auto-Print Order Baru
          </label>
        </div>
      </div>
    </div>
  );
};
