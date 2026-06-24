import React from "react";

interface TabIOProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabIO = ({ settings, setSettings }: TabIOProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
        Input & Output (Hardware)
      </h3>
      <div className="space-y-4">
        <div className="p-5 border-2 border-slate-200 bg-slate-50 rounded-2xl">
          <h4 className="font-black uppercase text-slate-800 mb-2">
            Sistem Keyboard Layar Sentuh
          </h4>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            Pilih metode input saat kasir mengetik angka (Numpad) atau huruf
            (Qwerty).
          </p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="keyboard_type"
                checked={settings.io.useSmartInput === true}
                onChange={() =>
                  setSettings({ ...settings, io: { useSmartInput: true } })
                }
                className="w-5 h-5 accent-orange-600"
              />
              Gunakan SmartInput PWA (Blokir OS Keyboard)
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="keyboard_type"
                checked={settings.io.useSmartInput === false}
                onChange={() =>
                  setSettings({ ...settings, io: { useSmartInput: false } })
                }
                className="w-5 h-5 accent-orange-600"
              />
              Keyboard Bawaan OS (Android/iOS)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
