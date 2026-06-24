// Path: apps/backend/src/workers/pos/pos-projector.ts
import { getNatsInstance, sc } from "../../services/nats";
import { db } from "../../db";
import {
  productCategories,
  products,
  orders,
  orderItems,
} from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ulid } from "ulidx";
import { AckPolicy } from "nats";

export const startPosProjector = async () => {
  const { js, jsm } = getNatsInstance();
  const streamName = "ASSTRO_EVENTS";
  const consumerName = "sync_projector_worker";

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

      // [+] TAMBAHKAN PAYMENT_RECEIVED & ORDER_REFUNDED KE PROJECTOR
      const projectorEvents = [
        "ORDER_CREATED",
        "ORDER_UPDATED",
        "KDS_STATUS_UPDATED",
        "ORDER_CANCELLED",
        "TABLE_PAYMENT_PROCESSED",
        "PAYMENT_RECEIVED", // Sinyal Uang Masuk
        "ORDER_REFUNDED", // Sinyal Jurnal Refund
      ];

      if (projectorEvents.includes(payload.eventType)) {
        console.log(
          `\n🍽️ [PROJECTOR WORKER] Memproses Operasional: ${payload.eventType}`,
        );
        await processEvent(payload);
      } else {
        console.log(
          `⏩ [PROJECTOR WORKER] Event diabaikan: ${payload.eventType}`,
        );
      }

      m.ack();
    } catch (error) {
      console.error("❌ Projector Worker gagal memproses event:", error);
      m.nak();
    }
  }
};

async function processEvent(entry: any) {
  const p = entry.payload;
  const branchId = entry.branchId;

  switch (entry.eventType) {
    case "KDS_STATUS_UPDATED": {
      await db
        .update(orderItems)
        .set({ status: p.status, updatedAt: new Date() })
        .where(
          and(
            eq(orderItems.orderId, p.orderId),
            eq(orderItems.skuSnapshot, p.sku),
          ),
        );
      break;
    }

    case "ORDER_CANCELLED": {
      if (p.orderId) {
        await db
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, p.orderId));
      }
      break;
    }

    // [ENTERPRISE FIX]: AUTO-LOCK PESANAN BERDASARKAN UANG MASUK (Mencegah Race Condition/Gantung)
    case "PAYMENT_RECEIVED": {
      console.log(
        `   └─ [AUTO-LOCK] Mengamankan status pesanan menjadi 'completed' secara mandiri.`,
      );

      // Jika payload sudah membawa orderId dari frontend, tembak langsung (Sangat Cepat)
      if (p.orderId) {
        await db
          .update(orders)
          .set({ status: "completed", updatedAt: new Date() })
          .where(and(eq(orders.id, p.orderId), eq(orders.status, "open")));
      } else if (p.invoiceId) {
        // Fallback jika tidak ada orderId (Risiko Race Condition kecil)
        await db.execute(sql`
          UPDATE orders 
          SET status = 'completed', updated_at = NOW() 
          WHERE id IN (
            SELECT order_id FROM invoices WHERE id = ${p.invoiceId} AND order_id IS NOT NULL
          ) AND status = 'open'
        `);
      }
      break;
    }

    // [FIX JURNAL]: Merekam Event Jurnal Refund Operasional
    case "ORDER_REFUNDED": {
      console.log(
        `   └─ [AUDIT JURNAL] Event pengembalian dana tercatat secara operasional pada Invoice ID: ${p.invoiceId}.`,
      );
      // Event ini kini resmi masuk ke arus aliran Event Source backend.
      break;
    }

    // [ENTERPRISE FIX]: SAPU BERSIH STATUS MEJA
    case "TABLE_PAYMENT_PROCESSED": {
      if (p.tableLabel) {
        const cleanLabel = p.tableLabel.trim().toUpperCase();
        await db.execute(sql`
          UPDATE orders 
          SET status = 'completed', updated_at = NOW() 
          WHERE UPPER(table_label) = ${cleanLabel} AND status = 'open'
        `);
      }
      break;
    }

    case "ORDER_CREATED":
    case "ORDER_UPDATED": {
      await db
        .insert(orders)
        .values({
          id: p.orderId,
          branchId: branchId,
          operatorId: p.operatorId,
          tableLabel: p.tableLabel,
          customerName: p.customerName || null,
          guestCount: p.guestCount || 1,
          status: "open",
          businessDate: p.businessDate || "1970-01-01",
        })
        .onConflictDoUpdate({
          target: orders.id,
          set: {
            branchId: sql`excluded.branch_id`,
            operatorId: sql`excluded.operator_id`,
            tableLabel: sql`excluded.table_label`,
            customerName: sql`excluded.customer_name`,
            guestCount: sql`excluded.guest_count`,
            // PROTEKSI: Jika Event ini telat datang dan status sudah 'completed', abaikan perubahan menjadi 'open'
            status: sql`CASE WHEN orders.status IN ('completed', 'cancelled') THEN orders.status ELSE 'open' END`,
            businessDate: sql`excluded.business_date`,
            updatedAt: new Date(),
          },
        });

      for (const item of p.items) {
        const safeItemId = item.id ? item.id.substring(0, 26) : ulid();
        const fallbackCatId = "CAT-RCV";

        await db
          .insert(productCategories)
          .values({ id: fallbackCatId, name: "RECOVERY", code: "RCV-01" })
          .onConflictDoNothing();

        const productResult = await db
          .insert(products)
          .values({
            id:
              item.productId && item.productId !== "UNKNOWN"
                ? item.productId.substring(0, 26)
                : ulid(),
            sku: item.skuSnapshot,
            name: item.nameSnapshot,
            basePrice: item.basePriceSnapshot,
            categoryId: fallbackCatId,
          })
          .onConflictDoUpdate({
            target: products.sku,
            set: { sku: sql`excluded.sku` },
          })
          .returning({ id: products.id });

        await db
          .insert(orderItems)
          .values({
            id: safeItemId,
            orderId: p.orderId,
            productId: productResult[0].id,
            skuSnapshot: item.skuSnapshot,
            nameSnapshot: item.nameSnapshot,
            basePriceSnapshot: item.basePriceSnapshot,
            qty: item.qty,
            voidedQty: item.voidedQty || 0,
            refundedQty: item.refundedQty || 0,
            status: item.status || "PENDING",
            voidReason: item.voidReason || null,
            notes: item.notes || null,
          })
          .onConflictDoUpdate({
            target: orderItems.id,
            set: {
              orderId: sql`excluded.order_id`,
              productId: sql`excluded.product_id`,
              skuSnapshot: sql`excluded.sku_snapshot`,
              nameSnapshot: sql`excluded.name_snapshot`,
              basePriceSnapshot: sql`excluded.base_price_snapshot`,
              qty: sql`excluded.qty`,
              voidedQty: sql`excluded.voided_qty`,
              refundedQty: sql`excluded.refunded_qty`,
              status: sql`excluded.status`,
              voidReason: sql`excluded.void_reason`,
              notes: sql`excluded.notes`,
              updatedAt: new Date(),
            },
          });
      }
      break;
    }

    default:
      console.warn(`⚠️ Event tidak dikenali: ${entry.eventType}`);
  }
}
