import React, { useState } from "react";
import {
  X,
  Users,
  ToggleRight,
  ShieldAlert,
  Info,
  ArchiveRestore,
} from "lucide-react";
import { useToast } from "../../components/Toast";

interface SidebarStaffManagementProps {
  isStaffOpen: boolean;
  setIsStaffOpen: (open: boolean) => void;
  existingStaffList: any[];
  toggleStaffStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const SidebarStaffManagement = ({
  isStaffOpen,
  setIsStaffOpen,
  existingStaffList,
  toggleStaffStatus,
}: SidebarStaffManagementProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  const isProtected = (role: string) => role?.toLowerCase() === "superadmin";

  const handleToggleClick = async (staff: any) => {
    const newStatus = staff.isActive === false ? true : false;
    await toggleStaffStatus(staff.id, newStatus);
    showToast(
      `Status akses ${staff.name} berhasil di-${newStatus ? "aktifkan" : "nonaktifkan"}`,
      newStatus ? "SUCCESS" : "WARNING",
    );
  };

  const filteredStaff = existingStaffList.filter((s: any) => {
    const isActive = s.isActive !== false;
    return activeTab === "ACTIVE" ? isActive : !isActive;
  });

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/60 z-70 transition-opacity duration-300 ${isStaffOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsStaffOpen(false)}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-80 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col ${isStaffOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 text-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <h3 className="font-black text-xs uppercase tracking-widest">
              Direktori Staf Cabang
            </h3>
          </div>
          <button
            onClick={() => setIsStaffOpen(false)}
            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-sm">
          <div className="flex items-start gap-2 text-[9px] text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
            <Info size={14} className="shrink-0 text-blue-500 mt-0.5" />
            <p>
              Data karyawan disinkronisasi otomatis dari{" "}
              <b>Aplikasi HR Pusat</b>. Perubahan nama, role, atau penambahan
              karyawan baru harus dilakukan melalui dashboard HR.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                Daftar Karyawan Aktif
              </span>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${
                    activeTab === "ACTIVE"
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setActiveTab("ARCHIVED")}
                  className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${
                    activeTab === "ARCHIVED"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Arsip
                </button>
              </div>
            </div>

            <div className="divide-y border-2 border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="p-6 text-center text-slate-300 font-black uppercase text-xs">
                  Tidak Ada Staf di Kategori Ini
                </div>
              ) : (
                filteredStaff.map((s: any) => {
                  const isProtectedStaff = isProtected(s.role);
                  const isActive = s.isActive !== false;

                  return (
                    <div
                      key={s.id || s.pin}
                      className={`p-3.5 flex justify-between items-center text-xs transition-all ${!isActive ? "bg-slate-50" : "hover:bg-slate-50"}`}
                    >
                      <div>
                        <div className="font-black text-slate-900 uppercase flex items-center gap-2 text-sm">
                          <span
                            className={
                              !isActive ? "line-through text-slate-400" : ""
                            }
                          >
                            {s.name}
                          </span>
                          {isProtectedStaff && (
                            <span title="Akun Terlindungi (Super Admin)">
                              <ShieldAlert
                                size={12}
                                className="text-orange-500"
                              />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {s.role}
                          </span>
                          {!isActive && (
                            <span className="text-[8px] font-black text-red-500 uppercase bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <ArchiveRestore size={8} /> ARSIP
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] font-mono text-slate-300 mt-1 uppercase">
                          ID: {s.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isProtectedStaff && (
                          <button
                            type="button"
                            onClick={() => handleToggleClick(s)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isActive ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
                            title={
                              isActive ? "Nonaktifkan Akses" : "Aktifkan Akses"
                            }
                          >
                            <ToggleRight size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
