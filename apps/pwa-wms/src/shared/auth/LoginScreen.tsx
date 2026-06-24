import React, { useState } from "react";
import { useToast } from "../components/Toast";
import { Delete, Lock } from "lucide-react";
import { useWms } from "../../core/WmsProvider";

export const LoginScreen: React.FC = () => {
  const {
    validatePin,
    loginOperator,
    unlockScreen,
    isScreenLocked,
    currentOperator,
    wmsState,
  } = useWms();

  const { showToast } = useToast();
  const [pin, setPin] = useState<string>("");

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const updatedPin = pin + num;
      setPin(updatedPin);
      if (updatedPin.length === 6) {
        processAuthentication(updatedPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const processAuthentication = async (inputPin: string) => {
    const result = await validatePin(inputPin);
    if (!result.valid) {
      showToast(result.message || "Otorisasi Akses Ditolak.", "ERROR");
      setPin("");
      return;
    }
    if (isScreenLocked && currentOperator && currentOperator.pin === inputPin) {
      showToast("Layar berhasil dibuka!", "SUCCESS");
      if (unlockScreen) unlockScreen();
      setPin("");
      return;
    }
    if (loginOperator) {
      await loginOperator(result.staff);
      showToast(
        `Selamat bertugas, ${result.staff?.name || "Operator WMS"}!`,
        "SUCCESS",
      );
    }

    setPin("");
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 font-sans select-none relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade">
        {/* Logo Asstro WMS */}
        <div className="bg-sky-600 text-white w-16 h-16 flex items-center justify-center rounded-3xl font-black italic text-2xl shadow-xl shadow-sky-900/30 mb-4 relative">
          AS
          {isScreenLocked && currentOperator && (
            <div className="absolute -top-1 -right-1 bg-red-600 border-2 border-slate-950 p-1 rounded-full text-white animate-bounce">
              <Lock size={12} />
            </div>
          )}
        </div>

        <h1 className="font-black text-2xl uppercase tracking-widest text-center">
          {isScreenLocked ? (
            <>
              Layar <span className="text-red-500">Terkunci</span>
            </>
          ) : (
            <>
              Asstro <span className="text-sky-500">WMS</span>
            </>
          )}
        </h1>

        {/* Informasi Region/Branch */}
        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-2 text-center mb-10">
          {isScreenLocked && currentOperator
            ? `STANDBY MODE OLEH: ${currentOperator?.name}`
            : `${wmsState?.wmsType || "GUDANG PUSAT"} • ${wmsState?.regionId || "LOCAL NODE"}`}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 justify-center mb-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? "bg-sky-500 border-sky-500 scale-110 shadow-lg shadow-sky-500/50"
                  : "bg-transparent border-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="h-16 w-full mb-4" />

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumberClick(num)}
              className="h-20 bg-slate-900 hover:bg-slate-800 text-white font-black text-2xl rounded-2xl border border-slate-900 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div className="h-20" />
          <button
            type="button"
            onClick={() => handleNumberClick("0")}
            className="h-20 bg-slate-900 hover:bg-slate-800 text-white font-black text-2xl rounded-2xl border border-slate-900 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-20 bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-black rounded-2xl border border-slate-900 hover:border-red-900 transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
