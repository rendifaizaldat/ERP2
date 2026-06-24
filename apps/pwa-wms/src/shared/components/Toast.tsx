// apps/pwa-pos/src/components/Toast.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "SUCCESS" | "ERROR" | "WARNING" | "INFO";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastUniversalProvider");
  }
  return context;
};

export const ToastUniversalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType, duration = 3000) => {
      const id = `toast-${Date.now()}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Dynamic Island Container - Tengah Atas */}
      <div className="fixed top-2 left-0 right-0 z-9999 flex flex-col items-center pointer-events-none">
        {toasts.map((toast) => {
          // Styling ala Dynamic Island (pill-shaped, subtle shadow)
          const baseStyle =
            "pointer-events-auto flex items-center gap-3 px-6 py-2.5 rounded-full border shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-top-2";

          let colorStyle =
            "bg-white/90 backdrop-blur-md border-slate-200 text-slate-800";
          let icon = <Info size={16} className="text-blue-500" />;

          if (toast.type === "SUCCESS") {
            colorStyle =
              "bg-emerald-500/90 backdrop-blur-md border-emerald-400 text-white";
            icon = <CheckCircle size={16} className="text-white" />;
          } else if (toast.type === "ERROR") {
            colorStyle =
              "bg-red-500/90 backdrop-blur-md border-red-400 text-white";
            icon = <XCircle size={16} className="text-white" />;
          } else if (toast.type === "WARNING") {
            colorStyle =
              "bg-amber-500/90 backdrop-blur-md border-amber-400 text-white";
            icon = <AlertTriangle size={16} className="text-white" />;
          }

          return (
            <div key={toast.id} className={`${baseStyle} ${colorStyle}`}>
              {icon}
              <span className="text-[11px] font-black uppercase tracking-widest">
                {toast.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
