import React from "react";

interface TabPembayaranProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabPembayaran = ({
  settings,
  setSettings,
}: TabPembayaranProps) => {
  const paymentMethods = [
    { key: "cash", label: "TUNAI KASIR (CASH)" },
    { key: "debit", label: "KARTU DEBIT / EDC" },
    { key: "qris", label: "QRIS PAYMENT" },
  ];

  const debitBankOptions = ["BCA", "MANDIRI", "BNI", "BRI", "ETC"];

  const handlePaymentToggle = (key: string, value: boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      pembayaran: {
        ...prev.pembayaran,
        [key]: value,
      },
    }));
  };

  const handleDebitBankChange = (value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      debit: {
        ...prev.debit,
        bankName: value,
      },
    }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
          Manajemen Metode Pembayaran
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <div
              key={method.key}
              className="flex items-center justify-between p-3.5 border-2 border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-colors"
            >
              <span className="text-xs font-black tracking-wider text-slate-700">
                {method.label}
              </span>
              <input
                type="checkbox"
                checked={settings?.pembayaran?.[method.key] ?? true}
                onChange={(e) =>
                  handlePaymentToggle(method.key, e.target.checked)
                }
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* DEBIT BANK SELECTION */}
      {settings?.pembayaran?.debit && (
        <div className="p-5 border-2 border-orange-200 bg-orange-50 rounded-2xl">
          <h4 className="font-black uppercase text-slate-800 mb-3">
            Pilih Bank untuk EDC/DEBIT
          </h4>
          <select
            value={settings?.debit?.bankName || "BCA"}
            onChange={(e) => handleDebitBankChange(e.target.value)}
            className="w-full border-2 border-orange-300 bg-white rounded-xl p-3 font-black text-sm uppercase tracking-wider cursor-pointer"
          >
            {debitBankOptions.map((bank) => (
              <option key={bank} value={bank}>
                BANK {bank}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-2 font-medium">
            Enum Database: DEBIT_{settings?.debit?.bankName || "BCA"}
          </p>
        </div>
      )}

      {/* QRIS INFO */}
      {settings?.pembayaran?.qris && (
        <div className="p-5 border-2 border-blue-200 bg-blue-50 rounded-2xl">
          <h4 className="font-black uppercase text-slate-800 mb-2">
            ℹ️ QRIS Payment Settings
          </h4>
          <p className="text-xs text-slate-700 font-medium">
            Konfigurasi detail QRIS (bank, rekening, barcode) ada di tab{" "}
            <span className="font-black text-blue-700">"QRIS & Rekening"</span>
          </p>
        </div>
      )}
      <div className="p-5 border-2 border-slate-200 bg-slate-50 rounded-2xl">
        <h4 className="font-black uppercase text-slate-800 mb-1">
          Integrasi Payment Gateway (Otomatis)
        </h4>
        <p className="text-xs text-slate-500 mb-4 font-medium">
          Hubungkan POS dengan Midtrans / Xendit untuk verifikasi QRIS otomatis
          tanpa cek mutasi manual.
        </p>
        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
          Production Server Key
        </label>
        <input
          type="password"
          placeholder="Midtrans Server Key / Secret"
          className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono mb-3"
        />
        <button className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 shadow-md">
          Test Koneksi API
        </button>
      </div>
    </div>
  );
};
