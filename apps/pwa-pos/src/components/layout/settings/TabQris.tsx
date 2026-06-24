import React from "react";

interface TabQrisProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabQris = ({ settings, setSettings }: TabQrisProps) => {
  const handleQrisChange = (field: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      qris: {
        ...prev.qris,
        [field]: value,
      },
    }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Informasi Rekening & QRIS Statis
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
              Nama Bank Instansi
            </label>
            <input
              type="text"
              placeholder="BCA / MANDIRI"
              value={settings?.qris?.bankName || ""}
              onChange={(e) => handleQrisChange("bankName", e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
              Nomor Rekening Tujuan
            </label>
            <input
              type="text"
              placeholder="1234567890"
              value={settings?.qris?.accountNumber || ""}
              onChange={(e) =>
                handleQrisChange("accountNumber", e.target.value)
              }
              className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold font-mono tracking-widest"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
            Atas Nama Rekening Sah
          </label>
          <input
            type="text"
            placeholder="PT ASSTRO HOLDING"
            value={settings?.qris?.accountName || ""}
            onChange={(e) => handleQrisChange("accountName", e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold uppercase"
          />
        </div>
        <div className="mt-6 p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl shadow-sm mb-3 flex items-center justify-center">
            <span className="text-[8px] font-black text-slate-400">QRIS</span>
          </div>
          <label className="block text-sm font-black uppercase text-slate-800 mb-1">
            Upload Barcode QRIS Statis
          </label>
          <p className="text-xs text-slate-500 mb-4 max-w-xs">
            Gambar barcode ini akan dirender di layar *Customer Display* atau
            di-print pada struk pre-bill.
          </p>
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  handleQrisChange("qrUrl", evt.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="text-sm font-bold text-slate-600 bg-white border rounded-lg p-1.5"
          />
        </div>
      </div>
    </div>
  );
};
