import React, { useState, useMemo } from "react";
import { useWms } from "@/core/WmsProvider";

const POS_PAYMENT_METHODS = [
  "CASH",
  "DEBIT_BCA",
  "DEBIT_MANDIRI",
  "DEBIT_BNI",
  "DEBIT_BRI",
  "DEBIT_ETC",
  "QRIS",
  "TRANSFER",
  "DEPOSIT",
  "PRIVE",
];

export const AccountRegistrationTab = () => {
  const { db, currentOperator, branches, regions, walletAccounts } = useWms();

  // Toggle aktif/arsip per grup
  const [groupView, setGroupView] = useState<
    Record<string, "ACTIVE" | "ARCHIVED">
  >({});

  const getGroupView = (key: string) => groupView[key] || "ACTIVE";

  const setGroupViewStatus = (key: string, status: "ACTIVE" | "ARCHIVED") => {
    setGroupView((prev) => ({ ...prev, [key]: status }));
  };

  // State untuk Modal Binding POS
  const [bindingModalData, setBindingModalData] = useState<{
    id: string;
    accountName: string;
    bindings: string[];
  } | null>(null);

  // Filter outlet berdasarkan otoritas operator
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

  // Filter region berdasarkan otoritas operator
  const availableRegions = useMemo(() => {
    if (!regions) return [];
    if (!currentOperator) return regions;
    const op = currentOperator as any;
    if (op.regionId && !op.branchId) {
      return regions.filter((r: any) => r.id === op.regionId);
    }
    return regions;
  }, [regions, currentOperator]);

  // Filter akun berdasarkan otoritas operator
  const accountsByOperator = useMemo(() => {
    if (!walletAccounts) return [];
    if (!currentOperator) return walletAccounts;
    const op = currentOperator as any;
    if (op.branchId) {
      return walletAccounts.filter((acc: any) => acc.branchId === op.branchId);
    }
    if (op.regionId && !op.branchId) {
      return walletAccounts.filter(
        (acc: any) =>
          acc.regionId === op.regionId &&
          (acc.managedBy === "REGION" || acc.managedBy === "OUTLET"),
      );
    }
    return walletAccounts;
  }, [walletAccounts, currentOperator]);

  // Kelompokkan akun dan pisahkan aktif/arsip per grup
  const groupedAccounts = useMemo(() => {
    const result: Record<string, { active: any[]; archived: any[] }> = {};
    for (const acc of accountsByOperator) {
      const key = acc.managedBy || "OTHER";
      if (!result[key]) result[key] = { active: [], archived: [] };
      if (acc.isActive) {
        result[key].active.push(acc);
      } else {
        result[key].archived.push(acc);
      }
    }
    return result;
  }, [accountsByOperator]);

  const groupOrder = ["OUTLET", "REGION", "HO", "OWNER", "OTHER"];

  // State Form
  const [editId, setEditId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [selectedCardType, setSelectedCardType] = useState("Payment Card");
  const [ownership, setOwnership] = useState("OUTLET");
  const [outletSearch, setOutletSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [customOwnerName, setCustomOwnerName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  const [cardTypes, setCardTypes] = useState<string[]>([
    "Payment Card",
    "Deposit Card",
    "Payroll Card",
  ]);
  const [newCardType, setNewCardType] = useState("");
  const [isAddingCardType, setIsAddingCardType] = useState(false);

  const handleAddCardType = () => {
    if (newCardType.trim() && !cardTypes.includes(newCardType.trim())) {
      setCardTypes([...cardTypes, newCardType.trim()]);
      setSelectedCardType(newCardType.trim());
    }
    setNewCardType("");
    setIsAddingCardType(false);
  };

  const handleEdit = (acc: any) => {
    setEditId(acc.id);
    setOwnership(acc.managedBy);
    setSelectedCardType(acc.type);
    setBankName(acc.bankName || "");
    setAccountNumber(acc.accountNumber || "");
    setAccountHolder(acc.accountHolder || "");

    if (acc.managedBy === "OUTLET") {
      setSelectedBranch(acc.branchId);
      const branchObj = availableOutlets.find(
        (b: any) => b.id === acc.branchId,
      );
      setOutletSearch(branchObj?.name || "");
    } else if (acc.managedBy === "REGION") {
      setSelectedRegion(acc.regionId);
    } else {
      const match = acc.accountName.match(/\(([^)]+)\)$/);
      setCustomOwnerName(match ? match[1] : "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setBankName("");
    setAccountNumber("");
    setAccountHolder("");
    setCustomOwnerName("");
    setOutletSearch("");
    setSelectedBranch("");
    setOwnership("OUTLET");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    let finalRegionId = "HO";
    let finalBranchId = "HO";
    let finalAccountName = "";

    if (ownership === "OUTLET") {
      if (!selectedBranch)
        return alert("Pilih Outlet yang valid dari daftar dropdown.");
      finalBranchId = selectedBranch;
      const branchObj = availableOutlets.find(
        (b: any) => b.id === selectedBranch,
      );
      finalRegionId = branchObj?.regionId || "UNKNOWN_REGION";
      finalAccountName = `${selectedCardType} - ${bankName} (${branchObj?.name || "Outlet"})`;
    } else if (ownership === "REGION") {
      if (!selectedRegion) return alert("Pilih Region yang valid.");
      finalRegionId = selectedRegion;
      finalBranchId = "Head_Office";
      const regionObj = availableRegions.find(
        (r: any) => r.id === selectedRegion,
      );
      finalAccountName = `${selectedCardType} - ${bankName} (${regionObj?.name || "Region"})`;
    } else {
      finalRegionId = "HO";
      finalBranchId = "HO";
      finalAccountName = `${selectedCardType} - ${bankName} (${customOwnerName || ownership})`;
    }

    const docId = editId || crypto.randomUUID();
    let currentCreatedAt = new Date().toISOString();
    let currentDeletedAt = null;
    let currentIsActive = true;
    let currentBinding: string[] = []; // Preservasi binding

    if (editId) {
      const existingDoc = await db.wms_wallet_accounts.findOne(editId).exec();
      if (existingDoc) {
        currentCreatedAt = existingDoc.createdAt;
        currentDeletedAt = existingDoc.deletedAt || null;
        currentIsActive = existingDoc.isActive;
        currentBinding = existingDoc.binding || [];
      }
    }

    const payload = {
      id: docId,
      regionId: finalRegionId,
      branchId: finalBranchId,
      managedBy: ownership,
      type: selectedCardType,
      bankName: bankName,
      accountNumber: accountNumber,
      accountHolder: accountHolder,
      accountName: finalAccountName,
      binding: currentBinding, // Simpan binding yang sudah ada
      isActive: currentIsActive,
      createdAt: currentCreatedAt,
      updatedAt: new Date().toISOString(),
      deletedAt: currentDeletedAt,
      _deleted: false,
    };

    try {
      if (editId) {
        const doc = await db.wms_wallet_accounts.findOne(editId).exec();
        if (doc) await doc.patch(payload);
      } else {
        await db.wms_wallet_accounts.insert(payload);
      }
      await db.wms_outbox.insert({
        id: crypto.randomUUID(),
        aggregateId: docId,
        type: "WMS_WALLET_ACCOUNT_CREATED",
        payload: { ...payload, _operatorId: currentOperator?.id || "SYSTEM" },
        syncStatus: "PENDING",
        createdAt: new Date().toISOString(),
      });
      alert(
        editId
          ? "Akun Rekening berhasil diperbarui!"
          : "Akun Rekening berhasil didaftarkan!",
      );
      handleCancelEdit();
    } catch (error) {
      console.error("Gagal menyimpan akun:", error);
      alert("Gagal menyimpan data akun.");
    }
  };

  const toggleArchiveStatus = async (docId: string, toArchive: boolean) => {
    if (!db) return;
    const msg = toArchive
      ? "Yakin ingin mengarsipkan rekening ini?"
      : "Yakin ingin memulihkan (Restore) rekening ini?";
    if (!window.confirm(msg)) return;

    try {
      const doc = await db.wms_wallet_accounts.findOne(docId).exec();
      if (doc) {
        await doc.patch({
          isActive: !toArchive,
          deletedAt: toArchive ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        });

        const eventType = toArchive
          ? "WMS_WALLET_ACCOUNT_DELETED"
          : "WMS_WALLET_ACCOUNT_CREATED";

        await db.wms_outbox.insert({
          id: crypto.randomUUID(),
          aggregateId: docId,
          type: eventType,
          payload: toArchive
            ? { id: docId, _operatorId: currentOperator?.id || "SYSTEM" }
            : {
                ...doc.toJSON(),
                isActive: true,
                deletedAt: null,
                updatedAt: new Date().toISOString(),
              },
          syncStatus: "PENDING",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Gagal ubah status arsip:", error);
    }
  };

  // Fungsi Save Modal Binding
  const handleSaveBinding = async () => {
    if (!db || !bindingModalData) return;
    try {
      const doc = await db.wms_wallet_accounts
        .findOne(bindingModalData.id)
        .exec();
      if (doc) {
        const payload = {
          ...doc.toJSON(),
          binding: bindingModalData.bindings,
          updatedAt: new Date().toISOString(),
        };

        await doc.patch({
          binding: bindingModalData.bindings,
          updatedAt: payload.updatedAt,
        });

        await db.wms_outbox.insert({
          id: crypto.randomUUID(),
          aggregateId: bindingModalData.id,
          type: "WMS_WALLET_ACCOUNT_CREATED", // Memicu upsert di backend
          payload: { ...payload, _operatorId: currentOperator?.id || "SYSTEM" },
          syncStatus: "PENDING",
          createdAt: new Date().toISOString(),
        });

        alert("Binding metode POS berhasil disimpan!");
      }
    } catch (error) {
      console.error("Gagal menyimpan binding:", error);
    } finally {
      setBindingModalData(null);
    }
  };

  // Komponen kecil untuk satu grup (List Kanan)
  const GroupSection = ({
    groupKey,
    data,
  }: {
    groupKey: string;
    data: { active: any[]; archived: any[] };
  }) => {
    const currentView = getGroupView(groupKey);
    const items = currentView === "ACTIVE" ? data.active : data.archived;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${currentView === "ACTIVE" ? "bg-blue-500" : "bg-slate-500"}`}
            ></span>
            Grup: {groupKey}
          </h4>
          <div className="flex gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setGroupViewStatus(groupKey, "ACTIVE")}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                currentView === "ACTIVE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Aktif ({data.active.length})
            </button>
            <button
              onClick={() => setGroupViewStatus(groupKey, "ARCHIVED")}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                currentView === "ARCHIVED"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Arsip ({data.archived.length})
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">
              Tidak ada akun {currentView === "ACTIVE" ? "aktif" : "diarsipkan"}{" "}
              di grup ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Jenis & Alias</th>
                  <th className="p-3">Bank, Rekening & Binding POS</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((acc: any) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3 align-top">
                      <p
                        className={`font-bold text-xs ${!acc.isActive ? "text-slate-500 line-through" : "text-slate-800"}`}
                      >
                        {acc.accountName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {acc.type}
                      </p>
                    </td>
                    <td className="p-3 align-top">
                      <p className="font-black text-xs text-slate-700">
                        {acc.bankName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {acc.accountNumber || "N/A"} - a.n {acc.accountHolder}
                      </p>
                      {/* Render Badge Binding POS */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {acc.binding && acc.binding.length > 0 ? (
                          acc.binding.map((b: string) => (
                            <span
                              key={b}
                              className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
                            >
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            Belum ada binding POS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {acc.isActive ? (
                          <>
                            {/* Tombol Lihat Histori / Mutasi Ledger */}
                            <button
                              onClick={() =>
                                alert(
                                  "Fitur histori mutasi Ledger sedang dalam tahap pengembangan (Fase 3).",
                                )
                              }
                              className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
                              title="Lihat Histori Mutasi"
                            >
                              👁️ Histori
                            </button>

                            {/* Tombol Binding POS */}
                            <button
                              onClick={() =>
                                setBindingModalData({
                                  id: acc.id,
                                  accountName: acc.accountName,
                                  bindings: acc.binding || [],
                                })
                              }
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            >
                              🔗 Bind
                            </button>

                            <button
                              onClick={() => handleEdit(acc)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleArchiveStatus(acc.id, true)}
                              className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-md hover:bg-red-100 transition-colors"
                            >
                              Arsip
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toggleArchiveStatus(acc.id, false)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md hover:bg-emerald-100 transition-colors"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in items-start relative">
      {/* KIRI: Form Input (Fixed & Compact dengan Sticky Top) */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit sticky top-0 z-10">
        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h3 className="text-sm font-black uppercase text-slate-800">
            {editId ? "Edit Rekening" : "Registrasi Akun"}
          </h3>
          {editId && (
            <button
              onClick={handleCancelEdit}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded-md"
            >
              Batal Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Kepemilikan
            </label>
            <select
              value={ownership}
              onChange={(e) => setOwnership(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="OUTLET">Outlet / Cabang</option>
              <option value="REGION">Regional</option>
              <option value="HO">Head Office (HO)</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          {ownership === "OUTLET" && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                Pilih Outlet
              </label>
              <input
                type="text"
                list="outlet-list"
                placeholder="KETIK NAMA OUTLET..."
                value={outletSearch}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setOutletSearch(val);
                  const found = availableOutlets.find(
                    (b: any) => b.name.toUpperCase() === val,
                  );
                  setSelectedBranch(found ? found.id : "");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
                required
              />
              <datalist id="outlet-list">
                {availableOutlets.map((b: any) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>
          )}

          {ownership === "REGION" && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                Pilih Region
              </label>
              <select
                required
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="">-- Pilih Region --</option>
                {availableRegions.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(ownership === "HO" || ownership === "OWNER") && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                Nama Spesifik (Opsional)
              </label>
              <input
                type="text"
                value={customOwnerName}
                onChange={(e) =>
                  setCustomOwnerName(e.target.value.toUpperCase())
                }
                placeholder="MISAL: FINANCE PUSAT"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
              />
            </div>
          )}

          <div className="pt-1">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Jenis Kartu / Akun
            </label>
            {!isAddingCardType ? (
              <div className="flex gap-2">
                <select
                  value={selectedCardType}
                  onChange={(e) => setSelectedCardType(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                >
                  {cardTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingCardType(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 rounded-lg font-bold text-xs"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCardType}
                  onChange={(e) => setNewCardType(e.target.value.toUpperCase())}
                  placeholder="KETIK BARU..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCardType}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-bold text-[10px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCardType(false)}
                  className="bg-red-100 hover:bg-red-200 text-red-600 px-3 rounded-lg font-bold text-[10px]"
                >
                  X
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Nama Bank
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value.toUpperCase())}
              placeholder="BCA / MANDIRI / KAS TUNAI"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Nomor Rekening
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.toUpperCase())}
              placeholder="1234567890"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Atas Nama Pemilik
            </label>
            <input
              type="text"
              required
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
              placeholder="SESUAI BUKU TABUNGAN"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none uppercase placeholder:normal-case"
            />
          </div>

          <button
            type="submit"
            className={`w-full font-black py-2 text-xs rounded-lg mt-3 transition-all shadow-sm text-white ${
              editId
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
            }`}
          >
            {editId ? "UPDATE AKUN" : "SIMPAN AKUN"}
          </button>
        </form>
      </div>

      {/* KANAN: Daftar Grup (Bisa Di-Scroll) */}
      <div className="xl:col-span-2 space-y-4 pb-12">
        {groupOrder.map((key) => {
          const data = groupedAccounts[key];
          if (!data || (data.active.length === 0 && data.archived.length === 0))
            return null;
          return <GroupSection key={key} groupKey={key} data={data} />;
        })}

        {Object.keys(groupedAccounts).length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 font-bold text-sm">
            Belum ada data rekening.
          </div>
        )}
      </div>

      {/* OVERLAY MODAL BINDING POS */}
      {bindingModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                🔗 Binding Metode POS
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Pilih metode bayar mesin kasir yang dananya akan otomatis masuk
                ke:
                <br />
                <span className="font-bold text-indigo-600">
                  {bindingModalData.accountName}
                </span>
              </p>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-3">
                {POS_PAYMENT_METHODS.map((method) => {
                  const isChecked = bindingModalData.bindings.includes(method);
                  return (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isChecked
                          ? "border-indigo-600 bg-indigo-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newBindings = e.target.checked
                            ? [...bindingModalData.bindings, method]
                            : bindingModalData.bindings.filter(
                                (b) => b !== method,
                              );
                          setBindingModalData({
                            ...bindingModalData,
                            bindings: newBindings,
                          });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span
                        className={`text-sm font-black ${isChecked ? "text-indigo-900" : "text-slate-600"}`}
                      >
                        {method}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setBindingModalData(null)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBinding}
                className="px-6 py-2 rounded-xl text-sm font-black text-white bg-indigo-600 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors"
              >
                Simpan Binding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
