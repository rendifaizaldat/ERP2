import {
  connect,
  NatsConnection,
  StringCodec,
  JetStreamClient,
  JetStreamManager,
  RetentionPolicy,
} from "nats";

let nc: NatsConnection;
let js: JetStreamClient;
let jsm: JetStreamManager;

export const sc = StringCodec();

export const initNATS = async () => {
  try {
    const natsUrl = process.env.NATS_URL || "nats://localhost:4222";
    nc = await connect({ servers: natsUrl });
    jsm = await nc.jetstreamManager();
    js = nc.jetstream();

    const streamName = "ASSTRO_EVENTS";
    // Gunakan ">" agar menangkap subjek berlapis seperti saga.inventory.deduct
    const requiredSubjects = ["events.>", "saga.>"];

    try {
      // 1. Cek apakah stream sudah ada
      const streamInfo = await jsm.streams.info(streamName);
      console.log(`🌊 NATS Stream '${streamName}' sudah aktif.`);

      // 2. AUTO-UPDATE: Timpa konfigurasi lama dengan subjek yang baru
      await jsm.streams.update(streamName, {
        ...streamInfo.config,
        subjects: requiredSubjects,
      });
      console.log(
        `🌊 NATS Stream '${streamName}' subjects berhasil diperbarui!`,
      );
    } catch (err: any) {
      // 3. Jika belum ada, buat baru
      if (err.message === "stream not found") {
        await jsm.streams.add({
          name: streamName,
          subjects: requiredSubjects,
          retention: RetentionPolicy.Limits,
        });
        console.log(`🌊 NATS Stream '${streamName}' berhasil dibuat!`);
      } else {
        throw err;
      }
    }

    console.log("🚀 Terhubung ke NATS JetStream (Message Broker Active)");
    return { nc, js, jsm };
  } catch (error) {
    console.error("❌ Gagal terhubung ke NATS:", error);
    process.exit(1);
  }
};

export const getNatsInstance = () => {
  if (!nc || !js || !jsm) {
    throw new Error(
      "NATS belum diinisialisasi. Panggil initNATS() terlebih dahulu.",
    );
  }
  return { nc, js, jsm };
};
