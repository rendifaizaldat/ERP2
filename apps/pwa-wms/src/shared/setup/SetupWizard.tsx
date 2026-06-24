import React, { useState, useMemo } from "react";
import { useToast } from "../components/Toast";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MonitorSmartphone,
  Loader2,
  PlusCircle,
  RefreshCw,
  Warehouse,
  Network,
  Store,
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Region {
  id: string;
  name: string;
  branches: Branch[];
}

interface Device {
  id: string;
  name: string;
  status: string;
}

export const SetupWizard: React.FC = () => {
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form State Step 1: Otorisasi
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form State Step 2: Tipe WMS & Wilayah
  const [wmsType, setWmsType] = useState<"PUSAT" | "OUTLET">("PUSAT");
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Form State Step 3: Identitas Mesin
  const [devices, setDevices] = useState<Device[]>([]);
  const [provisionMode, setProvisionMode] = useState<"NEW" | "RECOVERY">("NEW");
  const [deviceName, setDeviceName] = useState("");
  const [replaceDeviceId, setReplaceDeviceId] = useState("");

  // ==========================================
  // LOGIC: Derivasi Target Branch ID
  // ==========================================
  // Sistem akan secara otomatis mencari ID cabang jika mode-nya adalah PUSAT.
  const targetBranchId = useMemo(() => {
    if (!selectedRegionId) return "";

    if (wmsType === "OUTLET") {
      return selectedBranchId;
    }

    // Jika mode PUSAT, cari branch di region ini yang namanya merepresentasikan pusat
    const region = regions.find((r) => r.id === selectedRegionId);
    if (!region) return "";

    const expectedPusatName = `pusat-${region.name.toLowerCase()}`;

    // Cari kecocokan exact name, atau yang mengandung kata "pusat" sebagai fallback
    const pusatBranch = region.branches.find(
      (b) =>
        b.name.toLowerCase() === expectedPusatName ||
        b.name.toLowerCase().includes("pusat"),
    );

    return pusatBranch ? pusatBranch.id : "";
  }, [wmsType, selectedRegionId, selectedBranchId, regions]);

  // ==========================================
  // LOGIC: Step 1 (Login Otorisasi Pusat)
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:4000/api/provision/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Otorisasi ditolak.");

      setRegions(data.regions || []);
      setStep(2);
    } catch (err: any) {
      showToast(err.message, "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIC: Prepare Step 3 (Fetch existing devices)
  // ==========================================
  const prepareStep3 = async () => {
    if (wmsType === "PUSAT" && !selectedRegionId) {
      showToast("Silakan pilih region untuk WMS Pusat.", "WARNING");
      return;
    }
    if (wmsType === "OUTLET" && (!selectedRegionId || !selectedBranchId)) {
      showToast("Silakan pilih region dan outlet untuk WMS Outlet.", "WARNING");
      return;
    }

    if (!targetBranchId) {
      showToast(
        wmsType === "PUSAT"
          ? "Gagal menemukan data Gudang Pusat di Region ini. Pastikan outlet pusat sudah didaftarkan."
          : "ID Outlet tidak valid.",
        "ERROR",
      );
      return;
    }

    setIsLoading(true);
    try {
      // Endpoint yang digunakan sama persis dengan backend POS
      const response = await fetch(
        `http://localhost:4000/api/provision/branch-devices/${targetBranchId}`,
      );
      const data = await response.json();

      if (response.ok) {
        setDevices(data.devices || []);
      }
      setStep(3);
    } catch (err) {
      showToast("Gagal memeriksa daftar mesin di wilayah ini.", "ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIC: Final Submit & Hydration ke LocalStorage
  // ==========================================
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (provisionMode === "NEW" && !deviceName.trim()) {
      showToast("Nama perangkat baru wajib diisi.", "ERROR");
      return;
    }
    if (provisionMode === "RECOVERY" && !replaceDeviceId) {
      showToast("Silakan pilih perangkat yang ingin dipulihkan.", "ERROR");
      return;
    }
    if (!targetBranchId) {
      showToast(
        "Integritas data cabang hilang. Silakan ulangi langkah sebelumnya.",
        "ERROR",
      );
      return;
    }

    setIsLoading(true);
    try {
      // Struktur payload sama persis dengan backend Anda
      const payload = {
        branchId: targetBranchId,
        name: provisionMode === "NEW" ? deviceName.trim().toUpperCase() : "",
        replaceDeviceId: provisionMode === "RECOVERY" ? replaceDeviceId : null,
        lat: 0, // Koordinat default untuk WMS PC
        lng: 0,
      };

      const provisionResponse = await fetch(
        "http://localhost:4000/api/provision/device",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const provisionData = await provisionResponse.json();

      if (!provisionResponse.ok) {
        throw new Error(provisionData.error || "Gagal meregistrasi WMS Engine");
      }

      // Simpan kredensial dasar ke LocalStorage
      localStorage.setItem("ASSTRO_DEVICE_TOKEN", provisionData.deviceToken);
      localStorage.setItem("ASSTRO_DEVICE_ID", provisionData.deviceId);
      localStorage.setItem("ASSTRO_WMS_TYPE", wmsType);
      localStorage.setItem("ASSTRO_REGION_ID", selectedRegionId);
      localStorage.setItem("ASSTRO_BRANCH_ID", targetBranchId);

      setStep(4);

      // HYDRATION LOKAL MURNI
      const syncResponse = await fetch(
        `http://localhost:4000/api/sync/hydrate${
          provisionMode === "RECOVERY" && replaceDeviceId
            ? `?replaceDeviceId=${replaceDeviceId}`
            : ""
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provisionData.deviceToken}`,
          },
        },
      );

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncData.error || "Gagal mengunduh data master pusat");
      }

      // Dump data master penting ke LocalStorage untuk fallback / online cache
      localStorage.setItem(
        "WMS_MASTER_STAFF",
        JSON.stringify(syncData.data.staff || []),
      );
      localStorage.setItem(
        "WMS_MASTER_CATEGORIES",
        JSON.stringify(syncData.data.categories || []),
      );
      localStorage.setItem(
        "WMS_MASTER_PRODUCTS",
        JSON.stringify(syncData.data.products || []),
      );

      showToast("Sinkronisasi WMS Berhasil!", "SUCCESS");

      // Reload agar masuk ke halaman utama aplikasi WMS
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast(err.message, "ERROR");
      setIsLoading(false);
      localStorage.removeItem("ASSTRO_DEVICE_TOKEN");
      setStep(3);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-slate-100 select-none font-sans p-6">
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="w-full max-w-xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-8 md:p-12 animate-in fade-in zoom-in-95 duration-300 min-h-[580px] max-h-[85vh] overflow-auto">
          {/* Header Setup */}
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-sky-600 text-white w-14 h-14 flex items-center justify-center rounded-2xl font-black italic text-xl shadow-lg shadow-sky-700/20">
              AS
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tighter uppercase leading-none text-slate-900">
                WMS <span className="text-sky-600">Engine</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1 block">
                Warehouse Activation Wizard
              </span>
            </div>
          </div>

          {/* Progress Bar Indicators */}
          {step < 4 && (
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    step >= s ? "bg-sky-600" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          )}

          {/* STEP 1: LOGIN */}
          {step === 1 && (
            <form
              onSubmit={handleLogin}
              className="flex-1 flex flex-col justify-start animate-in fade-in slide-in-from-right-4"
            >
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <ShieldCheck size={20} className="text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 1: Otorisasi Pusat
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Email Administrator
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin.wms@asstro.com"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verifikasi Identitas"
                  )}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: TIPE WMS & LOKASI */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-start animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <Warehouse size={20} className="text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 2: Penempatan WMS
                </h3>
              </div>
              <div className="space-y-4">
                {/* Tipe WMS Selection */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div
                    onClick={() => {
                      setWmsType("PUSAT");
                      setSelectedBranchId("");
                    }}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      wmsType === "PUSAT"
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <Network
                      size={24}
                      className={
                        wmsType === "PUSAT" ? "text-sky-500" : "text-slate-400"
                      }
                    />
                    <span className="font-black text-[10px] uppercase tracking-wider">
                      Gudang Pusat
                    </span>
                  </div>
                  <div
                    onClick={() => setWmsType("OUTLET")}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      wmsType === "OUTLET"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <Store
                      size={24}
                      className={
                        wmsType === "OUTLET"
                          ? "text-emerald-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-black text-[10px] uppercase tracking-wider">
                      Gudang Outlet
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Pilih Region (Wilayah)
                  </label>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => {
                      setSelectedRegionId(e.target.value);
                      setSelectedBranchId("");
                    }}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-sky-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      -- PILIH REGION --
                    </option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indikator Gudang Pusat Terdeteksi (Hanya jika mode PUSAT) */}
                {wmsType === "PUSAT" && selectedRegionId && (
                  <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${targetBranchId ? "bg-sky-500 animate-pulse" : "bg-red-500"}`}
                    ></div>
                    <span className="text-xs font-bold tracking-tight text-sky-800">
                      {targetBranchId
                        ? "Gudang Pusat terdeteksi di database."
                        : "Gudang Pusat belum terdaftar."}
                    </span>
                  </div>
                )}

                {/* Branch Selection (Hanya jika WMS OUTLET) */}
                {wmsType === "OUTLET" && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Pilih Outlet (Cabang)
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      disabled={!selectedRegionId}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="" disabled>
                        -- PILIH OUTLET --
                      </option>
                      {selectedRegionId &&
                        regions
                          .find((r) => r.id === selectedRegionId)
                          ?.branches.filter(
                            (b) => !b.name.toLowerCase().includes("pusat"),
                          ) // Jangan tampilkan gudang pusat di list outlet
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              [{b.code}] {b.name}
                            </option>
                          ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: DEVICE RECOVERY / NEW */}
          {step === 3 && (
            <form
              onSubmit={handleFinalSubmit}
              className="flex-1 flex flex-col justify-start animate-in fade-in slide-in-from-right-4"
            >
              <div className="flex items-center gap-3 mb-4 text-slate-400">
                <MonitorSmartphone size={20} className="text-sky-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">
                  Langkah 3: Registrasi Mesin WMS
                </h3>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setProvisionMode("NEW")}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "NEW"
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <PlusCircle
                      size={24}
                      className={
                        provisionMode === "NEW"
                          ? "text-sky-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-black text-[10px] uppercase tracking-wider">
                      A. Setup
                      <br />
                      Mesin Baru
                    </span>
                  </div>
                  <div
                    onClick={() => setProvisionMode("RECOVERY")}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center ${
                      provisionMode === "RECOVERY"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <RefreshCw
                      size={24}
                      className={
                        provisionMode === "RECOVERY"
                          ? "text-amber-500"
                          : "text-slate-400"
                      }
                    />
                    <span className="font-black text-[10px] uppercase tracking-wider">
                      B. Recovery
                      <br />
                      Mesin Lama
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {provisionMode === "NEW" ? (
                    <div className="animate-in fade-in">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Nama PC / Terminal Baru
                      </label>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="Contoh: PC-GUDANG-01"
                        required={provisionMode === "NEW"}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="animate-in fade-in">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Pilih Mesin Yang Akan Dipulihkan
                      </label>
                      <select
                        required={provisionMode === "RECOVERY"}
                        value={replaceDeviceId}
                        onChange={(e) => setReplaceDeviceId(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-sm font-bold tracking-tight uppercase focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>
                          -- DAFTAR MESIN WMS --
                        </option>
                        {devices.length === 0 ? (
                          <option disabled>Tidak ada mesin terdaftar.</option>
                        ) : (
                          devices.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.status})
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-[9px] font-bold text-amber-600 mt-2 uppercase tracking-widest">
                        ⚠️ Sesi mesin lama akan diambil alih oleh perangkat ini.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full mt-4 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
                    provisionMode === "NEW"
                      ? "bg-sky-600 hover:bg-slate-900"
                      : "bg-amber-600 hover:bg-slate-900"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : provisionMode === "NEW" ? (
                    "Daftarkan Mesin WMS"
                  ) : (
                    "Pulihkan Akses Mesin"
                  )}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: HYDRATION LOADING */}
          {step === 4 && (
            <div className="flex-1 flex flex-col justify-start text-center py-12 animate-in zoom-in-95">
              <Network className="w-20 h-20 text-sky-600 mx-auto mb-6 animate-pulse" />
              <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
                Sinkronisasi Server...
              </h2>
              <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">
                Menarik data master inventori, struktur gudang, dan otorisasi
                operasional ke memori lokal.
              </p>
            </div>
          )}

          {/* Navigation Buttons for Step 2 */}
          {step === 2 && (
            <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
              <button
                type="button"
                onClick={prepareStep3}
                className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg flex items-center gap-2"
              >
                Lanjut <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
