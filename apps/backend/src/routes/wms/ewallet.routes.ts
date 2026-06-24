import { Router, Request, Response } from "express";
import { db } from "../../db";
import {
  wmsWalletAccounts,
  wmsFinancialConfigs,
  wmsWalletLedgers,
} from "../../db/schema/db_wms/wms.akunting";

export const wmsEwalletRoutes = Router();

wmsEwalletRoutes.get("/sync", async (req: Request, res: Response) => {
  try {
    const rawAccounts = await db.select().from(wmsWalletAccounts);
    const rawConfigs = await db.select().from(wmsFinancialConfigs);
    const rawLedgers = await db.select().from(wmsWalletLedgers);
    const configs = rawConfigs.map((config) => ({
      ...config,
      taxRate: parseFloat(config.taxRate as string) || 0,
      serviceRate: parseFloat(config.serviceRate as string) || 0,
      apLimitRate: parseFloat(config.apLimitRate as string) || 0,
    }));

    const ledgers = rawLedgers.map((ledger) => ({
      ...ledger,
      amount: parseFloat(ledger.amount as string) || 0,
    }));
    res.status(200).json({
      accounts: rawAccounts,
      configs: configs,
      ledgers: ledgers,
    });
  } catch (error) {
    console.error("Error fetching E-Wallet data:", error);
    res.status(500).json({
      accounts: [],
      configs: [],
      ledgers: [],
    });
  }
});
