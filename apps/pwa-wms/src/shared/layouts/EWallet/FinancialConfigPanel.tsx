import React, { useState, useEffect, useMemo } from "react";
import { useWms } from "@/core/WmsProvider";

export interface FinancialConfig {
  branchId: string;
  taxRate: number;
  serviceRate: number;
  apLimitRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _deleted?: boolean;
}

export const FinancialConfigPanel = () => {
  const { db, currentOperator, branches } = useWms();
  const [configs, setConfigs] = useState<FinancialConfig[]>([]);

  // State Manajemen Form Input
  const [editBranchId, setEditBranchId] = useState<string | null>(null);
  const [outletSearch, setOutletSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [taxRate, setTaxRate] = useState<string>("0");
  const [serviceRate, setServiceRate] = useState<string>("0");
  const [apLimitRate, setApLimitRate] = useState<string>("50");

  // Mendengarkan data perubahan tabel konfigurasi dari RxDB lokal
  useEffect(() => {
    if (!db || !db.wms_financial_configs) return;

    const subscription = db.wms_financial_configs.find().$.subscribe({
      next: (docs) => {
        setConfigs(docs.map((d) => d.toJSON() as FinancialConfig));
      },
    });

    return () => subscription.unsubscribe();
  }, [db]);

  // Filter outlet berdasarkan hak akses operator (Mengecualikan HO/Pusat)
  const availableOutlets = useMemo(() => {
    if (!branches) return [];
    let outlets = branches.filter(
      (b: any) => !b.name.toLowerCase().startsWith("pusat"),
    );

    if (currentOperator) {
      const op = currentOperator as any;
      if (op.branchId) {
        outlets = outlets.filter((b: any) => b.id === op.branchId);
      } else if (op.regionId && !op.branchId) {
        outlets = outlets.filter((b: any) => b.regionId === op.regionId);
      }
    }
    return outlets;
  }, [branches, currentOperator]);

  // Key-value map untuk mempercepat penemuan nama asli cabang berdasarkan ID
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    if (branches) {
      branches.forEach((b: any) => map.set(b.id, b.name));
    }
    return map;
  }, [branches]);

  const handleEdit = (cfg: FinancialConfig) => {
    setEditBranchId(cfg.branchId);
    setSelectedBranch(cfg.branchId);
    const branchName = branchMap.get(cfg.branchId) || cfg.branchId;
    setOutletSearch(branchName);
    setTaxRate(cfg.taxRate.toString());
    setServiceRate(cfg.serviceRate.toString());
    setApLimitRate(cfg.apLimitRate.toString());
  };

  const handleCancelEdit = () => {
    setEditBranchId(null);
    setOutletSearch("");
    setSelectedBranch("");
    setTaxRate("0");
    setServiceRate("0");
    setApLimitRate("50");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (!selectedBranch) {
      alert("Pilih Outlet yang valid dari daftar dropdown.");
      return;
    }

    const docId = selectedBranch;
    let currentCreatedAt = new Date().toISOString();
    let currentIsActive = true;

    if (editBranchId) {
      const existingDoc = await db.wms_financial_configs
        .findOne(editBranchId)
        .exec();
      if (existingDoc) {
        currentCreatedAt = existingDoc.createdAt;
        currentIsActive = existingDoc.isActive;
      }
    }

    const payload = {
      branchId: docId,
      taxRate: Number(taxRate) || 0,
      serviceRate: Number(serviceRate) || 0,
      apLimitRate: Number(apLimitRate) || 0,
      isActive: currentIsActive,
      createdAt: currentCreatedAt,
      updatedAt: new Date().toISOString(),
      _deleted: false,
    };

    try {
      if (editBranchId) {
        const doc = await db.wms_financial_configs.findOne(editBranchId).exec();
        if (doc) await doc.patch(payload);
      } else {
        // Validasi double insert manual di luar mode edit
        const duplicateCheck = await db.wms_financial_configs
          .findOne(docId)
          .exec();
        if (duplicateCheck) {
          alert(
            "Outlet ini sudah memiliki konfigurasi. Gunakan tombol Edit pada tabel kanan.",
          );
          return;
        }
        await db.wms_financial_configs.insert(payload);
      }

      // Catat transaksi perubahan ke outbox sinkronisasi event-driven
      await db.wms_outbox.insert({
        id: crypto.randomUUID(),
        aggregateId: docId,
        type: "WMS_FINANCIAL_CONFIG_UPDATED",
        payload: { ...payload, _operatorId: currentOperator?.id || "SYSTEM" },
        syncStatus: "PENDING",
        createdAt: new Date().toISOString(),
      });

      alert(
        editBranchId
          ? "Konfigurasi Finansial cabang berhasil diperbarui!"
          : "Konfigurasi Finansial cabang berhasil disimpan!",
      );
      handleCancelEdit();
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi:", error);
      alert("Gagal menyimpan data konfigurasi.");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in items-start">
      {/* PANEL KIRI: Form Input Kontrol (Sticky & Compact) */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit sticky top-0 z-10">
        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h3 className="text-sm font-black uppercase text-slate-800">
            {editBranchId ? "Edit Regulasi" : "Config Tax & Limit"}
          </h3>
          {editBranchId && (
            <button
              onClick={handleCancelEdit}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded-md"
            >
              Batal Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Combo Dropdown Auto Complete */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Pilih Outlet / Cabang
            </label>
            <input
              type="text"
              list="config-outlet-list"
              placeholder="KETIK NAMA OUTLET..."
              value={outletSearch}
              disabled={editBranchId !== null}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setOutletSearch(val);
                const found = availableOutlets.find(
                  (b: any) => b.name.toUpperCase() === val,
                );
                setSelectedBranch(found ? found.id : "");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case disabled:opacity-60"
              required
            />
            <datalist id="config-outlet-list">
              {availableOutlets.map((b: any) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </div>

          {/* Input Pajak / PPN */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Persentase Pajak / PPN
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs font-bold text-slate-700 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">
                %
              </span>
            </div>
          </div>

          {/* Input Service Charge */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Service Charge
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={serviceRate}
                onChange={(e) => setServiceRate(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs font-bold text-slate-700 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">
                %
              </span>
            </div>
          </div>

          {/* Input AP Limit Rate */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Batas Plafon Pengajuan Belanja (AP Limit)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={apLimitRate}
                onChange={(e) => setApLimitRate(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs font-bold text-slate-700 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">
                %
              </span>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full font-black py-2 text-xs rounded-lg mt-2 transition-all shadow-sm text-white ${
              editBranchId
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
            }`}
          >
            {editBranchId ? "UPDATE REGULASI" : "SIMPAN CONFIG"}
          </button>
        </form>
      </div>

      {/* PANEL KANAN: Daftar List Tabel Konfigurasi Cabang (Scrollable) */}
      <div className="xl:col-span-2 space-y-4 pb-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Data Aturan Finansial Cabang Terdaftar
            </h4>
          </div>

          <div className="overflow-x-auto">
            {configs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                Belum ada aturan finansial cabang yang dikonfigurasi pusat.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Cabang / Outlet</th>
                    <th className="p-3 text-center">Tax (PPN)</th>
                    <th className="p-3 text-center">Service Charge</th>
                    <th className="p-3 text-center">AP Limit</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {configs.map((cfg) => (
                    <tr
                      key={cfg.branchId}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3 font-bold text-slate-800">
                        {branchMap.get(cfg.branchId) || cfg.branchId}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-700">
                        {cfg.taxRate}%
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-700">
                        {cfg.serviceRate}%
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 bg-emerald-50/40 rounded">
                        {cfg.apLimitRate}%
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleEdit(cfg)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
