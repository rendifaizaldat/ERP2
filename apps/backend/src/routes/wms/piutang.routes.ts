import { Router } from "express";
import { StringCodec } from "nats";
import { getNatsInstance, sc } from "../../services/nats";
import { ulid } from "ulid";
import { db } from "../../db";
import { branches } from "../../db/schema/master/organization";
import {
  wmsReceiving,
  wmsReceivingItems,
  wmsPayments,
  wmsOutletBalances,
  wmsOutletBalanceMutations,
} from "../../db/schema/db_wms/wms.transactions";
import { and, eq, like, inArray, asc } from "drizzle-orm";
import Decimal from "decimal.js";

const router = Router();

const publishEvent = async (aggregateId: string, event: any) => {
  const { js } = getNatsInstance();
  const envelope = {
    eventId: ulid(),
    aggregateId,
    timestamp: new Date().toISOString(),
    event,
  };
  await js.publish("events.wms", sc.encode(JSON.stringify(envelope)));
  return envelope.eventId;
};

// ==========================================
// 1. DATA PIUTANG UTAMA (EXISTING)
// ==========================================
router.get("/:regionId", async (req, res) => {
  try {
    const { regionId } = req.params;

    const receivings = await db
      .select({
        receiving: wmsReceiving,
        branchName: branches.name,
      })
      .from(wmsReceiving)
      .leftJoin(branches, eq(wmsReceiving.branchId, branches.id))
      .where(
        and(
          eq(wmsReceiving.regionId, regionId),
          eq(wmsReceiving.transactionType, "PEMBELIAN"),
          like(wmsReceiving.sourceEntity, "PUSAT%"),
        ),
      );

    const receivingIds = receivings.map((r: any) => r.receiving.id);
    let payments: any[] = [];
    let items: any[] = [];

    if (receivingIds.length > 0) {
      payments = await db
        .select()
        .from(wmsPayments)
        .where(
          and(
            inArray(wmsPayments.receivingId, receivingIds),
            eq(wmsPayments.status, "SUCCESS"),
          ),
        );
      items = await db
        .select()
        .from(wmsReceivingItems)
        .where(inArray(wmsReceivingItems.receivingId, receivingIds));
    }

    const mappedData = receivings.map((r: any) => ({
      ...r.receiving,
      outletName: r.branchName,
      payments: payments.filter((p: any) => p.receivingId === r.receiving.id),
      items: items.filter((i: any) => i.receivingId === r.receiving.id),
    }));

    res.status(200).json(mappedData);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================================
// 2. SISTEM LEDGER / DOMPET OUTLET
// ==========================================
router.get("/ledger/balances", async (req, res) => {
  try {
    const balances = await db.select().from(wmsOutletBalances);
    res.status(200).json(balances);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.get("/ledger/mutations/:outletId", async (req, res) => {
  try {
    const { outletId } = req.params;

    const balances = await db
      .select()
      .from(wmsOutletBalances)
      .where(eq(wmsOutletBalances.outletId, outletId))
      .limit(1);

    const mutations = await db
      .select()
      .from(wmsOutletBalanceMutations)
      .where(eq(wmsOutletBalanceMutations.outletId, outletId))
      .orderBy(asc(wmsOutletBalanceMutations.createdAt));

    res.status(200).json({
      balance: balances.length > 0 ? Number(balances[0].balance) : 0,
      mutations,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/ledger/mutate", async (req, res) => {
  try {
    const {
      id: clientMutationId, // Menerima Idempotency Key dari Frontend
      outletId,
      mutationType,
      amount,
      notes,
      proofOfTransfer,
      createdBy,
    } = req.body;

    const id = clientMutationId || ulid(); // Fallback jika Frontend belum mengirim ID
    const mutationAmount = new Decimal(amount || 0);

    const balanceRecord = await db
      .select()
      .from(wmsOutletBalances)
      .where(eq(wmsOutletBalances.outletId, outletId))
      .limit(1);

    let currentBalance = new Decimal(
      balanceRecord.length > 0 ? balanceRecord[0].balance : 0,
    );

    if (mutationType === "IN_OVERPAYMENT" || mutationType === "IN_LOAN") {
      currentBalance = currentBalance.plus(mutationAmount);
    } else if (
      mutationType === "OUT_PAYMENT" ||
      mutationType === "OUT_REFUND"
    ) {
      currentBalance = currentBalance.minus(mutationAmount);
    }

    const payload = {
      id,
      outletId,
      mutationType,
      amount: mutationAmount.toNumber(),
      balanceAfter: currentBalance.toNumber(),
      referenceId: `MAN-LEDGER-${id.slice(-6)}`,
      notes,
      proofOfTransfer,
      createdBy: createdBy || "SYSTEM",
    };

    const eventId = await publishEvent(id, {
      type: "OUTLET_BALANCE_MUTATED",
      payload,
    });

    res.status(202).json({ status: "ACCEPTED", eventId, payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. SISTEM PEMBAYARAN BULK (DECIMAL.JS SAFE)
// ==========================================
router.post("/bulk-payment", async (req, res) => {
  try {
    const {
      bulkId: clientBulkId, // Idempotency Key dari Frontend
      outletId,
      targetInvoiceIds,
      amountPaid,
      useDeposit,
      notes,
      proofOfTransfer,
      paymentDate,
      createdBy,
    } = req.body;

    const bulkId = clientBulkId || ulid();

    const receivings = await db
      .select()
      .from(wmsReceiving)
      .where(inArray(wmsReceiving.id, targetInvoiceIds));

    receivings.sort(
      (a, b) =>
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
    );

    let currentBalance = new Decimal(0);
    if (useDeposit) {
      const balanceRecord = await db
        .select()
        .from(wmsOutletBalances)
        .where(eq(wmsOutletBalances.outletId, outletId))
        .limit(1);
      if (balanceRecord.length > 0) {
        currentBalance = new Decimal(balanceRecord[0].balance);
      }
    }

    let remainingDeposit = useDeposit ? currentBalance : new Decimal(0);
    let remainingExternal = new Decimal(amountPaid || 0);
    let remainingFund = remainingExternal.plus(remainingDeposit);

    const allocations = [];

    for (const inv of receivings) {
      if (remainingFund.lte(0)) break;

      const hutangInv = new Decimal(inv.totalAmount);
      const dibayarInv = new Decimal(inv.totalPayment);
      const sisaHutang = hutangInv.minus(dibayarInv);

      if (sisaHutang.lte(0)) continue;

      const payAmount = Decimal.min(remainingFund, sisaHutang);
      remainingFund = remainingFund.minus(payAmount);

      const depositAllocated = Decimal.min(payAmount, remainingDeposit);
      remainingDeposit = remainingDeposit.minus(depositAllocated);

      const externalAllocated = payAmount.minus(depositAllocated);
      remainingExternal = remainingExternal.minus(externalAllocated);

      const newTotalPayment = dibayarInv.plus(payAmount);
      const newPaymentStatus = newTotalPayment.gte(hutangInv)
        ? "PAID"
        : "PARTIAL";

      allocations.push({
        receivingId: inv.id,
        amountAllocated: payAmount.toNumber(),
        depositAmount: depositAllocated.toNumber(),
        externalAmount: externalAllocated.toNumber(),
        newPaymentStatus,
        newTotalPayment: newTotalPayment.toNumber(),
      });
    }

    let overpayment = new Decimal(0);
    let depositUsed = new Decimal(0);

    if (useDeposit) {
      if (remainingFund.gt(currentBalance)) {
        overpayment = remainingFund.minus(currentBalance);
      } else {
        depositUsed = currentBalance.minus(remainingFund);
      }
    } else {
      overpayment = remainingFund;
    }

    const payload = {
      bulkId,
      outletId,
      totalAmountPaid: new Decimal(amountPaid).toNumber(),
      paymentDate: paymentDate || new Date().toISOString(),
      notes,
      proofOfTransfer,
      allocations,
      useDeposit,
      depositUsed: depositUsed.toNumber(),
      overpayment: overpayment.toNumber(),
      createdBy: createdBy || "SYSTEM",
    };

    const eventId = await publishEvent(bulkId, {
      type: "BULK_PIUTANG_PAYMENT_PROCESSED",
      payload,
    });

    res.status(202).json({ status: "ACCEPTED", eventId, payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. SISTEM PEMBAYARAN SATUAN (EXISTING)
// ==========================================
router.post("/payments", async (req, res) => {
  try {
    const eventId = await publishEvent(req.body.id, {
      type: "PAYMENT_CREATED",
      payload: req.body,
    });
    res.status(202).json({ status: "ACCEPTED", eventId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/receiving-status", async (req, res) => {
  try {
    const { id, docStatus } = req.body;
    const eventId = await publishEvent(id, {
      type: "RECEIVING_STATUS_UPDATED",
      payload: { id, docStatus },
    });
    res.status(202).json({ status: "ACCEPTED", eventId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/receiving-update", async (req, res) => {
  try {
    const payload = req.body;
    const eventId = await publishEvent(payload.id, {
      type: "RECEIVING_UPDATED",
      payload: payload,
    });
    res.status(202).json({ status: "ACCEPTED", eventId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/payments/:id", async (req, res) => {
  try {
    const eventId = await publishEvent(req.params.id, {
      type: "PAYMENT_VOIDED",
      payload: { paymentId: req.params.id },
    });
    res.status(202).json({ status: "ACCEPTED", eventId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
