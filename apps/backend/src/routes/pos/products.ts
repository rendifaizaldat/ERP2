import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { products, productCategories, branchProducts } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulidx";

const router = Router();

// POST /api/products/import
// Menerima kiriman array produk massal dari klien
router.post("/import", async (req: Request, res: Response): Promise<any> => {
  const { branchId, items } = req.body;

  if (!branchId || !Array.isArray(items)) {
    return res.status(400).json({
      error: "Payload tidak valid. branchId dan array items wajib disertakan.",
    });
  }

  try {
    const importSummary = [];

    for (const item of items) {
      const {
        categoryName,
        categoryCode,
        sku,
        name,
        basePrice,
        salePrice,
        isFnb,
      } = item;

      // 1. Ambil atau buat Kategori Otomatis jika belum terdaftar
      let categoryId;
      const existingCat = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.code, categoryCode.trim().toUpperCase()))
        .limit(1);

      if (existingCat.length > 0) {
        categoryId = existingCat[0].id;
      } else {
        categoryId = ulid();
        await db.insert(productCategories).values({
          id: categoryId,
          name: categoryName.trim().toUpperCase(),
          code: categoryCode.trim().toUpperCase(),
        });
      }

      // 2. Ambil atau daftarkan ID Produk Universal Pusat
      let productId;
      const existingProd = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku.trim().toUpperCase()))
        .limit(1);

      if (existingProd.length > 0) {
        productId = existingProd[0].id;
        await db
          .update(products)
          .set({
            name: name.trim().toUpperCase(),
            basePrice: Number(basePrice) || 0,
            isFnb: Boolean(isFnb),
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));
      } else {
        productId = ulid();
        await db.insert(products).values({
          id: productId,
          categoryId: categoryId,
          sku: sku.trim().toUpperCase(),
          name: name.trim().toUpperCase(),
          basePrice: Number(basePrice) || 0,
          isFnb: Boolean(isFnb),
        });
      }

      // 3. Kaitkan Harga Jual ke Cabang Bersangkutan
      const existingBranchProd = await db
        .select()
        .from(branchProducts)
        .where(
          and(
            eq(branchProducts.branchId, branchId),
            eq(branchProducts.productId, productId),
          ),
        )
        .limit(1);

      if (existingBranchProd.length > 0) {
        await db
          .update(branchProducts)
          .set({
            salePrice: Number(salePrice) || 0,
            updatedAt: new Date(),
          })
          .where(eq(branchProducts.id, existingBranchProd[0].id));
      } else {
        await db.insert(branchProducts).values({
          id: ulid(),
          branchId: branchId,
          productId: productId,
          salePrice: Number(salePrice) || 0,
        });
      }

      importSummary.push({ sku, name: name.toUpperCase(), status: "SYNCED" });
    }

    return res.json({
      message: `Konsolidasi data sukses. Berhasil mengolah ${importSummary.length} produk.`,
      results: importSummary,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Gagal memproses import produk massal." });
  }
});

// GET /api/products/export
// Menarik data katalog retail cabang aktif untuk diolah menjadi dokumen eksternal
router.get("/export", async (req: Request, res: Response): Promise<any> => {
  const { branchId } = req.query;

  if (!branchId || typeof branchId !== "string") {
    return res
      .status(400)
      .json({ error: "Parameter query branchId wajib disertakan." });
  }

  try {
    const catalogData = await db
      .select({
        sku: products.sku,
        name: products.name,
        basePrice: products.basePrice,
        salePrice: branchProducts.salePrice,
        isFnb: products.isFnb,
        categoryName: productCategories.name,
        categoryCode: productCategories.code,
      })
      .from(branchProducts)
      .innerJoin(products, eq(branchProducts.productId, products.id))
      .innerJoin(
        productCategories,
        eq(products.categoryId, productCategories.id),
      )
      .where(
        and(
          eq(branchProducts.branchId, branchId),
          eq(branchProducts.isActive, true),
        ),
      );

    return res.json({
      message: "Export katalog produk sukses",
      products: catalogData,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Gagal merakit berkas ekspor produk." });
  }
});

export default router;
