// Path: apps/backend/src/workers/pos/sales.worker.ts
import { getNatsInstance, sc } from "../../services/nats";
import { db } from "../../db";
import { invoices, payments, refunds, orderItems } from "../../db/schema";
import { eq, sql, and } from "drizzle-orm";
import { AckPolicy } from "nats";

export const startSalesWorker = async () => {
  const { js, jsm } = getNatsInstance();
  const streamName = "ASSTRO_EVENTS";
  const consumerName = "sales_domain_worker";

  await jsm.consumers.add(streamName, {
    durable_name: consumerName,
    ack_policy: AckPolicy.Explicit,
    filter_subject: "events.sync",
  });

  const consumer = await js.consumers.get(streamName, consumerName);
  const messages = await consumer.consume();

  for await (const m of messages) {
    try {
      const payload = JSON.parse(sc.decode(m.data));

      const salesEvents = [
        "INVOICE_CREATED",
        "PAYMENT_RECEIVED",
        "PAYMENT_REFUNDED",
      ];

      if (salesEvents.includes(payload.eventType)) {
        console.log(
          `💰 [SALES WORKER] Memproses Keuangan: ${payload.eventType}`,
        );
        await processSales(payload, js);
      }

      m.ack();
    } catch (error) {
      console.error("❌ Sales Worker Error:", error);
      m.nak();
    }
  }
};

async function processSales(entry: any, js: any) {
  const p = entry.payload;
  const branchId = entry.branchId;

  if (entry.eventType === "INVOICE_CREATED") {
    await db
      .insert(invoices)
      .values({
        id: p.invoiceId,
        branchId,
        orderId: p.orderId || null,
        invoiceNumber: p.invoiceNumber,
        // PROTEKSI INTEGER: Bulatkan semua nilai finansial
        subtotal: Math.round(Number(p.subtotal) || 0),
        taxRate: Number(p.taxRate) || 0,
        taxAmount: Math.round(Number(p.taxAmount) || 0),
        serviceRate: Number(p.serviceRate) || 0,
        serviceAmount: Math.round(Number(p.serviceAmount) || 0),
        discountAmount: Math.round(Number(p.discountAmount) || 0),
        grandTotal: Math.round(Number(p.grandTotal) || 0),
        status: p.status,
        businessDate: p.businessDate || "1970-01-01",
      })
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          branchId: sql`excluded.branch_id`,
          orderId: sql`excluded.order_id`,
          invoiceNumber: sql`excluded.invoice_number`,
          subtotal: sql`excluded.subtotal`,
          taxRate: sql`excluded.tax_rate`,
          taxAmount: sql`excluded.tax_amount`,
          serviceRate: sql`excluded.service_rate`,
          serviceAmount: sql`excluded.service_amount`,
          discountAmount: sql`excluded.discount_amount`,
          grandTotal: sql`excluded.grand_total`,
          status: sql`excluded.status`,
          businessDate: sql`excluded.business_date`,
          updatedAt: new Date(),
        },
      });
  }

  if (entry.eventType === "PAYMENT_RECEIVED") {
    const validMethods = ["CASH", "CARD", "QRIS", "EWALLET", "BANK_TRANSFER"];
    let validMethod = (p.method || "CASH").toUpperCase();
    if (!validMethods.includes(validMethod)) {
      validMethod = validMethod.includes("DEBIT") ? "CARD" : "CASH";
    }

    const validCaptureModes = ["MANUAL", "INTEGRATED"];
    let validCaptureMode = (p.captureMode || "MANUAL").toUpperCase();
    if (!validCaptureModes.includes(validCaptureMode)) {
      validCaptureMode = "MANUAL";
    }
    const validProviders = [
      "BCA_EDC",
      "MANDIRI_EDC",
      "MIDTRANS",
      "XENDIT",
      "STRIPE",
      "ADYEN",
      "VERIFONE",
      "INGENICO",
    ];
    let safeProvider = p.provider;
    if (safeProvider && !validProviders.includes(safeProvider)) {
      safeProvider = null; // Menjadi NULL jika providernya asalan seperti "Local"
    }

    await db
      .insert(payments)
      .values({
        id: p.paymentId,
        branchId,
        invoiceId: p.invoiceId,
        operatorId: p.operatorId,
        method: validMethod as any,
        captureMode: validCaptureMode as any,
        provider: safeProvider,
        // PROTEKSI INTEGER
        amountPaid: Math.round(Number(p.amountPaid) || 0),
        changeAmount: Math.round(Number(p.changeAmount) || 0),
        referenceNumber: p.referenceNumber || null,
        approvalCode: p.approvalCode || null,
        traceNumber: p.traceNumber || null,
        batchNumber: p.batchNumber || null,
        settlementMetadata: p.settlementMetadata || null,
      })
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          branchId: sql`excluded.branch_id`,
          invoiceId: sql`excluded.invoice_id`,
          operatorId: sql`excluded.operator_id`,
          method: sql`excluded.method`,
          captureMode: sql`excluded.capture_mode`,
          provider: sql`excluded.provider`,
          amountPaid: sql`excluded.amount_paid`,
          changeAmount: sql`excluded.change_amount`,
          referenceNumber: sql`excluded.reference_number`,
          approvalCode: sql`excluded.approval_code`,
          traceNumber: sql`excluded.trace_number`,
          batchNumber: sql`excluded.batch_number`,
          settlementMetadata: sql`excluded.settlement_metadata`,
        },
      });

    await db
      .update(invoices)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(invoices.id, p.invoiceId));

    console.log(
      `   └─ Triggering Saga: Meminta Inventory untuk memotong stok...`,
    );
    await js.publish(
      "saga.inventory.deduct",
      sc.encode(
        JSON.stringify({
          invoiceId: p.invoiceId,
          branchId: branchId,
          timestamp: Date.now(),
        }),
      ),
    );
  }

  if (entry.eventType === "PAYMENT_REFUNDED") {
    const validRefundMethods = [
      "CASH",
      "CARD",
      "QRIS",
      "EWALLET",
      "BANK_TRANSFER",
    ];
    let validRefundMethod = (p.refundMethod || "CASH").toUpperCase();
    if (!validRefundMethods.includes(validRefundMethod)) {
      validRefundMethod = "CASH";
    }

    // ====================================================================
    // [SMART ID RESOLVER] Penerjemah Nomor Nota (INV) menjadi UUID Database
    // ====================================================================
    let targetInvoiceId = p.invoiceId;

    if (targetInvoiceId && targetInvoiceId.startsWith("INV-")) {
      console.log(
        `   └─ 🔍 Menerjemahkan nomor faktur ${targetInvoiceId} menjadi Internal ID...`,
      );
      const dbInvoice = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.invoiceNumber, targetInvoiceId))
        .limit(1);

      if (dbInvoice.length > 0) {
        targetInvoiceId = dbInvoice[0].id;
      } else {
        throw new Error(
          `Faktur ${targetInvoiceId} tidak ditemukan di database pusat!`,
        );
      }
    }
    await db
      .insert(refunds)
      .values({
        id: p.refundId,
        branchId,
        invoiceId: targetInvoiceId,
        operatorId: p.operatorId,
        refundMethod: validRefundMethod as any,
        totalRefundAmount: p.totalRefundAmount,
        reason: p.reason,
        itemsJson: p.items || [],
      })
      .onConflictDoUpdate({
        target: refunds.id,
        set: {
          refundMethod: sql`excluded.refund_method`,
          totalRefundAmount: sql`excluded.total_refund_amount`,
          reason: sql`excluded.reason`,
          itemsJson: sql`excluded.items_json`,
        },
      });
    if (Array.isArray(p.items)) {
      for (const refundItem of p.items) {
        await db
          .update(orderItems)
          .set({
            refundedQty: sql`refunded_qty + ${refundItem.qtyRefunded}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              sql`order_id IN (SELECT order_id FROM invoices WHERE id = ${targetInvoiceId})`,
              eq(orderItems.skuSnapshot, refundItem.sku),
            ),
          );
      }
    }

    await db
      .update(invoices)
      .set({ status: "refunded", updatedAt: new Date() })
      .where(eq(invoices.id, targetInvoiceId));

    console.log(
      `   └─ ✅ Refund ${p.refundId} berhasil diproses untuk Invoice DB ID: ${targetInvoiceId}.`,
    );
  }
}
