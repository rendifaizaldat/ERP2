import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import { publishEvent } from "../../core/event-publisher";
import {
  GitMerge,
  CheckCircle,
  AlertCircle,
  Building2,
  Lock,
  CheckSquare,
  History,
  Undo2,
  Archive,
  Store,
  Link,
  PlusCircle,
} from "lucide-react";

export const PusatProductMergeCenter: React.FC = () => {
  const {
    wmsState,
    currentOperator,
    outletProducts,
    categories,
    masterProducts,
    regions,
    branches,
  } = useWms();
  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType?.toUpperCase() === "PUSAT";
  const userRole = currentOperator?.role?.toUpperCase() || "STAFF";
  const isManagerOrAdmin = userRole === "SUPERADMIN" || userRole === "MANAGER";

  const getRegionName = (regionId: string): string => {
    const region = regions.find((r) => r.id === regionId);
    return region ? region.name : regionId.toUpperCase();
  };

  const getBranchName = (branchId: string): string => {
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.name : branchId.toUpperCase();
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeActionMode, setMergeActionMode] = useState<
    "LINK_EXISTING" | "CREATE_NEW"
  >("LINK_EXISTING");

  const [newMasterName, setNewMasterName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [selectedGlobalId, setSelectedGlobalId] = useState("");
  const [verifiedTab, setVerifiedTab] = useState<"ACTIVE" | "ARCHIVED">(
    "ACTIVE",
  );

  const pendingItems = useMemo(
    () => outletProducts.filter((p) => p.mergeStatus === "UNMERGED"),
    [outletProducts],
  );

  const verifiedItemsActive = useMemo(
    () =>
      outletProducts.filter(
        (p) => p.mergeStatus === "MERGED" && p.status === "ACTIVE",
      ),
    [outletProducts],
  );
  const verifiedItemsArchived = useMemo(
    () =>
      outletProducts.filter(
        (p) => p.mergeStatus === "MERGED" && p.status === "ARCHIVED",
      ),
    [outletProducts],
  );
  const displayVerifiedItems =
    verifiedTab === "ACTIVE" ? verifiedItemsActive : verifiedItemsArchived;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const selectAll = () => {
    setSelectedIds(
      selectedIds.length === pendingItems.length
        ? []
        : pendingItems.map((i) => i.id),
    );
  };

  // 1. Eksekusi Tautkan Ke Existing (Link) - Menggunakan Event Massal
  const executeLinkExisting = async () => {
    if (selectedIds.length === 0) {
      showToast("Pilih minimal 1 item dari antrean!", "ERROR");
      return;
    }
    if (!selectedGlobalId) {
      showToast("Pilih Master Produk tujuan dari dropdown!", "ERROR");
      return;
    }

    try {
      await publishEvent("ITEMS_LINKED_TO_MASTER", crypto.randomUUID(), {
        globalId: selectedGlobalId,
        regionalItemIds: selectedIds,
      });

      showToast(
        `${selectedIds.length} Perintah Tautan Masuk Antrean Sinkronisasi!`,
        "SUCCESS",
      );
      setSelectedIds([]);
      setSelectedGlobalId("");
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal (RxDB).", "ERROR");
    }
  };

  // 2. Eksekusi Buat Master Baru / Verifikasi Massal
  const executeCreateNew = async () => {
    if (selectedIds.length === 0) {
      showToast("Pilih minimal 1 item dari antrean!", "ERROR");
      return;
    }
    if (!newCategoryId) {
      showToast("Pilih kategori untuk standar master ini!", "ERROR");
      return;
    }

    const firstSelectedItem = pendingItems.find((p) => p.id === selectedIds[0]);
    if (!firstSelectedItem) return;

    const isVerificationMode = newMasterName.trim() === "";
    const targetGlobalName = isVerificationMode
      ? firstSelectedItem.localName
      : newMasterName.toUpperCase();
    const targetUom = firstSelectedItem.uom || "PCS";

    try {
      if (isVerificationMode) {
        // Generate mapping globalId langsung di Frontend agar sinkron
        const verifications = selectedIds.map((id) => ({
          regionalItemId: id,
          globalId: `MST-${crypto.randomUUID().slice(0, 8)}`,
        }));

        await publishEvent("ITEMS_BULK_VERIFIED", crypto.randomUUID(), {
          verifications: verifications,
          categoryId: newCategoryId,
        });
      } else {
        // Generate globalId baku untuk batch baru
        const globalId = `MST-${crypto.randomUUID().slice(0, 8)}`;

        await publishEvent("ITEMS_BATCH_CENTRALIZED", globalId, {
          globalId: globalId,
          globalName: targetGlobalName,
          baseUom: targetUom,
          categoryId: newCategoryId,
          regionalItemIds: selectedIds,
        });
      }

      showToast(
        isVerificationMode
          ? `${selectedIds.length} Item (Verifikasi) Masuk Antrean Sinkronisasi!`
          : "Perintah Master Baru Masuk Antrean Sinkronisasi!",
        "SUCCESS",
      );
      setSelectedIds([]);
      setNewMasterName("");
      setNewCategoryId("");
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal.", "ERROR");
    }
  };

  const handleUnMerge = async (regionalItemId: string) => {
    try {
      await publishEvent("ITEM_UNMERGED", regionalItemId, { regionalItemId });
      showToast("Perintah batal validasi masuk ke antrean lokal.", "WARNING");
    } catch (error) {
      showToast("Gagal membatalkan validasi di database lokal.", "ERROR");
    }
  };

  if (!isPusat || !isManagerOrAdmin) {
    return (
      <div className="p-20 text-center bg-white rounded-2xl border border-red-200 shadow-sm mt-10">
        <Lock size={48} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-black uppercase text-slate-800">
          Akses Ditolak
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <GitMerge className="text-emerald-600" /> WMS Merge Center & Audit
        </h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Lakukan verifikasi nama inputan atau satukan (merge) duplikasi data
          sebelum masuk ke pelaporan Owner Dashboard. (Mode Offline-First Aktif)
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-orange-500" size={18} />
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Antrean Input (Wajib)
              </h3>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-600 font-black text-[10px] rounded-lg uppercase tracking-widest">
              {pendingItems.length} Menunggu
            </span>
          </div>

          <div className="overflow-y-auto max-h-[350px]">
            {pendingItems.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle
                  size={32}
                  className="mx-auto text-emerald-400 mb-2"
                />
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Antrean Bersih
                </p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">
                  <tr>
                    <th
                      className="px-4 py-3 cursor-pointer hover:text-emerald-600 w-24"
                      onClick={selectAll}
                    >
                      <div className="flex items-center gap-1">
                        <CheckSquare size={12} /> Pilih
                      </div>
                    </th>
                    <th className="px-4 py-3">Sumber Entitas / Wilayah</th>
                    <th className="px-4 py-3">Nama Inputan Asli</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isArchived = item.status === "ARCHIVED";
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border-2 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}
                          >
                            {isSelected && (
                              <CheckSquare size={12} className="text-white" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {item.branchId ? (
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[8px] font-black uppercase tracking-widest w-max flex items-center gap-1">
                                <Store size={10} /> OUTLET:{" "}
                                {getBranchName(item.branchId)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[8px] font-black uppercase tracking-widest w-max flex items-center gap-1">
                                <Building2 size={10} />{" "}
                                {getRegionName(item.regionId)}
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                              REGION {getRegionName(item.regionId)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-black text-xs uppercase ${isArchived ? "text-slate-400 line-through" : "text-slate-800"}`}
                          >
                            {item.localName}
                          </span>
                          {isArchived && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase tracking-widest">
                              Arsip Lokal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-600 text-xs">
                          Rp {item.purchasePrice.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Tindakan ({selectedIds.length} Terpilih)
              </p>
              <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
                <button
                  onClick={() => setMergeActionMode("LINK_EXISTING")}
                  className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1 ${mergeActionMode === "LINK_EXISTING" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Link size={12} /> Tautkan Existing
                </button>
                <button
                  onClick={() => setMergeActionMode("CREATE_NEW")}
                  className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1 ${mergeActionMode === "CREATE_NEW" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <PlusCircle size={12} /> Buat Master Baru
                </button>
              </div>
            </div>

            {mergeActionMode === "LINK_EXISTING" ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedGlobalId}
                  onChange={(e) => setSelectedGlobalId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- CARI MASTER PRODUK EXISTING --</option>
                  {masterProducts
                    .filter((m) => m.status === "ACTIVE")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.baseUom})
                      </option>
                    ))}
                </select>
                <button
                  onClick={executeLinkExisting}
                  className="w-full sm:w-1/3 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex justify-center items-center gap-2"
                >
                  <Link size={16} /> Tautkan
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="NAMA BAKU (Kosongkan = Verifikasi Nama Asli)"
                    value={newMasterName}
                    onChange={(e) =>
                      setNewMasterName(e.target.value.toUpperCase())
                    }
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  />
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-3 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- KATEGORI --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {newMasterName.trim() === "" ? (
                  <button
                    onClick={executeCreateNew}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <CheckCircle size={16} /> Verifikasi Massal (Keep Nama)
                  </button>
                ) : (
                  <button
                    onClick={executeCreateNew}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <GitMerge size={16} /> Simpan Master Baru (Merge)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-5 border-b border-slate-200 bg-sky-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <History className="text-sky-600" size={18} />
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">
                Data Terverifikasi
              </h3>
            </div>

            <div className="flex bg-white/50 p-1 rounded-xl shadow-sm border border-sky-100">
              <button
                onClick={() => setVerifiedTab("ACTIVE")}
                className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${verifiedTab === "ACTIVE" ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Aktif ({verifiedItemsActive.length})
              </button>
              <button
                onClick={() => setVerifiedTab("ARCHIVED")}
                className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${verifiedTab === "ARCHIVED" ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Arsip ({verifiedItemsArchived.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayVerifiedItems.length === 0 ? (
              <div className="p-10 text-center">
                {verifiedTab === "ACTIVE" ? (
                  <History size={32} className="mx-auto text-slate-300 mb-2" />
                ) : (
                  <Archive size={32} className="mx-auto text-slate-300 mb-2" />
                )}
                <p className="text-xs font-bold text-slate-400 uppercase">
                  {verifiedTab === "ACTIVE"
                    ? "Belum ada data aktif terverifikasi."
                    : "Tidak ada data arsip."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3">Sumber Asal Data</th>
                    <th className="px-4 py-3">Nama Baku Terverifikasi</th>
                    <th className="px-4 py-3 text-right">Hrg Asli</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayVerifiedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide">
                            {item.branchId
                              ? `🏪 OUTLET: ${getBranchName(item.branchId)}`
                              : `🏢 ${getRegionName(item.regionId)}`}
                          </span>
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            REGION {getRegionName(item.regionId)} | UOM:{" "}
                            {item.uom}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-black text-xs uppercase block ${verifiedTab === "ARCHIVED" ? "text-slate-400" : "text-sky-700"}`}
                        >
                          {item.localName}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 font-mono mt-0.5">
                          ID: {item.globalId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-700 text-xs">
                        Rp {item.purchasePrice.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleUnMerge(item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mx-auto block"
                          title="Un-Merge / Batal Verifikasi"
                        >
                          <Undo2 size={14} />
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
