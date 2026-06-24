import React from "react";
import { ShieldAlert } from "lucide-react";

interface SupervisorModalProps {
  managerPin: string;
  setManagerPin: (val: string) => void;
  handleVerifyManagerPin: (e: React.FormEvent) => void;
  setShowManagerPinModal: (show: boolean) => void;
  setDiscountInput: (val: string) => void;
  setActiveDiscount: (val: number) => void;
}

export const SupervisorModal: React.FC<SupervisorModalProps> = ({
  managerPin,
  setManagerPin,
  handleVerifyManagerPin,
  setShowManagerPinModal,
  setDiscountInput,
  setActiveDiscount,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 z-200 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-6 border border-slate-200 flex flex-col text-sm">
        <div className="flex items-center gap-2 mb-3 text-red-600">
          <ShieldAlert size={20} />
          <h3 className="font-black text-sm uppercase tracking-tight">
            Otorisasi Supervisor
          </h3>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-normal mb-4">
          Pemberian diskon di atas 10% wajib membutuhkan input PIN Kunci khusus
          dari Manager On Duty (MOD).
        </p>
        <form onSubmit={handleVerifyManagerPin} className="space-y-4">
          <input
            type="password"
            maxLength={4}
            required
            autoFocus
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
            placeholder="PIN MANAGER (MOCK: 0000)"
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-black tracking-widest text-base focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowManagerPinModal(false);
                setDiscountInput("");
                setActiveDiscount(0);
              }}
              className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
            >
              Verifikasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
