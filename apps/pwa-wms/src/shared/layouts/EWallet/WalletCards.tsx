import React, { useEffect, useState } from "react";
import { useWms } from "@/core/WmsProvider";

interface WmsWalletAccount {
  accountId: string;
  branchId: string;
  regionId: string;
  accountName: string; // misal: "CASH Kasir Lembang" atau "BCA Pusat"
  bankName: string; // misal: "CASH", "BCA", "MANDIRI"
  accountNumber: string;
  balance: number;
  managedBy: "HO" | "OUTLET";
  isActive: boolean;
}

interface WalletCardsProps {
  activeBranchId: string;
}

export const WalletCards = ({ activeBranchId }: WalletCardsProps) => {
  const { wmsState, db } = useWms();
  const [accounts, setAccounts] = useState<WmsWalletAccount[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Query wallets berdasarkan activeBranchId
  useEffect(() => {
    if (!db || !activeBranchId) {
      setAccounts([]);
      return;
    }

    const querySelector =
      wmsState?.wmsType === "PUSAT"
        ? { branchId: activeBranchId } // Filter by selected branch
        : { branchId: wmsState?.branchId };

    setIsFetching(true);
    const subscription = db.wms_wallet_accounts
      .find({
        selector: querySelector as any,
        sort: [{ bankName: "asc" }],
      })
      .$.subscribe({
        next: (docs) => {
          setAccounts(docs.map((doc) => doc.toJSON()) as WmsWalletAccount[]);
          setIsFetching(false);
        },
        error: (err) => {
          console.error("[WALLET_ACCOUNTS_ERROR]", err);
          setIsFetching(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [db, activeBranchId, wmsState]);

  // Format Rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isFetching) {
    return (
      <div className="p-4 text-slate-500 font-medium">
        Memuat data rekening...
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-700 text-center font-bold">
        Belum ada dompet/rekening yang terdaftar untuk area ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((acc) => (
        <div
          key={acc.accountId}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden"
        >
          {/* Ornamen Background */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">
                {acc.bankName}
              </p>
              <h4 className="text-lg font-black truncate max-w-[180px]">
                {acc.accountName}
              </h4>
            </div>

            {/* Indikator Managed By */}
            <span
              className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide ${
                acc.managedBy === "HO"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {acc.managedBy}
            </span>
          </div>

          <div className="mb-2">
            <p className="text-slate-400 text-xs font-bold mb-1">Total Saldo</p>
            <h2 className="text-3xl font-black tracking-tight">
              {formatRupiah(acc.balance)}
            </h2>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
            <p className="text-sm font-mono text-slate-300">
              {acc.accountNumber || "**** ****"}
            </p>
            {/* Jika butuh status aktif/tidak */}
            {!acc.isActive && (
              <span className="text-xs text-red-400 font-bold">Non-Aktif</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
