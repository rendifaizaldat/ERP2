import React, { useState } from "react";
import { X } from "lucide-react";

interface SidebarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarSettings = ({ isOpen, onClose }: SidebarSettingsProps) => {
  const [activeMenu, setActiveMenu] = useState("STRUK");

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
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-70 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer / Modal Container */}
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

        {/* Content Area dengan Layout Split */}
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
              {/* 1. STRUK & INVOICE */}
              {activeMenu === "STRUK" && (
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
                        ></textarea>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Lebar Kertas Cetak
                        </label>
                        <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white">
                          <option>58mm (Mini Thermal Default)</option>
                          <option>80mm (Kiosk Thermal)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Format Timestamp
                        </label>
                        <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white">
                          <option>DD/MM/YYYY HH:mm (Standar ID)</option>
                          <option>MM/DD/YYYY HH:mm</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-slate-100 mt-4">
                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span className="text-sm font-bold text-slate-700">
                          Tampilkan Nama Kasir (Audit Track)
                        </span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 accent-orange-600 cursor-pointer"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span className="text-sm font-bold text-slate-700">
                          Cetak QR Code Tagihan Digital
                        </span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 accent-orange-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. KONEKSI PRINTER */}
              {activeMenu === "PRINTER" && (
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
                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white">
                          <option>Thermal POS Printer</option>
                          <option>Inkjet/Laser Document</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                          Jalur Komunikasi
                        </label>
                        <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold bg-white">
                          <option>Bluetooth (SPP/BLE)</option>
                          <option>TCP/IP LAN (Network)</option>
                          <option>USB Serial</option>
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
                          defaultChecked
                          className="w-4 h-4 accent-blue-600"
                        />{" "}
                        Auto-Print saat Checkout
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-3 py-2 border rounded-lg ml-auto">
                        Total Copy:{" "}
                        <input
                          type="number"
                          defaultValue={1}
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
              )}

              {/* 3. PAJAK & HARGA */}
              {activeMenu === "PAJAK" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Regulasi Harga & Pajak
                  </h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                          Persentase PPN Restoran (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            defaultValue={11}
                            className="w-full border-2 border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-lg font-black"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                          Service Charge (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            defaultValue={5}
                            className="w-full border-2 border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-lg font-black"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border border-slate-200 p-4 rounded-xl">
                      <label className="block text-xs font-black tracking-wider uppercase text-slate-800 mb-3">
                        Sistem Tampilan Harga Menu
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="tax_incl"
                            defaultChecked
                            className="w-5 h-5 accent-orange-600"
                          />{" "}
                          Harga Sudah Termasuk Pajak (Include)
                        </label>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="tax_incl"
                            className="w-5 h-5 accent-orange-600"
                          />{" "}
                          Belum Termasuk Pajak (Exclude)
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                        Regulasi Pembulatan Transaksi Uang Fisik
                      </label>
                      <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold">
                        <option>
                          Otomatis bulatkan ke atas Rp 500 terdekat
                        </option>
                        <option>
                          Otomatis bulatkan ke atas Rp 1.000 terdekat
                        </option>
                        <option>Normal (Sesuai angka mutlak)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PEMBAYARAN */}
              {activeMenu === "PEMBAYARAN" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Manajemen Metode Pembayaran
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {[
                      "TUNAI KASIR (CASH)",
                      "KARTU DEBIT / EDC",
                      "E-WALLET (OVO/GOPAY)",
                      "QRIS PAYMENT",
                      "SPLIT PAYMENT",
                    ].map((method) => (
                      <div
                        key={method}
                        className="flex items-center justify-between p-3.5 border-2 border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-colors"
                      >
                        <span className="text-xs font-black tracking-wider text-slate-700">
                          {method}
                        </span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-5 border-2 border-slate-200 bg-slate-50 rounded-2xl">
                    <h4 className="font-black uppercase text-slate-800 mb-1">
                      Integrasi Payment Gateway (Otomatis)
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 font-medium">
                      Hubungkan POS dengan Midtrans / Xendit untuk verifikasi
                      QRIS otomatis tanpa cek mutasi manual.
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
              )}

              {/* 5. QRIS & REKENING */}
              {activeMenu === "QRIS" && (
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
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold uppercase"
                      />
                    </div>
                    <div className="mt-6 p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl shadow-sm mb-3 flex items-center justify-center">
                        <span className="text-[8px] font-black text-slate-400">
                          QRIS
                        </span>
                      </div>
                      <label className="block text-sm font-black uppercase text-slate-800 mb-1">
                        Upload Barcode QRIS Statis
                      </label>
                      <p className="text-xs text-slate-500 mb-4 max-w-xs">
                        Gambar barcode ini akan dirender di layar *Customer
                        Display* atau di-print pada struk pre-bill.
                      </p>
                      <input
                        type="file"
                        className="text-sm font-bold text-slate-600 bg-white border rounded-lg p-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. LAPORAN */}
              {activeMenu === "LAPORAN" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Ekspor Laporan & Otomatisasi
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                        Periode Render Default
                      </label>
                      <select className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold bg-white">
                        <option>Shift Berjalan (Real-time)</option>
                        <option>Harian (End of Day)</option>
                        <option>Siklus Mingguan</option>
                      </select>
                    </div>
                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                      <h4 className="font-black uppercase text-blue-900 text-sm mb-1">
                        Email Auto-Broadcast Laporan Shift
                      </h4>
                      <p className="text-xs text-blue-700 mb-3">
                        Sistem akan otomatis mengirimkan rekap PDF & Excel ke
                        email saat kasir melakukan aksi Tutup Kas/Shift.
                      </p>
                      <input
                        type="email"
                        placeholder="owner@asstro.com, manajer@asstro.com"
                        className="w-full border border-blue-200 rounded-lg p-3 text-sm font-medium mb-3 bg-white"
                      />
                      <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 accent-blue-600"
                        />{" "}
                        Aktifkan Pengiriman Otomatis Email
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                        Standard Template Ekspor Cepat
                      </label>
                      <div className="flex gap-3">
                        <button className="flex-1 py-3 border-2 border-green-200 bg-green-50 text-green-700 rounded-xl text-sm font-black uppercase hover:bg-green-100 transition-colors">
                          SET TO EXCEL (.XLSX)
                        </button>
                        <button className="flex-1 py-3 border-2 border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-black uppercase hover:bg-red-100 transition-colors">
                          SET TO PDF DOCUMENT
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. KONEKSI & SYNC */}
              {activeMenu === "KONEKSI" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Arsitektur Database & Ledger
                  </h3>

                  <div className="flex items-center justify-between p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-6">
                    <div>
                      <h4 className="font-black text-emerald-900 uppercase text-lg">
                        P2P Network: ONLINE
                      </h4>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        RxDB Sync Active. Node ID: ASSTRO-ND-001
                      </p>
                    </div>
                    <span className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md animate-pulse">
                      CONNECTED
                    </span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
                      <div>
                        <span className="block text-sm font-black text-slate-800 uppercase">
                          CouchDB Central Sync
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Replikasi P2P transaksi ke Server Pusat (Cloud)
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 accent-orange-600"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer">
                      <div>
                        <span className="block text-sm font-black text-slate-800 uppercase">
                          Offline Buffer Mode
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Simpan Event Ledger di IndexedDB saat internet mati
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 accent-orange-600"
                      />
                    </label>
                    <div className="pt-4">
                      <label className="block text-xs font-black tracking-wider uppercase text-slate-500 mb-2">
                        Central Node Endpoint (CouchDB URL)
                      </label>
                      <input
                        type="text"
                        defaultValue="http://localhost:5984/asstro_ledger/"
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-mono font-bold bg-slate-100 text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. KASIR & SHIFT */}
              {activeMenu === "KASIR" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Kontrol Laci & Shift
                  </h3>

                  <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-slate-800 uppercase">
                        Perintah Hardware Cash Drawer
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Kirim sinyal RJ11 ke Printer untuk pop-up laci uang.
                      </p>
                    </div>
                    <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 shadow-md">
                      Pop Drawer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-5 border-2 border-emerald-100 bg-emerald-50 rounded-2xl">
                      <h4 className="font-black text-emerald-800 uppercase mb-4 text-center">
                        Inflow (Kas Masuk)
                      </h4>
                      <input
                        type="number"
                        placeholder="Nominal Rp"
                        className="w-full border border-emerald-200 rounded-xl p-3 text-lg font-black text-center mb-3 bg-white"
                      />
                      <button className="w-full bg-emerald-600 text-white rounded-xl p-3 text-sm font-black uppercase tracking-wider hover:bg-emerald-700 shadow-md">
                        Catat Inflow
                      </button>
                    </div>
                    <div className="p-5 border-2 border-rose-100 bg-rose-50 rounded-2xl">
                      <h4 className="font-black text-rose-800 uppercase mb-4 text-center">
                        Outflow (Kas Keluar)
                      </h4>
                      <input
                        type="number"
                        placeholder="Nominal Rp"
                        className="w-full border border-rose-200 rounded-xl p-3 text-lg font-black text-center mb-3 bg-white"
                      />
                      <button className="w-full bg-rose-600 text-white rounded-xl p-3 text-sm font-black uppercase tracking-wider hover:bg-rose-700 shadow-md">
                        Catat Outflow
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 9. LOG & AUDIT */}
              {activeMenu === "LOG" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-125">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-black uppercase text-slate-800">
                      Security & Audit Trails
                    </h3>
                    <select className="border-2 border-slate-200 rounded-xl p-2 text-xs font-bold uppercase bg-slate-50 outline-none">
                      <option>Tampilkan Semua Jejak</option>
                      <option>Hanya Transaksi Void/Hapus</option>
                      <option>Hanya Login/Logout</option>
                    </select>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto scrollbar-thin bg-slate-50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-200 text-slate-700 sticky top-0 z-10 text-xs uppercase tracking-wider font-black">
                        <tr>
                          <th className="p-3">Waktu (HLC)</th>
                          <th className="p-3">Operator ID</th>
                          <th className="p-3">Tipe Event</th>
                          <th className="p-3">Detail Hash Payload</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-mono text-xs text-slate-500">
                            171630123:0:ND1
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            OP-001 (Kasir Utama)
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold text-[10px] uppercase tracking-wider">
                              SALE_CREATED
                            </span>
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600 truncate max-w-50">
                            INV-171630123 (Rp 150.000)
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-mono text-xs text-slate-500">
                            171620000:1:ND1
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            SPV-AUTH (Manajer)
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-[10px] uppercase tracking-wider">
                              ORDER_VOIDED
                            </span>
                          </td>
                          <td className="p-3 text-xs font-medium text-slate-600 truncate max-w-50">
                            Meja 2 - Nasi Goreng Spesial (Salah Input)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 10. BACKUP & RESTORE */}
              {activeMenu === "BACKUP" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Manajemen File Basis Data
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border-2 border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:border-blue-300 transition-colors">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          ></path>
                        </svg>
                      </div>
                      <h4 className="font-black uppercase text-slate-800 mb-2">
                        Buat Backup Lokal
                      </h4>
                      <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
                        Ekspor snapshot Ledger Dexie DB ke file `.json` untuk
                        pengamanan manual luring (offline).
                      </p>
                      <button className="w-full bg-slate-900 text-white font-black text-xs tracking-widest uppercase py-3 rounded-xl shadow-md hover:bg-slate-800 transition-colors">
                        Download .JSON
                      </button>
                    </div>
                    <div className="border-2 border-slate-200 bg-slate-50 rounded-2xl p-6 text-center hover:border-orange-300 transition-colors">
                      <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          ></path>
                        </svg>
                      </div>
                      <h4 className="font-black uppercase text-slate-800 mb-2">
                        Restore File Basis Data
                      </h4>
                      <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">
                        Timpa basis data lokal saat ini dengan file `.json` yang
                        dipilih.
                      </p>
                      <input
                        type="file"
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-orange-100 file:text-orange-700 mb-3 cursor-pointer"
                      />
                      <button className="w-full bg-orange-600 text-white font-black text-xs tracking-widest uppercase py-3 rounded-xl shadow-md hover:bg-orange-700 transition-colors">
                        Mulai Restore
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 11. SISTEM */}
              {activeMenu === "SISTEM" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase text-slate-800 mb-5 border-b pb-2">
                    Informasi Sistem Inti
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-5 border-b border-slate-100">
                      <div>
                        <h4 className="font-black text-slate-800 uppercase">
                          Pembaruan Kode Sistem (OTA)
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Versi Build Aktif:{" "}
                          <span className="font-mono bg-slate-100 px-1 rounded">
                            v3.0.0-Stable
                          </span>{" "}
                          (PWA Cached)
                        </p>
                      </div>
                      <button className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-sm">
                        Check Update Web-Worker
                      </button>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl text-center text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>

                      <div className="font-black text-2xl uppercase tracking-widest mb-2 relative z-10">
                        Asstro POS <span className="text-orange-500">Core</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed relative z-10">
                        Sistem Kasir Enterprise tersentralisasi yang dirancang
                        khusus untuk memenuhi standar skalabilitas infrastruktur
                        Holding Group Asstro.
                      </p>
                      <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase relative z-10">
                        Arsitektur CQRS/Event-Sourcing Engine | © 2026 Asstro IT
                        Dept.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer Button melayang di sisi kanan bawah Form Area */}
          <div className="absolute bottom-6 right-8">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95">
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
