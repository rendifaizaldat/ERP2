import { useState, useEffect, useCallback } from "react";
import type { WmsDatabase } from "../database/rx-db";
import type { WmsState } from "./contexts_auth";
import { fetchEWalletSync, saveEWalletCache } from "../service";
import {
  mapEWalletAccounts,
  mapEWalletConfigs,
  mapEWalletLedgers,
} from "../utils";

export interface WalletAccount {
  id: string;
  regionId: string;
  branchId: string;
  managedBy: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  accountName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _deleted?: boolean;
}

export interface FinancialConfig {
  branchId: string;
  taxRate: number;
  serviceRate: number;
  apLimitRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _deleted?: boolean;
}

export interface WalletLedger {
  id: string;
  transactionId: string;
  accountId: string;
  branchId: string;
  mutationType: "IN" | "OUT";
  amount: number;
  referenceType: string;
  referenceId?: string | null;
  operatorId?: string | null;
  notes?: string | null;
  createdAt: string;
  _deleted?: boolean;
}

export function useEWallet(db: WmsDatabase | null, wmsState: WmsState | null) {
  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([]);
  const [financialConfigs, setFinancialConfigs] = useState<FinancialConfig[]>(
    [],
  );
  const [walletLedgers, setWalletLedgers] = useState<WalletLedger[]>([]);

  const fetchEWalletData = useCallback(async () => {
    if (!db || !wmsState) return;

    try {
      const response = await fetchEWalletSync(wmsState.deviceToken);

      // Mengecek eksistensi root array, menghapus wrapper success dan data
      if (response && response.accounts) {
        saveEWalletCache(response);

        // Lakukan sanitasi data sebelum di-upsert ke RxDB
        const cleanAccounts = mapEWalletAccounts(response.accounts || []);
        const cleanConfigs = mapEWalletConfigs(response.configs || []);
        const cleanLedgers = mapEWalletLedgers(response.ledgers || []);

        if (cleanAccounts.length > 0) {
          for (const acc of cleanAccounts) {
            try {
              await db.wms_wallet_accounts.upsert(acc);
            } catch (err) {
              console.error(
                `[RxDB_Error] Gagal upsert Account ID ${acc.id}:`,
                err,
              );
            }
          }
        }

        if (cleanConfigs.length > 0) {
          for (const conf of cleanConfigs) {
            try {
              await db.wms_financial_configs.upsert(conf);
            } catch (err) {
              console.error(
                `[RxDB_Error] Gagal upsert Config ID ${conf.branchId}:`,
                err,
              );
            }
          }
        }

        if (cleanLedgers.length > 0) {
          for (const ledger of cleanLedgers) {
            try {
              await db.wms_wallet_ledgers.upsert(ledger);
            } catch (err) {
              console.error(
                `[RxDB_Error] Gagal upsert Ledger ID ${ledger.id}:`,
                err,
              );
            }
          }
        }

        console.log(
          "✅ [useEWallet] Data berhasil ditarik dan disinkronkan ke RxDB!",
        );
      }
    } catch (error) {
      console.error("❌ [useEWallet] Gagal menarik data E-Wallet:", error);
    }
  }, [db, wmsState]);

  useEffect(() => {
    if (!db) return;
    const subs: any[] = [];

    if (db.wms_wallet_accounts) {
      subs.push(
        db.wms_wallet_accounts.find().$.subscribe((docs) => {
          setWalletAccounts(docs.map((d) => d.toJSON() as WalletAccount));
        }),
      );
    }

    if (db.wms_financial_configs) {
      subs.push(
        db.wms_financial_configs.find().$.subscribe((docs) => {
          setFinancialConfigs(docs.map((d) => d.toJSON() as FinancialConfig));
        }),
      );
    }

    if (db.wms_wallet_ledgers) {
      subs.push(
        db.wms_wallet_ledgers.find().$.subscribe((docs) => {
          setWalletLedgers(docs.map((d) => d.toJSON() as WalletLedger));
        }),
      );
    }

    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [db]);

  return {
    walletAccounts,
    financialConfigs,
    walletLedgers,
    fetchEWalletData,
  };
}
