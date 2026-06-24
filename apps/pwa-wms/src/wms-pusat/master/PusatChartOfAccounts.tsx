import React, { useState, useMemo } from "react";
import { useToast } from "../../shared/components/Toast";
import {
  Landmark,
  ListTree,
  Search,
  Pencil,
  Trash2,
  Save,
  Wallet,
  FolderOpen,
} from "lucide-react";

// --- MOCK DATA ---
const INITIAL_COA = [
  { code: "1000", name: "KAS & BANK", type: "ASSET", parent: null },
  { code: "1101", name: "Kas Outlet Lembang", type: "ASSET", parent: "1000" },
  { code: "1102", name: "Bank BCA Operasional", type: "ASSET", parent: "1000" },
  { code: "2000", name: "LIABILITAS", type: "LIABILITY", parent: null },
  {
    code: "2101",
    name: "Hutang Usaha (Vendor)",
    type: "LIABILITY",
    parent: "2000",
  },
  { code: "4000", name: "PENDAPATAN", type: "REVENUE", parent: null },
  { code: "4101", name: "Penjualan Dine In", type: "REVENUE", parent: "4000" },
  {
    code: "5000",
    name: "BEBAN POKOK PENDAPATAN",
    type: "EXPENSE",
    parent: null,
  },
  {
    code: "5101",
    name: "HPP Makanan & Minuman",
    type: "EXPENSE",
    parent: "5000",
  },
];

const ACCOUNT_TYPES = [
  { id: "ASSET", label: "Aset (Harta)" },
  { id: "LIABILITY", label: "Liabilitas (Hutang)" },
  { id: "EQUITY", label: "Ekuitas (Modal)" },
  { id: "REVENUE", label: "Pendapatan" },
  { id: "EXPENSE", label: "Beban / Biaya" },
];

export const ChartOfAccounts: React.FC = () => {
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState(INITIAL_COA);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [accCode, setAccCode] = useState("");
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("ASSET");
  const [accParent, setAccParent] = useState("");

  const resetForm = () => {
    setAccCode("");
    setAccName("");
    setAccType("ASSET");
    setAccParent("");
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accCode || !accName) {
      showToast("Kode dan Nama Akun wajib diisi!", "ERROR");
      return;
    }

    const payload = {
      code: accCode,
      name: accName.toUpperCase(),
      type: accType,
      parent: accParent || null,
    };

    if (isEditing) {
      setAccounts(accounts.map((a) => (a.code === accCode ? payload : a)));
      showToast("Data COA berhasil diperbarui!", "SUCCESS");
    } else {
      const exists = accounts.some((a) => a.code === accCode);
      if (exists) {
        showToast("Kode Akun sudah digunakan!", "ERROR");
        return;
      }
      setAccounts(
        [...accounts, payload].sort((a, b) => a.code.localeCompare(b.code)),
      );
      showToast("Akun baru berhasil ditambahkan!", "SUCCESS");
    }
    resetForm();
  };

  const handleEditClick = (acc: any) => {
    setAccCode(acc.code);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccParent(acc.parent || "");
    setIsEditing(true);
    showToast("Mode Edit Diaktifkan", "INFO");
  };

  const handleDelete = (code: string) => {
    const isParent = accounts.some((a) => a.parent === code);
    if (isParent) {
      showToast("Gagal! Akun ini memiliki sub-akun (child).", "ERROR");
      return;
    }
    setAccounts(accounts.filter((a) => a.code !== code));
    showToast("Akun berhasil dihapus", "WARNING");
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.code.includes(searchTerm) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [accounts, searchTerm]);

  // Hirarki pembantu untuk dropdown (Hanya akun parent / header yang bisa jadi parent)
  const potentialParents = accounts.filter(
    (a) => a.code.endsWith("00") || a.parent === null,
  );

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <Landmark className="text-sky-600" />
          Chart of Accounts (COA)
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Bagan Akun Standar Akuntansi Keuangan untuk pemetaan jurnal Ledger
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* PANEL KIRI: FORM INPUT */}
        <div className="xl:col-span-1 space-y-6">
          <div
            className={`bg-white border-2 p-5 rounded-2xl shadow-sm transition-all ${isEditing ? "border-amber-400" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pencil
                  className={isEditing ? "text-amber-500" : "text-sky-600"}
                  size={16}
                />
                <span
                  className={`font-black text-xs uppercase tracking-widest ${isEditing ? "text-amber-600" : "text-sky-600"}`}
                >
                  {isEditing ? "Edit Akun" : "Registrasi Akun Baru"}
                </span>
              </div>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Kode Akun *
                </label>
                <input
                  required
                  disabled={isEditing}
                  value={accCode}
                  onChange={(e) =>
                    setAccCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Misal: 1103"
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Nama Akun *
                </label>
                <input
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value.toUpperCase())}
                  placeholder="KAS KECIL..."
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Tipe Akun (Klasifikasi) *
                </label>
                <select
                  required
                  value={accType}
                  onChange={(e) => setAccType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Sub-Akun Dari (Opsional)
                </label>
                <select
                  value={accParent}
                  onChange={(e) => setAccParent(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="">-- JADIKAN AKUN HEADER UTAMA --</option>
                  {potentialParents.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className={`w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${isEditing ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30"}`}
              >
                <Save size={16} />{" "}
                {isEditing ? "Simpan Perubahan" : "Tambahkan Akun"}
              </button>
            </form>
          </div>
        </div>

        {/* PANEL KANAN: LIST COA */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[600px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-4 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ListTree className="text-sky-600" size={20} />
                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">
                  Struktur Bagan Akun
                </span>
              </div>
            </div>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Cari berdasarkan Kode atau Nama Akun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-4">
            <div className="space-y-1">
              {filteredAccounts.length === 0 ? (
                <div className="py-20 text-center">
                  <Wallet size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tidak ada akun ditemukan.
                  </p>
                </div>
              ) : (
                filteredAccounts.map((acc) => {
                  const isHeader =
                    acc.parent === null || acc.code.endsWith("00");
                  return (
                    <div
                      key={acc.code}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all hover:border-sky-200 group ${isHeader ? "bg-slate-100 border-slate-200 mt-3" : "bg-white border-slate-100 ml-6"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHeader ? "bg-slate-200 text-slate-600" : "bg-sky-50 text-sky-600"}`}
                        >
                          {isHeader ? (
                            <FolderOpen size={14} />
                          ) : (
                            <Wallet size={14} />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-black uppercase text-xs tracking-tight ${isHeader ? "text-slate-800" : "text-slate-700"}`}
                          >
                            <span className="text-sky-600 mr-2">
                              {acc.code}
                            </span>{" "}
                            {acc.name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">
                            Tipe: {acc.type}{" "}
                            {acc.parent && `| INDUK: ${acc.parent}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(acc)}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.code)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
