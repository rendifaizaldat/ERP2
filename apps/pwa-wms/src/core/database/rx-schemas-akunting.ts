import { RxJsonSchema } from "rxdb";

export const wmsFinancialConfigSchema: RxJsonSchema<any> = {
  title: "wms financial config schema",
  version: 0,
  type: "object",
  primaryKey: "branchId",
  properties: {
    branchId: { type: "string", maxLength: 100 },
    taxRate: { type: "number" },
    serviceRate: { type: "number" },
    apLimitRate: { type: "number" },
    isActive: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    _deleted: { type: "boolean" },
  },
  required: [
    "branchId",
    "taxRate",
    "serviceRate",
    "apLimitRate",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
};

export const wmsWalletAccountSchema: RxJsonSchema<any> = {
  title: "wms wallet account schema",
  version: 0,
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 100 },
    regionId: { type: "string", maxLength: 100 },
    branchId: { type: "string", maxLength: 100 },
    managedBy: { type: "string", maxLength: 50 },
    type: { type: "string", maxLength: 50 },
    bankName: { type: ["string", "null"], maxLength: 100 },
    accountNumber: { type: ["string", "null"], maxLength: 50 },
    accountHolder: { type: ["string", "null"], maxLength: 150 },
    accountName: { type: "string", maxLength: 150 },

    // --- TAMBAHAN BARU ---
    binding: {
      type: "array",
      items: {
        type: "string",
      },
    },

    isActive: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: ["string", "null"] },
    _deleted: { type: "boolean" },
  },
  required: [
    "id",
    "regionId",
    "branchId",
    "managedBy",
    "type",
    "accountName",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
  indexes: [["branchId"], ["regionId"], ["managedBy"]],
};

export const wmsWalletLedgerSchema: RxJsonSchema<any> = {
  title: "wms wallet ledger schema",
  version: 0,
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 100 },
    transactionId: { type: "string", maxLength: 100 },
    accountId: { type: "string", maxLength: 100 },
    branchId: { type: "string", maxLength: 100 },
    mutationType: { type: "string", maxLength: 10, enum: ["IN", "OUT"] },
    amount: { type: "number" },
    referenceType: { type: "string", maxLength: 100 },
    referenceId: { type: ["string", "null"], maxLength: 100 },
    operatorId: { type: ["string", "null"], maxLength: 100 },
    notes: { type: ["string", "null"], maxLength: 500 },
    createdAt: { type: "string", maxLength: 30 },
    _deleted: { type: "boolean" },
  },
  required: [
    "id",
    "transactionId",
    "accountId",
    "branchId",
    "mutationType",
    "amount",
    "referenceType",
    "createdAt",
  ],
  indexes: [["branchId"], ["accountId"], ["transactionId"], ["createdAt"]],
};
