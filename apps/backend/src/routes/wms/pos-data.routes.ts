import { Router, Request, Response } from "express";
import { db } from "../../db";
import { gt } from "drizzle-orm";
// Pastikan path import ini sesuai dengan lokasi Drizzle schema POS Anda
import { invoices, payments } from "../../db/schema/db_pos/transactions";

export const posDataRoutes = Router();

posDataRoutes.get(
  "/sync",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const lastUpdateStr = req.query.lastUpdate as string;

      // Jika tidak ada lastUpdate, default ke 30 hari terakhir agar tidak memberatkan awal loading
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const lastUpdate = lastUpdateStr
        ? new Date(lastUpdateStr)
        : thirtyDaysAgo;

      // 1. Tarik Data Invoices
      const rawInvoices = await db
        .select()
        .from(invoices)
        .where(gt(invoices.updatedAt, lastUpdate));

      // Mapping eksplisit agar Javascript Date menjadi ISO String untuk RxDB
      const mappedInvoices = rawInvoices.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt
          ? new Date(inv.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: inv.updatedAt
          ? new Date(inv.updatedAt).toISOString()
          : new Date().toISOString(),
        notes: inv.notes || null,
        orderId: inv.orderId || null,
      }));

      // 2. Tarik Data Payments (Termasuk Metadata Mesin EDC)
      const rawPayments = await db
        .select()
        .from(payments)
        .where(gt(payments.createdAt, lastUpdate));

      // Mapping eksplisit untuk memastikan format Data EDC ter-parse sempurna di WMS
      const mappedPayments = rawPayments.map((pay) => ({
        ...pay,
        createdAt: pay.createdAt
          ? new Date(pay.createdAt).toISOString()
          : new Date().toISOString(),
        provider: pay.provider || null,
        referenceNumber: pay.referenceNumber || null,
        approvalCode: pay.approvalCode || null,
        rrn: pay.rrn || null,
        traceNumber: pay.traceNumber || null,
        batchNumber: pay.batchNumber || null,
        settlementMetadata: pay.settlementMetadata || null,
      }));

      return res.status(200).json({
        message: "Berhasil menarik data POS",
        timestamp: new Date().toISOString(), // Waktu server saat ini untuk penanda lastUpdate berikutnya
        data: {
          invoices: mappedInvoices,
          payments: mappedPayments,
        },
      });
    } catch (error) {
      console.error("[POS-DATA-API] Gagal menarik data:", error);
      return res
        .status(500)
        .json({ error: "Gagal menarik data POS untuk WMS" });
    }
  },
);
