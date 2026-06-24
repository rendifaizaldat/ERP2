import { useMemo } from "react";
import { usePos } from "../PosProvider";

/**
 * Menghitung total ekspektasi sistem berdasarkan rekaman transaksi di shift ini.
 * Mengembalikan { expectedCash, expectedNonCash } dari murni data penjualan (refund dikurangkan).
 * Catatan: expectedCash di sini adalah dari penjualan saja (tidak termasuk modal awal/petty cash).
 */
export const calculateShiftExpectedTotals = (
  transactions: any[],
): { expectedCash: number; expectedNonCash: number } => {
  let expectedCash = 0;
  let expectedNonCash = 0;

  transactions.forEach((tx: any) => {
    const method = (tx.payment_method || "CASH").toUpperCase();
    const amount = tx.grand_total || 0;
    const isRefund =
      tx.status === "REFUNDED" ||
      tx.is_refund === true ||
      tx.transactionType === "REFUND";

    const isCash = method === "CASH" || method === "TUNAI";

    if (isCash) {
      expectedCash += isRefund ? -amount : amount;
    } else {
      expectedNonCash += isRefund ? -amount : amount;
    }
  });

  return { expectedCash, expectedNonCash };
};

export const useReportCalculations = () => {
  const { state } = usePos();

  const transactions = state?.transactions || [];
  const pettyCash = state?.pettyCashTransactions || [];
  const audits = state?.auditLogs || [];

  // Filter transaksi yang hanya sudah dibayar (Abaikan PENDING / Meja Gantung)
  const completedTransactions = useMemo(() => {
    return transactions.filter(
      (tx: any) =>
        tx.status === "PAID" ||
        tx.status === "COMPLETED" ||
        !tx.status ||
        tx.status !== "PENDING",
    );
  }, [transactions]);

  // 1. MOD CALCULATIONS
  const modData = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalService = 0;
    const catSales: Record<string, { qty: number; total: number }> = {};
    const paymentSales: Record<string, number> = {};
    const staffSet = new Set<string>();

    let cashSales = 0; // PENAMPUNG KHUSUS UANG FISIK MASUK

    completedTransactions.forEach((tx: any) => {
      totalNet += tx.subtotal;
      totalTax += tx.tax_amount;
      totalService += tx.service_amount;
      totalGross += tx.grand_total;

      if (tx.cashierName) staffSet.add(tx.cashierName);
      if (tx.waiterName) staffSet.add(tx.waiterName);

      const method = (tx.payment_method || "CASH").toUpperCase();
      paymentSales[method] = (paymentSales[method] || 0) + tx.grand_total;

      // Filter: Hanya uang TUNAI yang masuk laci (Termasuk Tax & Service)
      if (method === "CASH" || method === "TUNAI") {
        cashSales += tx.grand_total;
      }

      tx.items.forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          const catName = item.category_name || "UNCATEGORIZED";
          if (!catSales[catName]) catSales[catName] = { qty: 0, total: 0 };
          catSales[catName].qty += activeQty;
          catSales[catName].total += item.price * activeQty;
        }
      });
    });

    let pettyCashOut = 0;
    pettyCash.forEach((pc: any) => {
      pettyCashOut += pc.amount_requested;
      if (pc.status === "COMPLETED") pettyCashOut -= pc.amount_returned || 0;
      staffSet.add(pc.cashier_issued_name);
    });

    let totalVoid = 0;
    let totalRefund = 0;
    audits.forEach((a: any) => {
      if (a.type === "VOID") totalVoid += a.totalAmount;
      if (a.type === "REFUND") totalRefund += a.totalAmount; // Asumsi refund ditarik tunai dari laci
    });

    const initialCash = state?.currentShiftInitialCash || 0;

    // RUMUS MUTLAK KAS FISIK DI LACI:
    // Modal Awal + Pemasukan Tunai(Cash) - Kasbon - Refund Tunai
    const systemCash = initialCash + cashSales - pettyCashOut - totalRefund;

    return {
      totalTrx: completedTransactions.length,
      initialCash,
      cashSales,
      systemCash, // Export systemCash yang sudah matang
      totalGross,
      totalNet,
      totalTax,
      totalService,
      catSales,
      paymentSales,
      pettyCashOut,
      totalVoid,
      totalRefund,
      staffList: Array.from(staffSet),
    };
  }, [
    completedTransactions,
    pettyCash,
    audits,
    state?.currentShiftInitialCash,
  ]);

  // 2. PLU CALCULATIONS
  const pluData = useMemo(() => {
    const pluMap: Record<string, { qty: number; total: number }> = {};
    completedTransactions.forEach((tx: any) => {
      tx.items.forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          if (!pluMap[item.name]) pluMap[item.name] = { qty: 0, total: 0 };
          pluMap[item.name].qty += activeQty;
          pluMap[item.name].total += item.price * activeQty;
        }
      });
    });
    return Object.entries(pluMap).sort((a, b) => b[1].qty - a[1].qty);
  }, [completedTransactions]);

  return {
    modData,
    pluData,
    transactions,
    pettyCash,
    audits,
  };
};
