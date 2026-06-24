import { useState, useCallback, useEffect } from "react";
import { fetchPiutangData, executeMutation } from "../service";
import type { WmsDatabase } from "../database/rx-db";
import type { WmsState } from "./contexts_auth";

export interface PiutangPayment {
  id: string;
  date: string;
  amount: number;
  depositAmount?: number;
  externalAmount?: number;
  proof: string | null;
  notes: string | null;
}

export interface PiutangPusatData {
  id: string;
  tanggal: string;
  outlet: string;
  total: number;
  dibayar: number;
  sisa: number;
  status: string;
  docStatus?: string;
  jatuhTempo: string | null;
  payments: PiutangPayment[];
  items: any[];
}

export function usePiutang(db: WmsDatabase | null, wmsState: WmsState | null) {
  const [piutangPusat, setPiutangPusat] = useState<PiutangPusatData[]>([]);

  useEffect(() => {
    if (!db) return;
    const sub = db.wms_piutang.find().$.subscribe((docs) => {
      setPiutangPusat(docs.map((d) => d.toJSON() as PiutangPusatData));
    });
    return () => sub.unsubscribe();
  }, [db]);

  const fetchPiutangPusat = useCallback(async () => {
    if (!wmsState?.regionId || !db) return;
    try {
      const data = await fetchPiutangData(wmsState.regionId);
      for (const item of data) await db.wms_piutang.upsert(item);
    } catch (error) {
      console.error("[FETCH_PIUTANG] Gagal menarik data", error);
    }
  }, [wmsState, db]);

  const processPayment = useCallback(
    async (payload: any) => {
      if (!db) return;
      await db.wms_outbox.insert({
        id: payload.id,
        type: "PIUTANG_PAYMENT_PROCESSED",
        payload,
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      const doc = await db.wms_piutang.findOne(payload.receivingId).exec();
      if (doc) {
        const p = doc.toJSON();
        const newPayments = [
          ...p.payments,
          {
            id: payload.id,
            date: payload.paymentDate.split("T")[0],
            amount: payload.amount,
            proof: payload.proofOfTransfer,
            notes: payload.notes,
          },
        ];
        await doc.incrementalPatch({
          dibayar: payload.newTotalPayment,
          sisa: p.total - payload.newTotalPayment,
          status: payload.newPaymentStatus,
          payments: newPayments,
        });
      }
    },
    [db],
  );

  const updateReceivingTransaction = useCallback(
    async (id: string, payload: any) => {
      if (!db) return;
      await db.wms_outbox.insert({
        id: `UPDATE-PIUTANG-${id}-${Date.now()}`,
        type: "RECEIVING_TRANSACTION_UPDATED",
        payload: { id, ...payload },
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      const doc = await db.wms_piutang.findOne(id).exec();
      if (doc) {
        const currentData = doc.toJSON();
        const newSisa = payload.totalAmount - currentData.dibayar;
        await doc.incrementalPatch({
          total: payload.totalAmount,
          sisa: newSisa < 0 ? 0 : newSisa,
          status:
            newSisa <= 0
              ? "PAID"
              : currentData.dibayar > 0
                ? "PARTIAL"
                : "UNPAID",
          items: payload.items,
        });
      }
    },
    [db],
  );

  const archiveReceiving = useCallback(
    async (id: string) => {
      if (!db) return;
      await db.wms_outbox.insert({
        id: `ARCHIVE-${id}-${Date.now()}`,
        type: "RECEIVING_STATUS_UPDATED",
        payload: { id, docStatus: "CANCELLED" },
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      const doc = await db.wms_piutang.findOne(id).exec();
      if (doc) await doc.incrementalPatch({ docStatus: "CANCELLED" });
    },
    [db],
  );

  const restoreReceiving = useCallback(
    async (id: string) => {
      if (!db) return;
      await db.wms_outbox.insert({
        id: `RESTORE-${id}-${Date.now()}`,
        type: "RECEIVING_STATUS_UPDATED",
        payload: { id, docStatus: "COMPLETED" },
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      const doc = await db.wms_piutang.findOne(id).exec();
      if (doc) await doc.incrementalPatch({ docStatus: "COMPLETED" });
    },
    [db],
  );

  const voidLastPayment = useCallback(
    async (receivingId: string, paymentId: string) => {
      if (!db) return;
      await db.wms_outbox.insert({
        id: `VOID-${paymentId}`,
        type: "PIUTANG_PAYMENT_VOIDED",
        payload: { receivingId, paymentId },
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      const doc = await db.wms_piutang.findOne(receivingId).exec();
      if (doc) {
        const p = doc.toJSON();
        const newPayments = p.payments.filter(
          (pay: any) => pay.id !== paymentId,
        );
        const newDibayar = newPayments.reduce(
          (acc: number, curr: any) => acc + curr.amount,
          0,
        );
        const newSisa = p.total - newDibayar;
        const newStatus =
          newDibayar === 0
            ? "UNPAID"
            : newDibayar >= p.total
              ? "PAID"
              : "PARTIAL";
        await doc.incrementalPatch({
          payments: newPayments,
          dibayar: newDibayar,
          sisa: newSisa,
          status: newStatus,
        });
      }
    },
    [db],
  );

  const processBulkPayment = useCallback(
    async (payload: any) => {
      if (!db) return;
      const {
        bulkId,
        outletId,
        allocations,
        useDeposit,
        depositUsed,
        overpayment,
        paymentDate,
        notes,
        proofOfTransfer,
      } = payload;
      await db.wms_outbox.insert({
        id: bulkId,
        type: "BULK_PIUTANG_PAYMENT_PROCESSED",
        payload,
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });
      for (const alloc of allocations) {
        const doc = await db.wms_piutang.findOne(alloc.receivingId).exec();
        if (doc) {
          const currentData = doc.toJSON();
          const updatedPayments = [
            ...currentData.payments,
            {
              id: `PAY-LOKAL-${Date.now()}`,
              date: paymentDate.split("T")[0],
              amount: alloc.amountAllocated,
              depositAmount: alloc.depositAmount,
              externalAmount: alloc.externalAmount,
              proof: proofOfTransfer,
              notes,
            },
          ];
          await doc.incrementalPatch({
            dibayar: alloc.newTotalPayment,
            sisa: currentData.total - alloc.newTotalPayment,
            status: alloc.newPaymentStatus,
            payments: updatedPayments,
          });
        }
      }
      if (useDeposit || overpayment > 0) {
        const balanceDoc = await db.wms_outlet_balances
          .findOne(outletId)
          .exec();
        const currentBal = balanceDoc ? balanceDoc.balance : 0;
        const newBal = currentBal - (depositUsed || 0) + (overpayment || 0);
        if (balanceDoc)
          await balanceDoc.incrementalPatch({
            balance: newBal,
            updatedAt: new Date().toISOString(),
          });
        else
          await db.wms_outlet_balances.insert({
            outletId,
            balance: newBal,
            updatedAt: new Date().toISOString(),
          });
      }
    },
    [db],
  );

  return {
    piutangPusat,
    fetchPiutangPusat,
    processPayment,
    updateReceivingTransaction,
    archiveReceiving,
    restoreReceiving,
    voidLastPayment,
    processBulkPayment,
  };
}
