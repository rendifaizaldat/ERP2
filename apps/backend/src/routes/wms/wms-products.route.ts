import { Router } from "express";
import { db } from "../../db";
import {
  wmsGlobalCategories,
  wmsGlobalProducts,
  wmsRegionalItems,
} from "../../db/schema";
import { regions, branches } from "../../db/schema/master/organization";
import { uomEnum } from "../../db/schema/db_wms/wms.enums";
import { wmsVendors } from "../../db/schema/db_wms/wms.vendors";

const router = Router();

// =========================================================================
// READ MODEL (QUERY)
// Endpoint ini dipertahankan khusus untuk App Start (Cold Start Replication)
// =========================================================================
router.get("/katalog", async (req, res) => {
  try {
    const categories = await db.select().from(wmsGlobalCategories);
    const globalProducts = await db.select().from(wmsGlobalProducts);
    const regionalItems = await db.select().from(wmsRegionalItems);
    const regionsData = await db.select().from(regions);
    const branchesData = await db.select().from(branches);
    const vendorsData = await db.select().from(wmsVendors);

    res.status(200).json({
      categories,
      globalProducts,
      regionalItems,
      regions: regionsData,
      branches: branchesData,
      vendors: vendorsData,
      metadata: {
        uomOptions: uomEnum.enumValues,
      },
    });
  } catch (error) {
    console.error("[API_KATALOG_ERROR]", error);
    res.status(500).json({ error: "Gagal memuat katalog WMS" });
  }
});

export { router as wmsProductsRouter };
