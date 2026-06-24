import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import { publishEvent } from "../../core/event-publisher";
import {
  Truck,
  Pencil,
  Trash2,
  Search,
  Save,
  Building2,
  User,
  Phone,
  MapPin,
  XCircle,
  Download,
  Landmark,
  FileBadge,
  Link as LinkIcon,
} from "lucide-react";

// URL default untuk kontrak vendor
const DEFAULT_CONTRACT_URL =
  "https://drive.google.com/drive/folders/11d993jB7wcl2PFyHd8lZ8YgV34x_OKvW?usp=sharing";

export const PusatVendorManagement: React.FC = () => {
  const { wmsState, vendors, regions } = useWms();
  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType === "PUSAT";

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [vId, setVId] = useState("");
  const [vName, setVName] = useState("");
  const [vContactPerson, setVContactPerson] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vAddress, setVAddress] = useState("");
  const [vBankName, setVBankName] = useState("");
  const [vBankAccountName, setVBankAccountName] = useState("");
  const [vBankAccountNumber, setVBankAccountNumber] = useState("");
  const [vCertifications, setVCertifications] = useState("");
  const [vContractFileUrl, setVContractFileUrl] =
    useState(DEFAULT_CONTRACT_URL);

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);

  // --- FILTER ISOLASI REGION ---
  const regionalVendors = useMemo(() => {
    return vendors.filter((v) => v.regionId === wmsState?.regionId);
  }, [vendors, wmsState?.regionId]);

  const resetForm = () => {
    setVId("");
    setVName("");
    setVContactPerson("");
    setVPhone("");
    setVAddress("");
    setVBankName("");
    setVBankAccountName("");
    setVBankAccountNumber("");
    setVCertifications("");
    setVContractFileUrl(DEFAULT_CONTRACT_URL);
    setIsEditing(false);
  };

  const handleGenerateId = () => {
    const region = regions.find((r) => r.id === wmsState?.regionId);
    const regionCode = region
      ? region.name.substring(0, 3).toUpperCase()
      : "REG";
    const timestamp = Date.now().toString().slice(-6);
    setVId(`VND/${regionCode}/${timestamp}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vId || !vName) {
      showToast("ID Vendor dan Nama wajib diisi!", "ERROR");
      return;
    }

    const certArray = vCertifications
      ? vCertifications
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c !== "")
      : [];

    const payload = {
      id: vId,
      regionId: wmsState?.regionId || "UNKNOWN",
      name: vName,
      contactPerson: vContactPerson,
      phone: vPhone,
      address: vAddress,
      bankName: vBankName,
      bankAccountName: vBankAccountName,
      bankAccountNumber: vBankAccountNumber,
      certifications: certArray,
      contractFileUrl: vContractFileUrl,
    };

    try {
      if (isEditing) {
        const existing = regionalVendors.find((v) => v.id === vId);
        const updatePayload = {
          ...payload,
          isActive: existing ? existing.isActive : true,
        };

        await publishEvent("VENDOR_UPDATED", vId, updatePayload);
        showToast(
          "Perintah update vendor masuk antrean sinkronisasi!",
          "SUCCESS",
        );
      } else {
        const exists = vendors.some((v) => v.id === vId);
        if (exists) {
          showToast("ID Vendor sudah digunakan!", "ERROR");
          return;
        }

        await publishEvent("VENDOR_CREATED", vId, payload);
        showToast(
          "Perintah tambah vendor masuk antrean sinkronisasi!",
          "SUCCESS",
        );
      }
      resetForm();
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal (RxDB).", "ERROR");
    }
  };

  const handleEditClick = (v: any) => {
    setVId(v.id);
    setVName(v.name);
    setVContactPerson(v.contactPerson || "");
    setVPhone(v.phone || "");
    setVAddress(v.address || "");
    setVBankName(v.bankName || "");
    setVBankAccountName(v.bankAccountName || "");
    setVBankAccountNumber(v.bankAccountNumber || "");
    setVCertifications(v.certifications ? v.certifications.join(", ") : "");
    setVContractFileUrl(v.contractFileUrl || "");
    setIsEditing(true);
  };

  const toggleStatus = async (v: any) => {
    try {
      const payload = { ...v, isActive: !v.isActive };
      await publishEvent("VENDOR_UPDATED", v.id, payload);
      showToast(
        `Perintah ubah status vendor masuk antrean sinkronisasi!`,
        "SUCCESS",
      );
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal (RxDB).", "ERROR");
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await publishEvent("VENDOR_DELETED", id, { id });
      showToast("Perintah hapus vendor masuk antrean sinkronisasi.", "SUCCESS");
      setVendorToDelete(null);
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal (RxDB).", "ERROR");
    }
  };

  const handleExportCsv = () => {
    showToast("Data Vendor diekspor ke CSV", "SUCCESS");
  };

  const filteredVendors = useMemo(() => {
    return regionalVendors.filter((v) => {
      const matchesTab = activeTab === "ACTIVE" ? v.isActive : !v.isActive;
      const matchesSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [regionalVendors, activeTab, searchTerm]);

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* Header & Toolbar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Truck className="text-sky-600" /> Manajemen Vendor & Supplier
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Database Pemasok Lengkap (Info Utama, Finance & Legalitas)
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* PANEL KIRI: FORM VENDOR */}
        <div className="xl:col-span-1 space-y-6">
          <div
            className={`bg-white border-2 p-5 rounded-2xl shadow-sm transition-all ${
              isEditing ? "border-amber-400" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pencil
                  className={isEditing ? "text-amber-500" : "text-sky-600"}
                  size={16}
                />
                <span
                  className={`font-black text-xs uppercase tracking-widest ${
                    isEditing ? "text-amber-600" : "text-sky-600"
                  }`}
                >
                  {isEditing ? "Mode Edit Vendor" : "Input Vendor Baru"}
                </span>
              </div>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1">
                  1. Informasi Utama
                </h4>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      ID Vendor *
                    </label>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={handleGenerateId}
                        className="text-[8px] font-black text-sky-500 hover:text-sky-700 uppercase tracking-widest cursor-pointer"
                      >
                        Auto Generate
                      </button>
                    )}
                  </div>
                  <input
                    required
                    disabled={isEditing}
                    value={vId}
                    onChange={(e) => setVId(e.target.value.toUpperCase())}
                    placeholder="VND/BDG/..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                    <Building2 size={12} /> Nama Perusahaan *
                  </label>
                  <input
                    required
                    value={vName}
                    onChange={(e) => setVName(e.target.value.toUpperCase())}
                    placeholder="PT. / CV. / TOKO..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                      <User size={12} /> Kontak PIC
                    </label>
                    <input
                      value={vContactPerson}
                      onChange={(e) => setVContactPerson(e.target.value)}
                      placeholder="Nama PIC..."
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                      <Phone size={12} /> No. Telp
                    </label>
                    <input
                      type="tel"
                      value={vPhone}
                      onChange={(e) =>
                        setVPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="0812..."
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                    <MapPin size={12} /> Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    value={vAddress}
                    onChange={(e) => setVAddress(e.target.value)}
                    placeholder="Alamat detail..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 flex items-center gap-1">
                  <Landmark size={12} /> 2. Informasi Bank
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Nama Bank
                    </label>
                    <input
                      value={vBankName}
                      onChange={(e) =>
                        setVBankName(e.target.value.toUpperCase())
                      }
                      placeholder="BCA / MANDIRI..."
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      No Rekening
                    </label>
                    <input
                      type="text"
                      value={vBankAccountNumber}
                      onChange={(e) =>
                        setVBankAccountNumber(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="1234567890"
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    value={vBankAccountName}
                    onChange={(e) =>
                      setVBankAccountName(e.target.value.toUpperCase())
                    }
                    placeholder="A.N REKENING..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 flex items-center gap-1">
                  <FileBadge size={12} /> 3. Legalitas & Dokumen
                </h4>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Sertifikasi (Pisahkan dengan koma)
                  </label>
                  <input
                    value={vCertifications}
                    onChange={(e) =>
                      setVCertifications(e.target.value.toUpperCase())
                    }
                    placeholder="HALAL, BPOM, ISO..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                    <LinkIcon size={10} /> URL Kontrak (G-Drive / Cloud)
                  </label>
                  <input
                    type="url"
                    value={vContractFileUrl}
                    onChange={(e) => setVContractFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                    isEditing
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                      : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30"
                  }`}
                >
                  <Save size={16} />{" "}
                  {isEditing ? "Simpan Perubahan" : "Tambahkan Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* PANEL KANAN: DATABASE VENDOR */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[600px]">
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-slate-100 p-1.5 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === "ACTIVE"
                      ? "bg-white text-sky-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Aktif ({regionalVendors.filter((v) => v.isActive).length})
                </button>
                <button
                  onClick={() => setActiveTab("INACTIVE")}
                  className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === "INACTIVE"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Inaktif ({regionalVendors.filter((v) => !v.isActive).length})
                </button>
              </div>
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Cari nama vendor, PIC, atau ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Informasi Vendor</th>
                  <th className="px-5 py-4">Kontak (PIC)</th>
                  <th className="px-5 py-4">Info Keuangan</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Truck
                        size={40}
                        className="mx-auto text-slate-200 mb-3"
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tidak ada vendor ditemukan.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v) => (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        !v.isActive ? "bg-slate-50 opacity-80" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-black uppercase text-xs text-slate-800">
                          {v.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                          ID: {v.id}
                        </p>
                        {v.certifications && v.certifications.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {v.certifications.map(
                              (cert: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="bg-orange-50 text-orange-600 text-[8px] px-1.5 py-0.5 rounded font-black border border-orange-100"
                                >
                                  {cert}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-black text-xs text-slate-700 uppercase block">
                          {v.contactPerson || "-"}
                        </span>
                        <span className="text-[10px] font-bold text-sky-600 block mt-0.5">
                          {v.phone || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[10px] font-bold text-slate-600 uppercase">
                          <span className="block font-black text-slate-800">
                            {v.bankName || "BELUM ADA BANK"}
                          </span>
                          {v.bankAccountNumber && (
                            <span className="block">{v.bankAccountNumber}</span>
                          )}
                          {v.bankAccountName && (
                            <span className="block text-slate-400">
                              A.N {v.bankAccountName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(v)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer ${
                            v.isActive
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                          }`}
                        >
                          {v.isActive ? "Aktif" : "Inaktif"}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {/* Hanya tampilkan tombol aksi jika activeTab === "ACTIVE" */}
                        {activeTab === "ACTIVE" ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(v)}
                              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl cursor-pointer"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setVendorToDelete(v)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          // Saat di tab INACTIVE, tampilkan tanda strip atau kosong
                          <span className="text-[10px] text-slate-400 font-bold">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL HAPUS */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-slide-up border border-slate-200">
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-2">
              Hapus Vendor?
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-6">
              Vendor{" "}
              <span className="font-black text-slate-700">
                {vendorToDelete.name}
              </span>{" "}
              akan dihapus permanen.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setVendorToDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteConfirm(vendorToDelete.id)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs uppercase hover:bg-red-600 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
