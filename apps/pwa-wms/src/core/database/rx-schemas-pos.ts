import { RxJsonSchema } from "rxdb";

export const wmsPosInvoicesSchema: RxJsonSchema<any> = {
  title: "wms pos invoices schema",
  version: 0,
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 26 }, // ULID
    branchId: { type: "string", maxLength: 26 },
    orderId: { type: ["string", "null"], maxLength: 26 },
    invoiceNumber: { type: "string", maxLength: 50 },
    subtotal: { type: "number" },
    taxRate: { type: "number" },
    taxAmount: { type: "number" },
    serviceRate: { type: "number" },
    serviceAmount: { type: "number" },
    discountAmount: { type: "number" },
    grandTotal: { type: "number" },
    status: {
      type: "string",
      maxLength: 50,
      enum: ["unpaid", "partial", "paid", "void", "refunded", "complimentary"],
    },
    notes: { type: ["string", "null"], maxLength: 255 },
    createdAt: { type: "string", maxLength: 50 },
    updatedAt: { type: "string", maxLength: 50 },
    _deleted: { type: "boolean" },
  },
  required: [
    "id",
    "branchId",
    "invoiceNumber",
    "grandTotal",
    "status",
    "createdAt",
    "updatedAt",
  ],
  indexes: [["branchId"], ["status"], ["createdAt"], ["invoiceNumber"]],
};

export const wmsPosPaymentsSchema: RxJsonSchema<any> = {
  title: "wms pos payments schema",
  version: 0,
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 26 },
    branchId: { type: "string", maxLength: 26 },
    invoiceId: { type: "string", maxLength: 26 },
    operatorId: { type: "string", maxLength: 26 },

    // Spesifikasi Inti Pembayaran
    method: { type: "string", maxLength: 50 },
    captureMode: { type: "string", maxLength: 50, default: "MANUAL" },
    provider: { type: ["string", "null"], maxLength: 50 },

    amountPaid: { type: "number" },
    changeAmount: { type: "number" },

    // Metadata Rekonsiliasi Bank
    referenceNumber: { type: ["string", "null"], maxLength: 100 },
    approvalCode: { type: ["string", "null"], maxLength: 50 },
    traceNumber: { type: ["string", "null"], maxLength: 50 },
    batchNumber: { type: ["string", "null"], maxLength: 50 },
    settlementMetadata: { type: ["object", "null"] },

    createdAt: { type: "string", maxLength: 50 },
    _deleted: { type: "boolean" },
  },
  required: [
    "id",
    "branchId",
    "invoiceId",
    "method",
    "amountPaid",
    "createdAt",
  ],
  indexes: [["branchId"], ["invoiceId"], ["method"]],
};
