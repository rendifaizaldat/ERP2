import { Router } from "express";
import { db } from "../../db";
import {
  wmsReceiving,
  wmsReceivingItems,
  wmsPayments,
} from "../../db/schema/db_wms/wms.transactions";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const regionId = req.query.regionId as string;
    if (!regionId)
      return res.status(400).json({ error: "regionId is required" });

    // 1. Ambil dokumen induk
    const receivingsList = await db
      .select()
      .from(wmsReceiving)
      .where(eq(wmsReceiving.regionId, regionId));

    // 2. Ambil anak (items & payments)
    const itemsList = await db.select().from(wmsReceivingItems);
    const paymentsList = await db.select().from(wmsPayments);

    // 3. Gabungkan menjadi format bersarang (nested) sesuai skema RxDB
    const formattedData = receivingsList.map((r) => ({
      ...r,
      items: itemsList.filter((i) => i.receivingId === r.id),
      payments: paymentsList.filter((p) => p.receivingId === r.id),
    }));

    return res.json(formattedData);
  } catch (error) {
    console.error("[GET /api/wms/receivings] Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
