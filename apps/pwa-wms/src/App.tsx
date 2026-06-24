import React from "react";
// PENTING: Ambil WmsProvider & useWms dari contexts.tsx
import { WmsProvider, useWms } from "./core/WmsProvider";
import { ToastUniversalProvider } from "./shared/components/Toast";
import { SetupWizard } from "./shared/setup/SetupWizard";
import { LoginScreen } from "./shared/auth/LoginScreen";

// Import Layout Spesifik
import { PusatLayout } from "./wms-pusat/PusatLayout";
import { OutletLayout } from "./wms-outlet/OutletLayout";

// ==========================================
// ROUTER CONTENT
// ==========================================
const AppContent = () => {
  const { isInitialized, wmsState, currentOperator, isScreenLocked } = useWms();

  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-sky-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="animate-pulse font-black tracking-widest uppercase text-xs">
            Initializing WMS Engine & Local DB...
          </div>
        </div>
      </div>
    );
  }

  if (!wmsState?.deviceToken) {
    return <SetupWizard />;
  }

  if (!currentOperator || isScreenLocked) {
    return <LoginScreen />;
  }

  return wmsState.wmsType?.toUpperCase() === "PUSAT" ? (
    <PusatLayout />
  ) : (
    <OutletLayout />
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  return (
    <ToastUniversalProvider>
      <WmsProvider>
        <AppContent />
      </WmsProvider>
    </ToastUniversalProvider>
  );
}
