import React, { useState } from "react";
import { useWms } from "@/core/WmsProvider";
import { FinancialConfigPanel } from "./EWallet/FinancialConfigPanel";
import { AccountRegistrationTab } from "./EWallet/AccountRegistrationTab";
import { DashboardPosTab } from "./EWallet/DashboardPosTab";
import { useDashboardPosSync } from "@/core/useDashboardPosSync";

export const EWallet = () => {
  const { wmsState } = useWms();
  const isPusat = wmsState?.wmsType === "PUSAT";

  // Memanggil hook sinkronisasi data POS secara asinkron
  // Setiap menu EWallet dibuka, WMS akan memastikan data invoice POS terbaru ditarik
  useDashboardPosSync();

  // Tab State Management
  const [activeTab, setActiveTab] = useState<
    "REGISTER_AKUN" | "CONFIG_TAX" | "DASHBOARD_POS"
  >(isPusat ? "DASHBOARD_POS" : "CONFIG_TAX");

  // Komponen Tombol Tab (diperkecil padding)
  const TabButton = ({
    id,
    label,
  }: {
    id: "REGISTER_AKUN" | "CONFIG_TAX" | "DASHBOARD_POS";
    label: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-2 font-bold text-xs rounded-t-xl border-b-2 transition-all ${
        activeTab === id
          ? "border-blue-600 text-blue-700 bg-blue-50"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto p-4 space-y-4 animate-fade-in overflow-hidden">
      {/* HEADER FIXED */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="p-4 pb-0">
          <h1 className="text-xl font-black uppercase text-slate-800 tracking-tight leading-none">
            Financial & E-Wallet
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1 mb-3">
            Manajemen konfigurasi finansial, registrasi rekening, dan analitik
            POS.
          </p>

          <div className="flex flex-nowrap overflow-x-auto gap-1">
            {isPusat && (
              <>
                <TabButton id="DASHBOARD_POS" label="Dashboard Transaksi POS" />
                <TabButton id="REGISTER_AKUN" label="Register Rekening Baru" />
              </>
            )}
            <TabButton id="CONFIG_TAX" label="Config Tax & Limit" />
          </div>
        </div>
      </div>

      {/* CONTENT AREA (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4 pr-1">
        {activeTab === "DASHBOARD_POS" && isPusat && <DashboardPosTab />}
        {activeTab === "REGISTER_AKUN" && isPusat && <AccountRegistrationTab />}
        {activeTab === "CONFIG_TAX" && <FinancialConfigPanel />}
      </div>
    </div>
  );
};
