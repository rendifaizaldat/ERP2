import { getNatsInstance } from "../../services/nats";
import { db } from "../../db";
import {
  wmsGlobalCategories,
  wmsGlobalProducts,
  wmsRegionalItems,
} from "../../db/schema";
import { branches } from "../../db/schema/master/organization";
import { wmsProcessedEvents } from "../../db/schema/db_wms/wms.events";
import {
  wmsReceiving,
  wmsReceivingItems,
  wmsPayments,
} from "../../db/schema/db_wms/wms.transactions";
import { wmsVendors } from "../../db/schema/db_wms/wms.vendors";
// IMPORT TABEL AKUNTING
import type { WmsEventEnvelope } from "@asstro/protocol/src/wms-events";
import { eq, inArray } from "drizzle-orm";
import { AckPolicy } from "nats";
import crypto from "crypto";
import { publishSyncHint } from "../../services/websocket";

/**
 * Daftar event WMS yang diproyeksikan oleh projector ini.
 * Event selain ini (misalnya wallet) akan diabaikan agar tidak mengganggu worker lain.
 */
const PROJECTOR_EVENT_TYPES = new Set([
  "GLOBAL_CATEGORY_CREATED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "GLOBAL_CATEGORY_DELETED",
  "CATEGORY_DELETED",
  "MASTER_PRODUCT_ADDED",
  "REGIONAL_ITEM_SUBMITTED",
  "OUTLET_PRODUCT_UPDATED",
  "REGIONAL_ITEM_UPDATED",
  "ITEMS_LINKED_TO_MASTER",
  "ITEMS_BATCH_CENTRALIZED",
  "ITEMS_BULK_VERIFIED",
  "ITEM_UNMERGED",
  "VENDOR_CREATED",
  "VENDOR_UPDATED",
  "VENDOR_DELETED",
  "RECEIVING_OUTLET_SUBMITTED",
  "RECEIVING_PUSAT_SUBMITTED",
  "AP_OUTLET_PAYMENT_SUBMITTED",
]);

export async function startWmsProjector() {
  try {
    const { js, jsm } = getNatsInstance();
    const streamName = "ASSTRO_EVENTS";

    // Pastikan durable consumer ada
    try {
      await jsm.consumers.info(streamName, "wms_projector_worker");
    } catch (err: any) {
      if (err.message === "consumer not found") {
        await jsm.consumers.add(streamName, {
          durable_name: "wms_projector_worker",
          ack_policy: AckPolicy.Explicit,
          filter_subject: "events.wms",
        });
      }
    }

    const consumer = await js.consumers.get(streamName, "wms_projector_worker");
    const messages = await consumer.consume();

    for await (const msg of messages) {
      try {
        const envelope: WmsEventEnvelope = JSON.parse(msg.data.toString());
        const eventType = envelope.event.type;
        const payload = envelope.event.payload;

        // --- 1. Cek event sudah pernah diproses oleh projector ini ---
        const existingEvent = await db
          .select()
          .from(wmsProcessedEvents)
          .where(eq(wmsProcessedEvents.eventId, envelope.eventId))
          .limit(1);

        if (existingEvent.length > 0) {
          msg.ack();
          continue;
        }

        // --- 2. Abaikan event di luar tanggung jawab projector ini ---
        if (!PROJECTOR_EVENT_TYPES.has(eventType)) {
          // Bukan domain kami, ack agar tidak menghalangi worker lain
          msg.ack();
          continue;
        }

        // --- 3. Proses event yang dikenali ---
        let handled = false; // Menandai apakah benar-benar melakukan mutasi data

        await db.transaction(async (tx) => {
          switch (eventType) {
            case "GLOBAL_CATEGORY_CREATED":
            case "CATEGORY_CREATED":
              await tx
                .insert(wmsGlobalCategories)
                .values({
                  id: payload.id || envelope.aggregateId,
                  name: payload.name,
                  status: payload.status || "ACTIVE",
                })
                .onConflictDoUpdate({
                  target: wmsGlobalCategories.id,
                  set: {
                    name: payload.name,
                    status: payload.status || "ACTIVE",
                    updatedAt: new Date(),
                  },
                });
              handled = true;
              break;

            case "CATEGORY_UPDATED":
              await tx
                .update(wmsGlobalCategories)
                .set({
                  name: payload.name,
                  status: payload.status || "ACTIVE",
                  updatedAt: new Date(),
                })
                .where(eq(wmsGlobalCategories.id, envelope.aggregateId));
              handled = true;
              break;

            case "GLOBAL_CATEGORY_DELETED":
            case "CATEGORY_DELETED":
              await tx
                .update(wmsGlobalCategories)
                .set({ status: "ARCHIVED", updatedAt: new Date() })
                .where(
                  eq(
                    wmsGlobalCategories.id,
                    payload.id || envelope.aggregateId,
                  ),
                );
              handled = true;
              break;

            case "MASTER_PRODUCT_ADDED":
              await tx.insert(wmsRegionalItems).values({
                id: envelope.aggregateId,
                regionId: payload.regionId,
                branchId: payload.branchId ?? null,
                localName: payload.name,
                localCategory: payload.categoryId,
                uom: payload.baseUom,
                purchasePrice: payload.purchasePrice ?? payload.price ?? 0,
                margin: payload.margin?.toString() || "0",
                sellingPrice: payload.sellingPrice ?? 0,
                mergeStatus: "UNMERGED",
                globalId: null,
                status: "ACTIVE",
              });
              handled = true;
              break;

            case "REGIONAL_ITEM_SUBMITTED":
              await tx.insert(wmsRegionalItems).values({
                id: payload.id || envelope.aggregateId,
                regionId: payload.regionId,
                branchId: payload.branchId || null,
                localName: payload.localName,
                localCategory: payload.localCategory || null,
                uom: payload.uom,
                purchasePrice: payload.purchasePrice,
                margin: payload.margin?.toString() || "0",
                sellingPrice: payload.sellingPrice,
                mergeStatus: "UNMERGED",
                status: "ACTIVE",
              });
              handled = true;
              break;

            case "OUTLET_PRODUCT_UPDATED":
            case "REGIONAL_ITEM_UPDATED":
              await tx
                .update(wmsRegionalItems)
                .set({
                  localName: payload.localName,
                  purchasePrice: payload.purchasePrice,
                  margin: payload.margin?.toString() || "0",
                  sellingPrice: payload.sellingPrice,
                  status: (payload.status as any) || "ACTIVE",
                })
                .where(
                  eq(wmsRegionalItems.id, payload.id || envelope.aggregateId),
                );
              handled = true;
              break;

            case "ITEMS_LINKED_TO_MASTER": {
              const globalId = payload.globalId;
              const globalProduct = await tx
                .select()
                .from(wmsGlobalProducts)
                .where(eq(wmsGlobalProducts.id, globalId))
                .limit(1);

              const standardizedName =
                globalProduct.length > 0 ? globalProduct[0].name : undefined;

              await tx
                .update(wmsRegionalItems)
                .set({
                  globalId: globalId,
                  localName: standardizedName,
                  mergeStatus: "MERGED",
                })
                .where(inArray(wmsRegionalItems.id, payload.regionalItemIds));
              handled = true;
              break;
            }

            case "ITEMS_BATCH_CENTRALIZED": {
              const targetGlobalId = payload.globalId;
              await tx.insert(wmsGlobalProducts).values({
                id: targetGlobalId,
                name: payload.globalName,
                baseUom: payload.baseUom as any,
                categoryId: payload.categoryId,
                status: "ACTIVE",
              });

              await tx
                .update(wmsRegionalItems)
                .set({
                  globalId: targetGlobalId,
                  localName: payload.globalName,
                  mergeStatus: "MERGED",
                })
                .where(inArray(wmsRegionalItems.id, payload.regionalItemIds));
              handled = true;
              break;
            }

            case "ITEMS_BULK_VERIFIED": {
              for (const v of payload.verifications) {
                const itemsToVerify = await tx
                  .select()
                  .from(wmsRegionalItems)
                  .where(eq(wmsRegionalItems.id, v.regionalItemId));

                if (itemsToVerify.length > 0) {
                  const item = itemsToVerify[0];
                  const safeName = item.localName || "UNKNOWN";
                  const safeUom = item.uom || "PCS";

                  await tx.insert(wmsGlobalProducts).values({
                    id: v.globalId,
                    name: safeName.toUpperCase(),
                    baseUom: safeUom.toUpperCase() as any,
                    categoryId: payload.categoryId,
                    status: "ACTIVE",
                  });

                  await tx
                    .update(wmsRegionalItems)
                    .set({
                      globalId: v.globalId,
                      localCategory: payload.categoryId,
                      mergeStatus: "MERGED",
                    })
                    .where(eq(wmsRegionalItems.id, item.id));
                }
              }
              handled = true;
              break;
            }

            case "ITEM_UNMERGED":
              await tx
                .update(wmsRegionalItems)
                .set({
                  globalId: null,
                  mergeStatus: "UNMERGED",
                })
                .where(
                  eq(
                    wmsRegionalItems.id,
                    payload.regionalItemId || envelope.aggregateId,
                  ),
                );
              handled = true;
              break;

            case "VENDOR_CREATED":
              await tx
                .insert(wmsVendors)
                .values({ ...payload, isActive: true });
              handled = true;
              break;

            case "VENDOR_UPDATED":
              await tx
                .update(wmsVendors)
                .set({ ...payload })
                .where(eq(wmsVendors.id, payload.id || envelope.aggregateId));
              handled = true;
              break;

            case "VENDOR_DELETED":
              await tx
                .update(wmsVendors)
                .set({ isActive: false })
                .where(eq(wmsVendors.id, payload.id || envelope.aggregateId));
              handled = true;
              break;

            case "RECEIVING_OUTLET_SUBMITTED":
            case "RECEIVING_PUSAT_SUBMITTED": {
              await tx.insert(wmsReceiving).values({
                id: payload.id,
                regionId: payload.regionId,
                branchId: payload.branchId || null,
                transactionType: payload.transactionType,
                sourceEntity: payload.sourceEntity,
                invoiceNumber: payload.invoiceNumber,
                totalAmount: payload.totalAmount.toString(),
                paymentStatus: payload.paymentStatus,
                totalPayment: payload.totalPayment.toString(),
                dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                status: "COMPLETED",
                receivedAt: new Date(payload.receivedAt),
                proofOfTransaction: payload.proofOfTransaction || null,
                paymentMethod: payload.paymentMethod || null,
                fundingSource: payload.fundingSource || null,
                mutationType: payload.mutationType || null,
                targetRegionId: payload.targetRegionId || null,
                loanStatus: payload.loanStatus || null,
                returnMethod: payload.returnMethod || null,
              });

              const itemValues = payload.items.map((item: any) => ({
                id: crypto.randomUUID(),
                receivingId: payload.id,
                regionalItemId: item.regionalItemId,
                itemName: item.itemName,
                uom: item.uom,
                qty: item.qty.toString(),
                price: item.price.toString(),
                subtotal: item.subtotal.toString(),
              }));

              if (itemValues.length > 0) {
                await tx.insert(wmsReceivingItems).values(itemValues);
              }
              handled = true;
              break;
            }

            case "AP_OUTLET_PAYMENT_SUBMITTED": {
              await tx.insert(wmsPayments).values({
                id: payload.id,
                receivingId: payload.receivingId,
                amount: payload.amount.toString(),
                status: "SUCCESS",
                depositAmount: "0",
                externalAmount: "0",
                paymentMethod: payload.paymentMethod || null,
                fundingSource: payload.fundingSource || null,
                paymentDate: new Date(payload.paymentDate),
                proofOfTransfer: payload.proofOfTransfer || null,
                notes: payload.notes || null,
                createdBy: payload.createdBy || "SYSTEM",
              });

              const updateData: any = {
                paymentStatus: payload.newPaymentStatus,
                totalPayment: payload.newTotalPayment.toString(),
                updatedAt: new Date(),
              };

              if (payload.newLoanStatus) {
                updateData.loanStatus = payload.newLoanStatus;
              }

              await tx
                .update(wmsReceiving)
                .set(updateData)
                .where(eq(wmsReceiving.id, payload.receivingId));

              handled = true;
              break;
            }

            default:
              // Secara teori tidak mungkin terjadi karena filter di atas,
              // tetapi jaga-jaga agar tidak mencatat idempotensi.
              break;
          }

          // Hanya catat idempotensi jika benar-benar terjadi mutasi
          if (handled) {
            await tx.insert(wmsProcessedEvents).values({
              eventId: envelope.eventId,
              aggregateId: envelope.aggregateId,
              eventType: eventType,
            });
          }
        });

        // Jika handled = true, ack dan kirim sync hint; jika tidak (tidak mungkin karena filter),
        // tetap ack agar tidak macet.
        msg.ack();

        if (handled) {
          // ====================================================================
          // ROUTING CERDAS WEBSOCKET (Trigger Sync Hint PWA)
          // ====================================================================
          let targetBranchId = "GLOBAL";

          if (
            eventType === "RECEIVING_OUTLET_SUBMITTED" ||
            eventType === "RECEIVING_PUSAT_SUBMITTED" ||
            eventType === "AP_OUTLET_PAYMENT_SUBMITTED"
          ) {
            targetBranchId = payload.branchId || "PUSAT";
          } else if (
            eventType === "REGIONAL_ITEM_SUBMITTED" ||
            eventType === "OUTLET_PRODUCT_UPDATED" ||
            eventType === "REGIONAL_ITEM_UPDATED"
          ) {
            targetBranchId = payload.branchId || "GLOBAL";
          }

          publishSyncHint("TENANT_ASSTRO", targetBranchId, Date.now());
        }
      } catch (error) {
        console.error(`[WMS Projector Error] Gagal memproses pesan:`, error);
        msg.nak();
      }
    }
  } catch (error) {
    console.error(`[WMS Projector Fatal Error] Engine berhenti:`, error);
  }
}
