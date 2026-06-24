import { getWmsDb } from "./database/rx-db";
import { WmsOutboxDocType } from "./database/rx-schemas";
import { STORAGE_KEYS } from "./constants";

// Field yang diizinkan untuk koleksi wms_categories
const ALLOWED_CATEGORY_FIELDS = [
  "id",
  "name",
  "status",
  "createdAt",
  "updatedAt",
];

const cleanCategoryPayload = (raw: any) => {
  const cleaned: any = {};
  for (const field of ALLOWED_CATEGORY_FIELDS) {
    if (raw[field] !== undefined) cleaned[field] = raw[field];
  }
  if (!cleaned.id && raw.id) cleaned.id = raw.id;
  if (!cleaned.name && raw.name) cleaned.name = raw.name;
  if (!cleaned.status) cleaned.status = "ACTIVE";
  return cleaned;
};

const applyOptimisticUpdate = async (
  db: any,
  type: string,
  aggregateId: string,
  payload: any,
) => {
  try {
    let finalPayload = payload;

    // Safety: bersihkan payload kategori dari field tak diizinkan
    if (
      (type === "CATEGORY_CREATED" || type === "CATEGORY_UPDATED") &&
      payload
    ) {
      finalPayload = cleanCategoryPayload(payload);
    }

    switch (type) {
      case "CATEGORY_CREATED":
      case "CATEGORY_UPDATED":
        await db.wms_categories.upsert({
          ...finalPayload,
          updatedAt: new Date().toISOString(),
        });
        break;

      case "CATEGORY_DELETED": {
        const cat = await db.wms_categories.findOne(aggregateId).exec();
        if (cat) await cat.incrementalPatch({ status: "ARCHIVED" });
        break;
      }

      case "MASTER_PRODUCT_ADDED": {
        const regionId =
          localStorage.getItem(STORAGE_KEYS.REGION_ID) || "UNKNOWN_REGION";
        const wmsType = localStorage.getItem(STORAGE_KEYS.WMS_TYPE);
        const branchId =
          wmsType === "PUSAT"
            ? null
            : payload.branchId ||
              localStorage.getItem(STORAGE_KEYS.BRANCH_ID) ||
              null;
        await db.wms_regional_items.upsert({
          id: aggregateId,
          regionId,
          branchId,
          localName: payload.name,
          localCategory: payload.categoryId,
          uom: payload.baseUom,
          purchasePrice: payload.price,
          margin: payload.margin,
          sellingPrice: payload.sellingPrice,
          globalId: null,
          mergeStatus: "UNMERGED",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        break;
      }

      case "OUTLET_PRODUCT_UPDATED": {
        const itemToUpdate = await db.wms_regional_items
          .findOne(aggregateId)
          .exec();
        if (itemToUpdate) {
          await itemToUpdate.incrementalPatch({
            localName: payload.localName,
            purchasePrice: payload.purchasePrice,
            margin: payload.margin,
            sellingPrice: payload.sellingPrice,
            status: payload.status,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const fallbackRegion =
            localStorage.getItem(STORAGE_KEYS.REGION_ID) || "UNKNOWN_REGION";
          await db.wms_regional_items.upsert({
            id: aggregateId,
            regionId: fallbackRegion,
            branchId: payload.branchId || null,
            localName: payload.localName,
            uom: "PCS",
            purchasePrice: payload.purchasePrice,
            margin: payload.margin,
            sellingPrice: payload.sellingPrice,
            globalId: null,
            mergeStatus: "UNMERGED",
            status: payload.status || "ACTIVE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case "ITEMS_LINKED_TO_MASTER": {
        if (payload.regionalItemIds?.length) {
          const globalProduct = await db.wms_global_products
            .findOne(payload.globalId)
            .exec();
          for (const rId of payload.regionalItemIds) {
            const item = await db.wms_regional_items.findOne(rId).exec();
            if (item) {
              await item.incrementalPatch({
                globalId: payload.globalId,
                mergeStatus: "MERGED",
                localName: globalProduct ? globalProduct.name : item.localName,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case "ITEMS_BULK_VERIFIED": {
        if (payload.verifications?.length) {
          for (const v of payload.verifications) {
            const item = await db.wms_regional_items
              .findOne(v.regionalItemId)
              .exec();
            if (item) {
              await item.incrementalPatch({
                globalId: v.globalId,
                mergeStatus: "MERGED",
                localCategory: payload.categoryId,
                updatedAt: new Date().toISOString(),
              });
              await db.wms_global_products.upsert({
                id: v.globalId,
                name: item.localName,
                categoryId: payload.categoryId,
                baseUom: item.uom,
                status: "ACTIVE",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case "ITEMS_BATCH_CENTRALIZED": {
        await db.wms_global_products.upsert({
          id: payload.globalId,
          name: payload.globalName,
          categoryId: payload.categoryId,
          baseUom: payload.baseUom,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (payload.regionalItemIds?.length) {
          for (const rId of payload.regionalItemIds) {
            const item = await db.wms_regional_items.findOne(rId).exec();
            if (item) {
              await item.incrementalPatch({
                globalId: payload.globalId,
                mergeStatus: "MERGED",
                localName: payload.globalName,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case "ITEM_UNMERGED": {
        const item = await db.wms_regional_items.findOne(aggregateId).exec();
        if (item) {
          await item.incrementalPatch({
            globalId: null,
            mergeStatus: "UNMERGED",
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case "VENDOR_CREATED":
        await db.wms_vendors.upsert({
          ...payload,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        break;

      case "VENDOR_UPDATED": {
        const vendor = await db.wms_vendors.findOne(aggregateId).exec();
        if (vendor) {
          await vendor.incrementalPatch({
            ...payload,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await db.wms_vendors.upsert({
            ...payload,
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case "VENDOR_DELETED": {
        const vendor = await db.wms_vendors.findOne(aggregateId).exec();
        if (vendor)
          await vendor.incrementalPatch({
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        break;
      }

      case "RECEIVING_PUSAT_SUBMITTED":
      case "RECEIVING_OUTLET_SUBMITTED": {
        await db.wms_receivings.upsert({
          id: payload.id,
          regionId: payload.regionId,
          branchId: payload.branchId || null,
          transactionType: payload.transactionType,
          sourceEntity: payload.sourceEntity,
          invoiceNumber: payload.invoiceNumber || null,
          totalAmount: payload.totalAmount,
          paymentStatus: payload.paymentStatus,
          totalPayment: payload.totalPayment,
          dueDate: payload.dueDate || null,
          status: "COMPLETED",
          receivedAt: payload.receivedAt,
          proofOfTransaction: payload.proofOfTransaction || null,
          paymentMethod: payload.paymentMethod || null,
          fundingSource: payload.fundingSource || null,
          mutationType: payload.mutationType || null,
          targetRegionId: payload.targetRegionId || null,
          loanStatus: payload.loanStatus || null,
          returnMethod: null,
          items: payload.items || [],
          payments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        if (payload.items?.length) {
          const currentBranchId = localStorage.getItem(STORAGE_KEYS.BRANCH_ID);
          for (const purchasedItem of payload.items) {
            const masterData = await db.wms_regional_items
              .findOne(purchasedItem.regionalItemId)
              .exec();
            if (
              masterData &&
              currentBranchId &&
              masterData.branchId === currentBranchId
            ) {
              const current = masterData.toJSON();
              const newBasePrice = Number(purchasedItem.price) || 0;
              const margin = Number(current.margin) || 0;
              const newSellingPrice =
                newBasePrice + (newBasePrice * margin) / 100;
              await publishEvent("OUTLET_PRODUCT_UPDATED", current.id, {
                id: current.id,
                localName: current.localName,
                purchasePrice: newBasePrice,
                margin,
                sellingPrice: newSellingPrice,
                status: current.status,
                branchId: current.branchId,
              });
            }
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // error handling minimal tanpa console log
  }
};

export const publishEvent = async (
  type: string,
  aggregateId: string,
  payload: Record<string, any>,
): Promise<string> => {
  const db = await getWmsDb();
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Hanya tambahkan regionId jika event BUKAN kategori
  if (type !== "CATEGORY_CREATED" && type !== "CATEGORY_UPDATED") {
    if (!payload.regionId) {
      payload.regionId =
        localStorage.getItem(STORAGE_KEYS.REGION_ID) || "UNKNOWN_REGION";
    }
  }

  const eventDoc: WmsOutboxDocType = {
    id: eventId,
    aggregateId,
    type,
    payload,
    createdAt: now,
    syncStatus: "PENDING",
  };

  await db.wms_outbox.insert(eventDoc);
  applyOptimisticUpdate(db, type, aggregateId, payload).catch(() => {});
  return eventId;
};

export const publishEventsBulk = async (
  events: Array<{
    type: string;
    aggregateId: string;
    payload: Record<string, any>;
  }>,
): Promise<string[]> => {
  const db = await getWmsDb();
  const now = new Date().toISOString();
  const localRegionId =
    localStorage.getItem(STORAGE_KEYS.REGION_ID) || "UNKNOWN_REGION";

  const eventDocs: WmsOutboxDocType[] = [];
  const eventIds: string[] = [];

  for (const evt of events) {
    // Hanya tambahkan regionId jika event BUKAN kategori
    if (evt.type !== "CATEGORY_CREATED" && evt.type !== "CATEGORY_UPDATED") {
      if (!evt.payload.regionId) {
        evt.payload.regionId = localRegionId;
      }
    }

    const eventId = crypto.randomUUID();
    eventIds.push(eventId);
    eventDocs.push({
      id: eventId,
      aggregateId: evt.aggregateId,
      type: evt.type,
      payload: evt.payload,
      createdAt: now,
      syncStatus: "PENDING",
    });

    applyOptimisticUpdate(db, evt.type, evt.aggregateId, evt.payload).catch(
      () => {},
    );
  }

  if (eventDocs.length) await db.wms_outbox.bulkInsert(eventDocs);
  return eventIds;
};
