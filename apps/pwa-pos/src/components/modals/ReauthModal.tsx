import React, { useState } from "react";
import { useToast } from "../Toast";

interface ReauthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const ReauthModal: React.FC<ReauthModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [isReauthing, setIsReauthing] = useState(false);

  if (!isOpen) return null;

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReauthing(true);
    try {
      const branchId = localStorage.getItem("ASSTRO_BRANCH_ID");
      const response = await fetch(
        "http://localhost:4000/api/provision/reauth",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: reauthEmail,
            password: reauthPassword,
            branchId,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal otorisasi.");

      // UPDATE TOKEN BARU TANPA MENGHAPUS DATABASE LOKAL
      localStorage.setItem("ASSTRO_DEVICE_TOKEN", data.deviceToken);

      // PULIHKAN IDENTITAS CABANG JIKA SEBELUMNYA HILANG
      if (data.branchId) {
        localStorage.setItem("ASSTRO_BRANCH_ID", data.branchId);
      }

      setReauthEmail("");
      setReauthPassword("");
      showToast("Otorisasi berhasil. Sinkronisasi dilanjutkan.", "SUCCESS");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "ERROR");
    } finally {
      setIsReauthing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-999 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="font-black text-lg text-slate-900 uppercase tracking-widest mb-2">
          Sesi Terputus
        </h3>
        <p className="text-slate-500 text-xs mb-6 px-2 leading-relaxed">
          Koneksi keamanan ke server pusat telah berakhir atau ditolak. Mohon
          panggil Manajer untuk otorisasi ulang mesin ini agar transaksi dapat
          dicadangkan.
        </p>

        <form onSubmit={handleReauthSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Email Manajer
            </label>
            <input
              type="email"
              required
              value={reauthEmail}
              onChange={(e) => setReauthEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={isReauthing}
            className="w-full py-4 mt-2 bg-orange-600 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {isReauthing ? "MENGOTORISASI..." : "PULIHKAN KONEKSI"}
          </button>
        </form>
      </div>
    </div>
  );
};
