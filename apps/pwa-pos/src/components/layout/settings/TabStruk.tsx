import React from "react";

interface TabStrukProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabStruk = ({ settings, setSettings }: TabStrukProps) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
    <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
      Pengaturan Struk & Invoice
    </h3>
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Logo Struk Default
        </label>
        <input
          type="file"
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Teks Header Struk
          </label>
          <textarea
            rows={3}
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-medium focus:border-orange-500 outline-none transition-colors"
            placeholder="Nama Toko&#10;Alamat Lengkap"
            value={settings?.struk?.header || ""}
            onChange={(e) => setSettings((prev: any) => ({ ...prev, struk: { ...prev.struk, header: e.target.value } }))}
          ></textarea>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Teks Footer Struk
          </label>
          <textarea
            rows={3}
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-medium focus:border-orange-500 outline-none transition-colors"
            placeholder="Terima kasih atas kunjungan Anda"
            value={settings?.struk?.footer || ""}
            onChange={(e) => setSettings((prev: any) => ({ ...prev, struk: { ...prev.struk, footer: e.target.value } }))}
          ></textarea>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Lebar Kertas Cetak
          </label>
          <select
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white"
            value={settings?.struk?.paperSize || "58mm"}
            onChange={(e) => setSettings((prev: any) => ({ ...prev, struk: { ...prev.struk, paperSize: e.target.value } }))}
          >
            <option value="58mm">58mm (Mini Thermal Default)</option>
            <option value="80mm">80mm (Kiosk Thermal)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Format Timestamp
          </label>
          <select
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white"
            value={settings?.struk?.timestampFormat || "DD/MM/YYYY HH:mm"}
            onChange={(e) => setSettings((prev: any) => ({ ...prev, struk: { ...prev.struk, timestampFormat: e.target.value } }))}
          >
            <option value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm (Standar ID)</option>
            <option value="MM/DD/YYYY HH:mm">MM/DD/YYYY HH:mm</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);
