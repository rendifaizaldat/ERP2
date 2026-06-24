import { getNatsInstance, sc } from "../../services/nats";
import { db } from "../../db";
import { orderItems, invoices } from "../../db/schema";
import { eq } from "drizzle-orm";
import { AckPolicy } from "nats";

export const startInventoryWorker = async () => {
  const { js, jsm } = getNatsInstance();
  const streamName = "ASSTRO_EVENTS";
  const consumerName = "inventory_saga_worker";

  await jsm.consumers.add(streamName, {
    durable_name: consumerName,
    ack_policy: AckPolicy.Explicit,
    filter_subject: "saga.inventory.deduct",
  });

  const consumer = await js.consumers.get(streamName, consumerName);
  const messages = await consumer.consume();

  for await (const m of messages) {
    try {
      const payload = JSON.parse(sc.decode(m.data));
      console.log(
        `\n🏭 [INVENTORY SAGA] Menerima instruksi pemotongan stok untuk Invoice: ${payload.invoiceId}`,
      );
      await processInventoryDeduction(payload);

      m.ack();
    } catch (error) {
      console.error("❌ Inventory Worker Error:", error);
      m.nak();
    }
  }
};

async function processInventoryDeduction(payload: any) {
  // 1. Cari Order ID berdasarkan Invoice ID
  const invoiceInfo = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, payload.invoiceId))
    .limit(1);

  if (invoiceInfo.length > 0 && invoiceInfo[0].orderId) {
    // 2. Ambil barang apa saja yang laku di order ini
    const soldItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, invoiceInfo[0].orderId));

    // 3. Logika Mutasi Stok (Persiapan Skema DB Besok)
    for (const item of soldItems) {
      console.log(
        `   ├─ Menghitung Resep untuk SKU: ${item.skuSnapshot} (Qty: ${item.qty})`,
      );
      // TODO: Besok kita akan buat tabel 'inventory_ledgers' dan melakukan insert ke sini.
    }
    console.log(
      `   └─ ✅ Stok berhasil dikalkulasi secara terpisah dari mesin Kasir!\n`,
    );
  }
}
