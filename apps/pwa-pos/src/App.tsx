import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Footer } from "./components/layout/Footer";
import { PosProvider, usePos } from "./core/PosProvider";
import { PosModule } from "./features/pos/PosModule";
import { SetupWizard } from "./features/setup/SetupWizard";
import { LoginScreen } from "./features/auth/LoginScreen";

import { errorBus } from "./core/instances";
import { useToast } from "./components/Toast";
import { ReauthModal } from "./components/modals/ReauthModal";
import { SecurityEnforcer } from "./components/shared/SecurityEnforcer";

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const { showToast } = useToast();

  const {
    isReady,
    isInitialized,
    currentOperator,
    isScreenLocked,
    viewState,
    setViewStateDirect,
  } = usePos();

  const hasDeviceToken = Boolean(localStorage.getItem("ASSTRO_DEVICE_TOKEN"));
  useEffect(() => {
    const errorSubscription = errorBus.subscribe((errorMessage: string) => {
      showToast(errorMessage, "ERROR", 5000);
    });
    return () => errorSubscription.unsubscribe();
  }, [showToast]);

  useEffect(() => {
    const handleReauth = () => setShowReauthModal(true);
    window.addEventListener("REQUIRE_REAUTH", handleReauth);
    return () => window.removeEventListener("REQUIRE_REAUTH", handleReauth);
  }, []);

  useEffect(() => {
    const handleSyncError = (e: any) => {
      showToast("Gagal kirim data ke server. Periksa koneksi!", "ERROR");
      console.error("Sync Error Detail:", e.detail);
    };

    window.addEventListener("SYNC_ERROR", handleSyncError);
    return () => window.removeEventListener("SYNC_ERROR", handleSyncError);
  }, [showToast]);
  if (!isReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white font-black italic uppercase tracking-widest animate-pulse">
        Initializing Asstro Engine...
      </div>
    );
  }
  if (!isInitialized && !hasDeviceToken) {
    return <SetupWizard />;
  }
  const handleSelectTable = (tableId: string) => {
    setViewStateDirect({
      selectedTable: tableId,
      activeTab: "MENU",
      viewMode: "MENU",
    });
  };
  const handleBackToTables = () => {
    setViewStateDirect({
      selectedTable: null,
      activeTab: "DINE_IN",
      viewMode: "TABLES",
    });
  };
  return (
    <SecurityEnforcer>
      {/* 1. Jika Kasir Belum Login / Terkunci -> Tampilkan Login Screen */}
      {!currentOperator || isScreenLocked ? (
        <LoginScreen />
      ) : (
        /* 2. Jika Kasir Valid -> Tampilkan POS Utama */
        <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans select-none relative">
          <Header onMenuClick={() => setIsMenuOpen(true)} />
          <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

          {viewState.viewMode !== "MENU" && (
            <nav className="bg-white flex justify-between items-center px-8 border-b border-slate-200 shrink-0">
              <div className="flex">
                <button
                  onClick={() => {
                    setViewStateDirect({
                      selectedTable: null,
                      activeTab: "DINE_IN",
                      viewMode: "TABLES",
                    });
                  }}
                  className={`px-10 py-5 font-black text-xs uppercase tracking-widest transition-all border-b-4 cursor-pointer ${
                    viewState.activeTab === "DINE_IN" ||
                    (viewState.activeTab === "MENU" &&
                      viewState.selectedTable &&
                      !viewState.selectedTable.startsWith("TA-"))
                      ? "border-orange-600 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  Dine In{" "}
                  {viewState.selectedTable &&
                    !viewState.selectedTable.startsWith("TA-") &&
                    `(${viewState.selectedTable})`}
                </button>
                <button
                  onClick={() => {
                    const taId = `TA-${Date.now()}`;
                    setViewStateDirect({
                      selectedTable: taId,
                      activeTab: "MENU",
                      viewMode: "MENU",
                    });
                  }}
                  className={`px-10 py-5 font-black text-xs uppercase tracking-widest transition-all border-b-4 cursor-pointer ${
                    viewState.activeTab === "TAKE_AWAY" ||
                    (viewState.selectedTable &&
                      viewState.selectedTable.startsWith("TA-"))
                      ? "border-orange-600 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  Take Away
                </button>
              </div>
              <div></div>
            </nav>
          )}

          <main className="flex-1 flex overflow-hidden bg-[#F8FAFC]">
            {viewState.viewMode === "TABLES" ? (
              <PosModule
                viewMode="TABLES"
                onSelectTable={handleSelectTable}
                selectedTable={viewState.selectedTable}
                onBack={handleBackToTables}
              />
            ) : (
              <PosModule
                viewMode="MENU"
                onSelectTable={handleSelectTable}
                selectedTable={
                  viewState.viewMode === "MENU" ? viewState.selectedTable : null
                }
                onBack={handleBackToTables}
              />
            )}
          </main>

          <Footer />
        </div>
      )}

      {/* Reauth Modal ikut diamankan di dalam SecurityEnforcer */}
      <ReauthModal
        isOpen={showReauthModal}
        onSuccess={() => setShowReauthModal(false)}
      />
    </SecurityEnforcer>
  );
}

export default function App() {
  return (
    <PosProvider>
      <AppContent />
    </PosProvider>
  );
}
