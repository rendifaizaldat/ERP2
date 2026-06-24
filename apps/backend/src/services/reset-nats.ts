import { connect } from "nats";

// Pastikan URL NATS sesuai dengan konfigurasi environment Anda
const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const STREAM_NAME = "ASSTRO_EVENTS";

async function purgeNatsStream() {
  try {
    console.log(`🔌 Menghubungkan ke NATS di ${NATS_URL}...`);
    const nc = await connect({ servers: NATS_URL });
    const jsm = await nc.jetstreamManager();

    console.log(`🧹 Membersihkan semua pesan dari stream: '${STREAM_NAME}'...`);

    // Fungsi purge akan menghapus semua pesan di dalam stream tanpa menghapus konfigurasi stream-nya
    await jsm.streams.purge(STREAM_NAME);

    console.log(
      `✅ NATS Stream '${STREAM_NAME}' berhasil di-reset (Purged)! Semua event hantu telah musnah.`,
    );

    await nc.close();
    process.exit(0);
  } catch (error: any) {
    console.error(`❌ Gagal reset NATS Stream:`, error.message);
    process.exit(1);
  }
}

purgeNatsStream();
