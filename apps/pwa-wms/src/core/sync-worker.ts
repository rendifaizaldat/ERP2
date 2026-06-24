import { getWmsDb } from "./database/rx-db";
import { executeMutation } from "./service";
import { API_BASE_URL } from "./constants";

export const startBackgroundSync = async () => {
  console.log(
    "🔄 [SYNC_WORKER] startBackgroundSync dipanggil, memulai subscription...",
  );
  const db = await getWmsDb();
  console.log("✅ [SYNC_WORKER] Database WMS berhasil diinisialisasi");

  // RxDB Subscription: Pantau terus antrian yang berstatus "PENDING"
  const query = db.wms_outbox.find({
    selector: { syncStatus: "PENDING" },
    sort: [{ createdAt: "asc" }],
  });

  console.log(
    "📡 [SYNC_WORKER] Subscription aktif, menunggu perubahan pada wms_outbox (syncStatus = PENDING)",
  );

  query.$.subscribe(async (pendingDocs) => {
    if (pendingDocs.length === 0) {
      console.log("💤 [SYNC_WORKER] Tidak ada dokumen PENDING, menunggu...");
      return;
    }

    console.log(
      `🔔 [SYNC_WORKER] Subscription triggered: ditemukan ${pendingDocs.length} dokumen PENDING`,
    );

    // Jangan proses secara paralel (Promise.all) untuk menjaga urutan kausalitas (Sebab-Akibat)
    for (const doc of pendingDocs) {
      console.log(
        `📄 [SYNC_WORKER] Memproses doc id: ${doc.id}, type: ${doc.type}`,
      );

      try {
        let url = "";
        let method = "POST";
        let requestPayload: any = null;

        // 1. ROUTING LEGACY (Specific REST API)
        if (doc.type === "BULK_PIUTANG_PAYMENT_PROCESSED") {
          url = `${API_BASE_URL}/piutang/bulk-payment`;
          requestPayload = doc.payload; // Legacy hanya kirim payload mentah
        } else if (doc.type === "OUTLET_BALANCE_MUTATED") {
          url = `${API_BASE_URL}/piutang/ledger/mutate`;
          requestPayload = doc.payload;
        }

        // 2. ROUTING ARSITEKTUR BARU (Event Sourcing / CQRS)
        else {
          url = `${API_BASE_URL}/wms/events`;
          // Kirim Event Envelope penuh agar backend projector bisa melakukan Idempotency Check
          requestPayload = {
            id: doc.id,
            aggregateId: doc.aggregateId,
            type: doc.type,
            payload: doc.payload,
            createdAt: doc.createdAt,
            // Operator ID atau Info branch bisa ditambahkan di sini jika dibutuhkan backend
          };
          console.log(
            `🔗 [SYNC_WORKER] Menggunakan Generic Event Endpoint untuk tipe: ${doc.type}`,
          );
        }

        // Tembak ke API Server
        console.log(
          `🚀 [SYNC_WORKER] Mengirim request ke ${url} dengan payload:`,
          requestPayload,
        );

        // PENTING: executeMutation harus melempar (throw) error jika koneksi gagal/timeout
        await executeMutation(url, method, requestPayload);

        console.log(`✅ [SYNC_WORKER] API sukses memproses event ${doc.id}`);

        // Jika API sukses merespon 200/201, tandai sukses di database lokal (RxDB)
        await doc.incrementalPatch({ syncStatus: "SYNCED" });

        console.log(
          `🎉 [SYNC_WORKER] doc ${doc.id} (${doc.type}) status diubah menjadi SYNCED!`,
        );
      } catch (error) {
        console.error(
          `❌ [SYNC_WORKER] Jaringan terputus atau Server Error saat sync doc ${doc.id} (${doc.type})`,
          error,
        );
        console.log(
          `⏸️ [SYNC_WORKER] Menghentikan loop antrean sementara untuk menjaga urutan FIFO. Worker akan me-retry otomatis nanti.`,
        );
        break;
      }
    }
  });

  console.log(
    "🏁 [SYNC_WORKER] Engine Background Sync siap beroperasi mengawal data.",
  );
};
