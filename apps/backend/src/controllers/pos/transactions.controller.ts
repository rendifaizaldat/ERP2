// Path: apps/backend/src/controllers/pos/transactions.controller.ts
import { Request, Response } from "express";
import { db } from "../../db";
import {
  invoices,
  orders,
  payments,
  orderItems,
} from "../../db/schema/db_pos/transactions";
import { users } from "../../db/schema/index";
import { and, eq, ilike, gte, lte, sql, aliasedTable } from "drizzle-orm";

export const searchTransactions = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { searchType, keyword, date, startDate, endDate } = req.query;

    const waiters = aliasedTable(users, "waiters");
    const cashiers = aliasedTable(users, "cashiers");
    const conditions = [];

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      conditions.push(gte(invoices.createdAt, startOfDay));
      conditions.push(lte(invoices.createdAt, endOfDay));
    } else if (startDate && endDate) {
      const startRange = new Date(`${startDate}T00:00:00.000Z`);
      const endRange = new Date(`${endDate}T23:59:59.999Z`);
      conditions.push(gte(invoices.createdAt, startRange));
      conditions.push(lte(invoices.createdAt, endRange));
    }

    if (keyword && searchType) {
      const searchTerm = `%${String(keyword).trim()}%`;
      if (searchType === "invoice") {
        conditions.push(ilike(invoices.invoiceNumber, searchTerm));
      } else if (searchType === "nama") {
        conditions.push(ilike(orders.customerName, searchTerm));
      } else if (searchType === "meja") {
        conditions.push(ilike(orders.tableLabel, searchTerm));
      }
    }

    const rawResults = await db
      .select({
        invoice_id: invoices.invoiceNumber,
        timestamp: invoices.createdAt,
        tableLabel: orders.tableLabel,
        customerName: orders.customerName,
        waiterName: waiters.name,
        cashierName: cashiers.name,
        subtotal: invoices.subtotal,
        tax_amount: invoices.taxAmount,
        service_amount: invoices.serviceAmount,
        grand_total: invoices.grandTotal,
        payment_method: payments.method,
        status: invoices.status,
        orderId: orders.id,
      })
      .from(invoices)
      .leftJoin(orders, eq(invoices.orderId, orders.id))
      .leftJoin(payments, eq(invoices.id, payments.invoiceId))
      .leftJoin(waiters, eq(orders.operatorId, waiters.id))
      .leftJoin(cashiers, eq(payments.operatorId, cashiers.id))
      .where(and(...conditions))
      .orderBy(sql`${invoices.createdAt} DESC`)
      .limit(100);

    const formattedResults = await Promise.all(
      rawResults.map(async (tx) => {
        const items = await db
          .select({
            sku: orderItems.skuSnapshot,
            name: orderItems.nameSnapshot,
            price: orderItems.basePriceSnapshot,
            qty: orderItems.qty,
            voidedQty: orderItems.voidedQty,
            refundedQty: orderItems.refundedQty,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, tx.orderId as string));

        return {
          invoice_id: tx.invoice_id,
          timestamp: tx.timestamp.getTime(),
          tableLabel: tx.tableLabel || "UNKNOWN",
          customerName: tx.customerName || "-",
          waiterName: tx.waiterName || "-",
          cashierName: tx.cashierName || "Sistem",
          subtotal: tx.subtotal,
          tax_amount: tx.tax_amount,
          service_amount: tx.service_amount,
          grand_total: tx.grand_total,
          payment_method: tx.payment_method || "PENDING",
          status: tx.status,
          items: items,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Data ditemukan",
      total: formattedResults.length,
      data: formattedResults,
    });
  } catch (error: any) {
    console.error("SEARCH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mencari data transaksi",
      error: error.message,
    });
  }
};
