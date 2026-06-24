import { getNatsInstance, sc } from "../../services/nats";
import { db } from "../../db";
import { productCategories, products, branchProducts } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulidx";
import { AckPolicy } from "nats";

export const startCatalogWorker = async () => {
  const { js, jsm } = getNatsInstance();
  const streamName = "ASSTRO_EVENTS";
  const consumerName = "catalog_domain_worker";

  await jsm.consumers.add(streamName, {
    durable_name: consumerName,
    ack_policy: AckPolicy.Explicit,
    filter_subject: "events.sync",
  });

  const consumer = await js.consumers.get(streamName, consumerName);
  const messages = await consumer.consume();

  for await (const m of messages) {
    try {
      const payload = JSON.parse(sc.decode(m.data));

      // Pekerja Katalog hanya peduli dengan event CATEGORY_ADDED dan PRODUCT_ADDED
      if (["CATEGORY_ADDED", "PRODUCT_ADDED"].includes(payload.eventType)) {
        console.log(`📦 [CATALOG SERVICE] Memproses: ${payload.eventType}`);
        await processCatalog(payload);
      }

      m.ack(); // Selalu ack agar consumer tidak macet
    } catch (error) {
      console.error("❌ Catalog Worker Error:", error);
      m.nak();
    }
  }
};

async function processCatalog(entry: any) {
  const p = entry.payload;
  const branchId = entry.branchId;

  if (entry.eventType === "CATEGORY_ADDED") {
    // Upsert Kategori (Idempotent)
    await db
      .insert(productCategories)
      .values({
        id: p.id,
        name: p.name,
        code: `CAT-${new Date().getTime().toString().slice(-6)}`,
      })
      .onConflictDoUpdate({
        target: productCategories.id,
        set: {
          name: p.name,
          // code tidak diupdate agar tetap konsisten dengan pembuatan awal
        },
      });
  }

  if (entry.eventType === "PRODUCT_ADDED") {
    // 1. Pastikan kategori ada (buat kategori recovery jika belum)
    await db
      .insert(productCategories)
      .values({
        id: p.categoryId,
        name: "KATEGORI RECOVERY",
        code: `RCV-${new Date().getTime().toString().slice(-6)}`,
      })
      .onConflictDoNothing(); // abaikan jika sudah ada

    // 2. Upsert Master Product berdasarkan SKU (gunakan ID dari payload jika ada)
    const productId = p.id || ulid(); // ambil dari event atau buat baru

    const productResult = await db
      .insert(products)
      .values({
        id: productId,
        categoryId: p.categoryId,
        sku: p.sku,
        name: p.name,
        basePrice: Number(p.price) || 0,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          name: p.name,
          basePrice: Number(p.price) || 0,
        },
      })
      .returning({ id: products.id });

    const actualProductId = productResult[0].id; // ID yang dipakai (bisa dari existing)

    // 3. Upsert Branch Products
    // Cek apakah relasi (branchId, productId) sudah ada
    const existing = await db
      .select({ id: branchProducts.id })
      .from(branchProducts)
      .where(
        and(
          eq(branchProducts.branchId, branchId),
          eq(branchProducts.productId, actualProductId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      // Insert baru
      await db.insert(branchProducts).values({
        id: ulid(),
        branchId: branchId,
        productId: actualProductId,
        salePrice: Number(p.price) || 0,
      });
    } else {
      // Update harga jual jika sudah ada
      await db
        .update(branchProducts)
        .set({ salePrice: Number(p.price) || 0 })
        .where(eq(branchProducts.id, existing[0].id));
    }
  }
}
