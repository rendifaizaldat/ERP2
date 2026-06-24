import React, { createContext, useState, useEffect } from "react";
import { initWmsDb } from "../database/rx-db";
import { useAuth } from "./contexts_auth";
import { useKatalog } from "./contexts_katalog";
import { usePiutang } from "./contexts_piutang";
import { useReceivings } from "./contexts_receivings";
import { useOutletBalance } from "./contexts_outletBalance";
import { useSync } from "./contexts_sync";
// IMPORT EWALLET CONTEXT
import { useEWallet } from "./contexts_ewallet";
import type { WmsDatabase } from "../database/rx-db";

import { fetchKatalog, saveKatalogCache } from "../service";

export interface WmsContextProps {
  db: WmsDatabase | null;
  wmsState: ReturnType<typeof useAuth>["wmsState"];
  currentOperator: ReturnType<typeof useAuth>["currentOperator"];
  isScreenLocked: ReturnType<typeof useAuth>["isScreenLocked"];
  isInitialized: ReturnType<typeof useAuth>["isInitialized"];
  validatePin: ReturnType<typeof useAuth>["validatePin"];
  loginOperator: ReturnType<typeof useAuth>["loginOperator"];
  unlockScreen: ReturnType<typeof useAuth>["unlockScreen"];
  lockScreen: ReturnType<typeof useAuth>["lockScreen"];
  logoutOperator: ReturnType<typeof useAuth>["logoutOperator"];
  categories: ReturnType<typeof useKatalog>["categories"];
  masterProducts: ReturnType<typeof useKatalog>["masterProducts"];
  outletProducts: ReturnType<typeof useKatalog>["outletProducts"];
  regions: ReturnType<typeof useKatalog>["regions"];
  branches: ReturnType<typeof useKatalog>["branches"];
  uomOptions: ReturnType<typeof useKatalog>["uomOptions"];
  vendors: ReturnType<typeof useKatalog>["vendors"];
  piutangPusat: ReturnType<typeof usePiutang>["piutangPusat"];
  fetchPiutangPusat: ReturnType<typeof usePiutang>["fetchPiutangPusat"];
  processPayment: ReturnType<typeof usePiutang>["processPayment"];
  updateReceivingTransaction: ReturnType<
    typeof usePiutang
  >["updateReceivingTransaction"];
  archiveReceiving: ReturnType<typeof usePiutang>["archiveReceiving"];
  restoreReceiving: ReturnType<typeof usePiutang>["restoreReceiving"];
  voidLastPayment: ReturnType<typeof usePiutang>["voidLastPayment"];
  processBulkPayment: ReturnType<typeof usePiutang>["processBulkPayment"];
  // Receivings
  receivings: ReturnType<typeof useReceivings>["receivings"];
  fetchReceivings: ReturnType<typeof useReceivings>["fetchReceivings"];
  processPaymentHutang: ReturnType<
    typeof useReceivings
  >["processPaymentHutang"];
  processPaymentApOutlet: ReturnType<
    typeof useReceivings
  >["processPaymentApOutlet"];
  // Outlet Balance
  outletBalances: ReturnType<typeof useOutletBalance>["outletBalances"];
  fetchOutletBalances: ReturnType<
    typeof useOutletBalance
  >["fetchOutletBalances"];
  mutateOutletBalance: ReturnType<
    typeof useOutletBalance
  >["mutateOutletBalance"];
  // Sync
  isOnline: ReturnType<typeof useSync>["isOnline"];
  isSyncing: ReturnType<typeof useSync>["isSyncing"];
  syncData: ReturnType<typeof useSync>["syncData"];
  addSyncTask: ReturnType<typeof useSync>["addSyncTask"];
  showToast: ReturnType<typeof useSync>["showToast"];

  // ---> E-WALLET (TAMBAHAN BARU) <---
  walletAccounts: ReturnType<typeof useEWallet>["walletAccounts"];
  financialConfigs: ReturnType<typeof useEWallet>["financialConfigs"];
  walletLedgers: ReturnType<typeof useEWallet>["walletLedgers"];
  fetchEWalletData: ReturnType<typeof useEWallet>["fetchEWalletData"];
}

export const WmsContext = createContext<WmsContextProps | undefined>(undefined);

export const WmsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<WmsDatabase | null>(null);
  useEffect(() => {
    initWmsDb().then(setDb);
  }, []);

  const auth = useAuth();
  const katalog = useKatalog(db, auth.isInitialized);
  const piutang = usePiutang(db, auth.wmsState);
  const receivingsContext = useReceivings(db, auth.wmsState);
  const outletBalance = useOutletBalance(db);

  // INISIALISASI EWALLET
  const ewallet = useEWallet(db, auth.wmsState);

  const triggerDeltaSync = async () => {
    try {
      console.log(
        "⚡ [WMS_PROVIDER] Mengeksekusi Delta Sync dari WebSocket...",
      );

      if (receivingsContext.fetchReceivings)
        await receivingsContext.fetchReceivings();
      if (piutang.fetchPiutangPusat) await piutang.fetchPiutangPusat();
      if (outletBalance.fetchOutletBalances)
        await outletBalance.fetchOutletBalances();
      if (ewallet.fetchEWalletData) await ewallet.fetchEWalletData();

      if (db) {
        const data = await fetchKatalog();
        saveKatalogCache(data);
        for (const vendor of data.vendors || [])
          await db.wms_vendors.upsert(vendor);
        for (const prod of data.globalProducts || [])
          await db.wms_global_products.upsert(prod);
        for (const item of data.regionalItems || [])
          await db.wms_regional_items.upsert(item);
        for (const cat of data.categories || [])
          await db.wms_categories.upsert(cat);

        // CATATAN: PULL DATA EWALLET DARI API NANTINYA AKAN DITAMBAHKAN DI SINI
      }

      console.log("✅ [WMS_PROVIDER] Delta Sync Selesai!");
    } catch (err) {
      console.error("❌ [WMS_PROVIDER] Gagal menjalankan Delta Sync:", err);
    }
  };

  const sync = useSync(auth.wmsState, triggerDeltaSync);

  useEffect(() => {
    if (auth.isInitialized && auth.wmsState && db) {
      receivingsContext.fetchReceivings();
      ewallet.fetchEWalletData();
    }
  }, [auth.isInitialized, auth.wmsState, db]);

  const contextValue: WmsContextProps = {
    db,
    ...auth,
    ...katalog,
    ...piutang,
    ...receivingsContext,
    ...outletBalance,
    ...sync,
    ...ewallet,
  };

  return (
    <WmsContext.Provider value={contextValue}>{children}</WmsContext.Provider>
  );
};
