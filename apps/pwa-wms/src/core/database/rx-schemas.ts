import { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from "rxdb";

export const wmsOutboxSchemaLiteral = {
  title: "wms outbox schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    aggregateId: { type: "string" },
    type: { type: "string" },
    payload: { type: "object" },
    createdAt: { type: "string" },
    syncStatus: { type: "string", enum: ["PENDING", "SYNCED", "FAILED"] },
  },
  required: ["id", "aggregateId", "type", "payload", "createdAt", "syncStatus"],
} as const;
export type WmsOutboxDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsOutboxSchemaLiteral
>;
export const wmsOutboxSchema: RxJsonSchema<WmsOutboxDocType> =
  wmsOutboxSchemaLiteral;

export const wmsVendorsSchemaLiteral = {
  title: "wms vendors schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    regionId: { type: "string" },
    name: { type: "string" },
    contactPerson: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    bankName: { type: ["string", "null"] },
    bankAccountName: { type: ["string", "null"] },
    bankAccountNumber: { type: ["string", "null"] },
    certifications: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    contractFileUrl: { type: ["string", "null"] },
    isActive: { type: ["boolean", "null"] },
    createdAt: { type: ["string", "null"] },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["id", "regionId", "name"],
} as const;
export type WmsVendorsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsVendorsSchemaLiteral
>;
export const wmsVendorsSchema: RxJsonSchema<WmsVendorsDocType> =
  wmsVendorsSchemaLiteral;

export const wmsGlobalProductsSchemaLiteral = {
  title: "wms global products schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    categoryId: { type: "string" },
    baseUom: { type: "string" },
    status: { type: ["string", "null"] },
    createdAt: { type: ["string", "null"] },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["id", "name", "categoryId", "baseUom"],
} as const;
export type WmsGlobalProductsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsGlobalProductsSchemaLiteral
>;
export const wmsGlobalProductsSchema: RxJsonSchema<WmsGlobalProductsDocType> =
  wmsGlobalProductsSchemaLiteral;

export const wmsRegionalItemsSchemaLiteral = {
  title: "wms regional items schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    regionId: { type: "string" },
    branchId: { type: ["string", "null"] },
    localName: { type: "string" },
    localCategory: { type: ["string", "null"] },
    uom: { type: "string" },
    purchasePrice: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    margin: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    sellingPrice: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    globalId: { type: ["string", "null"] },
    mergeStatus: { type: ["string", "null"] },
    status: { type: ["string", "null"] },
    createdAt: { type: ["string", "null"] },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["id", "regionId", "localName", "uom"],
} as const;
export type WmsRegionalItemsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsRegionalItemsSchemaLiteral
>;
export const wmsRegionalItemsSchema: RxJsonSchema<WmsRegionalItemsDocType> =
  wmsRegionalItemsSchemaLiteral;

export const wmsCategoriesSchemaLiteral = {
  title: "wms categories schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    status: { type: ["string", "null"] },
    createdAt: { type: ["string", "null"] },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["id", "name"],
} as const;
export type WmsCategoriesDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsCategoriesSchemaLiteral
>;
export const wmsCategoriesSchema: RxJsonSchema<WmsCategoriesDocType> =
  wmsCategoriesSchemaLiteral;

export const wmsPiutangSchemaLiteral = {
  title: "wms piutang schema",
  version: 1, // <--- SUDAH DINAIKKAN MENJADI 1 UNTUK MENGHINDARI ERROR DB6
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    tanggal: { type: "string" },
    outlet: { type: "string" },
    total: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    dibayar: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    sisa: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    status: { type: "string" },
    docStatus: { type: "string" },
    jatuhTempo: { type: "string" },
    payments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          date: { type: "string" },
          amount: {
            anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
          },
          depositAmount: {
            anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
          },
          externalAmount: {
            anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
          },
          proof: { type: ["string", "null"] },
          notes: { type: "string" },
        },
      },
    },
    items: { type: "array", items: { type: "object" } },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["id", "tanggal", "outlet", "total", "dibayar", "sisa", "status"],
} as const;
export type WmsPiutangDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsPiutangSchemaLiteral
>;
export const wmsPiutangSchema: RxJsonSchema<WmsPiutangDocType> =
  wmsPiutangSchemaLiteral;

export const wmsOutletBalancesSchemaLiteral = {
  title: "wms outlet balances schema",
  version: 0,
  primaryKey: "outletId",
  type: "object",
  properties: {
    outletId: { type: "string", maxLength: 100 },
    balance: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    updatedAt: { type: ["string", "null"] },
  },
  required: ["outletId"],
} as const;
export type WmsOutletBalancesDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsOutletBalancesSchemaLiteral
>;
export const wmsOutletBalancesSchema: RxJsonSchema<WmsOutletBalancesDocType> =
  wmsOutletBalancesSchemaLiteral;

export const wmsLedgerSchemaLiteral = {
  title: "wms ledger schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    outletId: { type: "string" },
    mutationType: { type: "string" },
    amount: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    balanceAfter: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    notes: { type: ["string", "null"] },
    createdBy: { type: ["string", "null"] },
    createdAt: { type: ["string", "null"] },
  },
  required: ["id", "outletId", "mutationType"],
} as const;
export type WmsLedgerDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsLedgerSchemaLiteral
>;
export const wmsLedgerSchema: RxJsonSchema<WmsLedgerDocType> =
  wmsLedgerSchemaLiteral;

// --- TAMBAHAN SKEMA BARU: WMS RECEIVINGS ---
export const wmsReceivingsSchemaLiteral = {
  title: "wms receivings schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 150 },
    regionId: { type: "string" },
    branchId: { type: ["string", "null"] },
    transactionType: { type: "string" },
    sourceEntity: { type: "string" },
    invoiceNumber: { type: ["string", "null"] },
    totalAmount: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    paymentStatus: { type: "string" },
    totalPayment: {
      anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
    },
    dueDate: { type: ["string", "null"] },
    status: { type: "string" },
    receivedAt: { type: "string" },
    proofOfTransaction: { type: ["string", "null"] },
    paymentMethod: { type: ["string", "null"] },
    fundingSource: { type: ["string", "null"] },
    mutationType: { type: ["string", "null"] },
    targetRegionId: { type: ["string", "null"] },
    loanStatus: { type: ["string", "null"] },
    returnMethod: { type: ["string", "null"] },
    items: { type: "array", items: { type: "object" } },
    payments: { type: "array", items: { type: "object" } },
    createdAt: { type: ["string", "null"] },
    updatedAt: { type: ["string", "null"] },
  },
  required: [
    "id",
    "regionId",
    "transactionType",
    "sourceEntity",
    "totalAmount",
    "paymentStatus",
    "totalPayment",
    "status",
    "receivedAt",
  ],
} as const;
export type WmsReceivingsDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof wmsReceivingsSchemaLiteral
>;
export const wmsReceivingsSchema: RxJsonSchema<WmsReceivingsDocType> =
  wmsReceivingsSchemaLiteral;
