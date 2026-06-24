import { createRxDatabase, addRxPlugin, RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration-schema";
import {
  wmsFinancialConfigSchema,
  wmsWalletAccountSchema,
  wmsWalletLedgerSchema,
} from "./rx-schemas-akunting";
import { wmsPosInvoicesSchema, wmsPosPaymentsSchema } from "./rx-schemas-pos";
import {
  wmsOutboxSchema,
  wmsPiutangSchema,
  wmsOutletBalancesSchema,
  wmsLedgerSchema,
  wmsVendorsSchema,
  wmsGlobalProductsSchema,
  wmsRegionalItemsSchema,
  wmsCategoriesSchema,
  wmsReceivingsSchema,
} from "./rx-schemas";

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBMigrationPlugin);

export type WmsDatabaseCollections = {
  wms_outbox: any;
  wms_piutang: any;
  wms_outlet_balances: any;
  wms_ledgers: any;
  wms_vendors: any;
  wms_global_products: any;
  wms_regional_items: any;
  wms_categories: any;
  wms_receivings: any;
  // Koleksi Akunting
  wms_financial_configs: any;
  wms_wallet_accounts: any;
  wms_wallet_ledgers: any;
  // --- INI YANG KURANG SEBELUMNYA: Koleksi POS ---
  wms_pos_invoices: any;
  wms_pos_payments: any;
};

export type WmsDatabase = RxDatabase<WmsDatabaseCollections>;

const storage = wrappedValidateAjvStorage({
  storage: getRxStorageDexie(),
});

let dbPromise: Promise<WmsDatabase> | null = null;

export const initWmsDb = async (): Promise<WmsDatabase> => {
  if (!dbPromise) {
    dbPromise = createRxDatabase<WmsDatabaseCollections>({
      name: "wms_local_db",
      storage,
      multiInstance: true,
      ignoreDuplicate: true,
    }).then(async (db) => {
      await db.addCollections({
        wms_outbox: { schema: wmsOutboxSchema },
        wms_piutang: {
          schema: wmsPiutangSchema,
          migrationStrategies: {
            1: function (oldDoc) {
              return oldDoc;
            },
          },
        },
        wms_outlet_balances: { schema: wmsOutletBalancesSchema },
        wms_ledgers: { schema: wmsLedgerSchema },
        wms_vendors: { schema: wmsVendorsSchema },
        wms_global_products: { schema: wmsGlobalProductsSchema },
        wms_regional_items: { schema: wmsRegionalItemsSchema },
        wms_categories: { schema: wmsCategoriesSchema },
        wms_receivings: { schema: wmsReceivingsSchema },
        wms_financial_configs: { schema: wmsFinancialConfigSchema },
        wms_wallet_accounts: { schema: wmsWalletAccountSchema },
        wms_wallet_ledgers: { schema: wmsWalletLedgerSchema },
        // Koleksi POS
        wms_pos_invoices: {
          schema: wmsPosInvoicesSchema,
        },
        wms_pos_payments: {
          schema: wmsPosPaymentsSchema,
        },
      });
      return db;
    });
  }
  return dbPromise;
};

export const getWmsDb = async (): Promise<WmsDatabase> => {
  if (!dbPromise) return initWmsDb();
  return dbPromise;
};
