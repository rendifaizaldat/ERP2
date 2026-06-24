import { PiutangPusatData, Branch, AccountPayableData } from "./WmsProvider";

export const generateTempId = (prefix: string): string =>
  `${prefix}-${Date.now().toString().slice(-6)}`;

export const generateOutletAbbreviation = (
  branchId: string,
  branches: Branch[],
): string => {
  const sortedBranches = [...branches].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const counts = new Map<string, number>();
  const abbrMap = new Map<string, string>();

  for (const b of sortedBranches) {
    const words = b.name
      .toUpperCase()
      .replace(/[^A-Z ]/g, "")
      .split(" ")
      .filter((w) => w);

    let rawAbbr =
      words.length === 1
        ? words[0].substring(0, 2)
        : words
            .map((w) => w[0])
            .join("")
            .substring(0, 3);

    let count = counts.get(rawAbbr) || 0;
    let finalAbbr = count === 0 ? rawAbbr : `${rawAbbr}${count}`;

    counts.set(rawAbbr, count + 1);
    abbrMap.set(b.id, finalAbbr);
  }

  return abbrMap.get(branchId) || "OUT";
};

export const generateInvoiceNumber = (
  regionName: string,
  branchId: string,
  branches: Branch[],
): string => {
  const regCode = regionName.substring(0, 3).toUpperCase();
  const outletAbbr = generateOutletAbbreviation(branchId, branches);
  return `RO/${regCode}/${outletAbbr}/${Date.now()}`;
};

export const mapPiutangData = (rawData: any[]): PiutangPusatData[] => {
  return rawData.map((d: any) => ({
    id: d.id,
    tanggal: d.receivedAt
      ? new Date(d.receivedAt).toISOString().split("T")[0]
      : "",
    outlet: d.outletName || d.sourceEntity,
    total: Number(d.totalAmount || 0),
    dibayar: Number(d.totalPayment || 0),
    sisa: Math.max(0, Number(d.totalAmount || 0) - Number(d.totalPayment || 0)),
    status: d.paymentStatus,
    docStatus: d.status,
    jatuhTempo: d.dueDate
      ? new Date(d.dueDate).toISOString().split("T")[0]
      : null,
    payments: (d.payments || []).map((p: any) => ({
      id: p.id,
      date: p.paymentDate
        ? new Date(p.paymentDate).toISOString().split("T")[0]
        : "",
      amount: Number(p.amount || 0),
      depositAmount: Number(p.depositAmount || 0), // BARU
      externalAmount: Number(p.externalAmount || 0), // BARU
      proof: p.proofOfTransfer,
      notes: p.notes,
    })),
    items: d.items || [],
  }));
};

export const mapHutangData = (rawData: any[]): AccountPayableData[] => {
  return rawData.map((d: any) => ({
    id: d.id,
    tanggal: d.receivedAt
      ? new Date(d.receivedAt).toISOString().split("T")[0]
      : "",
    vendor: d.sourceEntity,
    total: Number(d.totalAmount || 0),
    dibayar: Number(d.totalPayment || 0),
    sisa: Math.max(0, Number(d.totalAmount || 0) - Number(d.totalPayment || 0)),
    status: d.paymentStatus,
    docStatus: d.status,
    jatuhTempo: d.dueDate
      ? new Date(d.dueDate).toISOString().split("T")[0]
      : null,
    payments: (d.payments || []).map((p: any) => ({
      id: p.id,
      date: p.paymentDate
        ? new Date(p.paymentDate).toISOString().split("T")[0]
        : "",
      amount: Number(p.amount || 0),
      depositAmount: Number(p.depositAmount || 0), // BARU
      externalAmount: Number(p.externalAmount || 0), // BARU
      proof: p.proofOfTransfer,
      notes: p.notes,
    })),
    items: d.items || [],
  }));
};

/**
 * Men-generate ID yang konsisten dan seragam berdasarkan nama entitas.
 * Fungsi ini mengamankan sistem dari duplikasi Semantic (Semantic Duplication) saat offline.
 * * @param prefix Prefix untuk ID (Contoh: "CAT" untuk Kategori, "UOM" untuk Satuan)
 * @param rawName Nama entitas (Contoh: "Sayuran Hijau")
 * @returns String ID deterministik (Contoh: "CAT_SAYURAN_HIJAU")
 */
export const generateDeterministicId = (
  prefix: string,
  rawName: string,
): string => {
  if (!rawName) return `${prefix}_UNKNOWN_${Date.now()}`; // Fallback aman

  const normalized = rawName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_") // Ganti semua karakter non-alfanumerik dengan underscore
    .replace(/_+/g, "_") // Hapus underscore ganda jika ada spasi berlebih
    .replace(/^_|_$/g, ""); // Hapus underscore di awal atau akhir string

  return `${prefix}_${normalized}`;
};

// --- E-WALLET DATA MAPPERS ---

export const mapEWalletAccounts = (rawData: any[]) => {
  return rawData.map((d: any) => ({
    id: d.id,
    regionId: d.regionId,
    branchId: d.branchId,
    managedBy: d.managedBy,
    type: d.type,
    bankName: d.bankName || null,
    accountNumber: d.accountNumber || null,
    accountHolder: d.accountHolder || null,
    accountName: d.accountName,
    isActive: Boolean(d.isActive ?? true),
    createdAt: d.createdAt
      ? new Date(d.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: d.updatedAt
      ? new Date(d.updatedAt).toISOString()
      : new Date().toISOString(),
    deletedAt: d.deletedAt ? new Date(d.deletedAt).toISOString() : null,
    _deleted: false,
  }));
};

export const mapEWalletConfigs = (rawData: any[]) => {
  return rawData.map((d: any) => ({
    branchId: d.branchId,
    taxRate: Number(d.taxRate || 0),
    serviceRate: Number(d.serviceRate || 0),
    apLimitRate: Number(d.apLimitRate || 0),
    isActive: Boolean(d.isActive ?? true),
    createdAt: d.createdAt
      ? new Date(d.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: d.updatedAt
      ? new Date(d.updatedAt).toISOString()
      : new Date().toISOString(),
    _deleted: false,
  }));
};

export const mapEWalletLedgers = (rawData: any[]) => {
  return rawData.map((d: any) => ({
    id: d.id,
    transactionId: d.transactionId,
    accountId: d.accountId,
    branchId: d.branchId,
    mutationType: d.mutationType,
    amount: Number(d.amount || 0),
    referenceType: d.referenceType,
    referenceId: d.referenceId || null,
    operatorId: d.operatorId || null,
    notes: d.notes || null,
    createdAt: d.createdAt
      ? new Date(d.createdAt).toISOString()
      : new Date().toISOString(),
    _deleted: false,
  }));
};
