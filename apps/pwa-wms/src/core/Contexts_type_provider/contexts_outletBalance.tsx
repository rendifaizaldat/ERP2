import { useState, useCallback, useEffect } from "react";
import { fetchOutletBalancesData } from "../service";
import type { WmsDatabase } from "../database/rx-db";

export interface OutletBalance {
  outletId: string;
  balance: number;
}

export interface OutletBalanceMutation {
  id: string;
  outletId: string;
  mutationType:
    | "IN_OVERPAYMENT"
    | "IN_LOAN"
    | "OUT_PAYMENT"
    | "OUT_REFUND"
    | "IN_REFUND_VOID";
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  notes: string | null;
  proofOfTransfer: string | null;
  createdAt: string;
}

export function useOutletBalance(db: WmsDatabase | null) {
  const [outletBalances, setOutletBalances] = useState<OutletBalance[]>([]);

  useEffect(() => {
    if (!db) return;
    const sub = db.wms_outlet_balances.find().$.subscribe((docs) => {
      setOutletBalances(docs.map((d) => d.toJSON() as OutletBalance));
    });
    return () => sub.unsubscribe();
  }, [db]);

  const fetchOutletBalances = useCallback(async () => {
    if (!db) return;
    try {
      const data = await fetchOutletBalancesData();
      for (const item of data) await db.wms_outlet_balances.upsert(item);
    } catch (error) {
      console.error("[FETCH_BALANCES] Gagal menarik data", error);
    }
  }, [db]);

  const mutateOutletBalance = useCallback(
    async (payload: any) => {
      if (!db) return;
      const balanceDoc = await db.wms_outlet_balances
        .findOne(payload.outletId)
        .exec();
      const currentBalance = balanceDoc ? balanceDoc.balance : 0;
      const newBalance =
        payload.mutationType === "IN_LOAN"
          ? currentBalance + payload.amount
          : currentBalance - payload.amount;
      const finalPayload = { ...payload, balanceAfter: newBalance };

      await db.wms_outbox.insert({
        id: finalPayload.id,
        type: "OUTLET_BALANCE_MUTATED",
        payload: finalPayload,
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      await db.wms_ledgers.insert({
        id: finalPayload.id,
        outletId: finalPayload.outletId,
        mutationType: finalPayload.mutationType,
        amount: finalPayload.amount,
        balanceAfter: newBalance,
        notes: finalPayload.notes,
        createdBy: finalPayload.createdBy || "SYSTEM",
        createdAt: new Date().toISOString(),
      });
      if (balanceDoc) {
        await balanceDoc.incrementalPatch({
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.wms_outlet_balances.insert({
          outletId: finalPayload.outletId,
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db],
  );

  return { outletBalances, fetchOutletBalances, mutateOutletBalance };
}
