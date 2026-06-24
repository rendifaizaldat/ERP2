import { db } from "../../db";
import {
  wmsWalletAccounts,
  wmsFinancialConfigs,
} from "../../db/schema/db_wms/wms.akunting";
import { eventJournal } from "../../db/schema/db_pos/journal";
import { devices } from "../../db/schema";
import { ulid } from "ulidx";
import { wmsProcessedEvents } from "../../db/schema/db_wms/wms.events";
import { eq } from "drizzle-orm";
import { getNatsInstance, sc } from "../../services/nats";
import { publishSyncHint } from "../../services/websocket";
import type { WmsEventEnvelope } from "@asstro/protocol/src/wms-events";
import { AckPolicy } from "nats";

export const startEWalletWorker = async () => {
  console.log("👷 [Worker] E-Wallet Worker starting...");

  try {
    const { js, jsm } = getNatsInstance();
    const streamName = "ASSTRO_EVENTS";
    const consumerName = "ewallet_worker_durable";

    // 1. Pastikan durable consumer ada
    try {
      await jsm.consumers.info(streamName, consumerName);
      console.log(`📦 [Worker] Consumer '${consumerName}' sudah ada.`);
    } catch (err: any) {
      if (err.message === "consumer not found") {
        await jsm.consumers.add(streamName, {
          durable_name: consumerName,
          ack_policy: AckPolicy.Explicit,
          filter_subject: "events.wms",
        });
        console.log(`📦 [Worker] Consumer '${consumerName}' berhasil dibuat.`);
      } else {
        throw err;
      }
    }

    // 2. Ambil consumer dan mulai consume
    const consumer = await js.consumers.get(streamName, consumerName);
    const messages = await consumer.consume();
    console.log("🎧 [Worker] E-Wallet Worker siap, mendengarkan events.wms...");

    // 3. Proses pesan yang masuk
    for await (const msg of messages) {
      try {
        const raw = sc.decode(msg.data);
        const envelope: WmsEventEnvelope = JSON.parse(raw);
        const { eventId, aggregateId, event } = envelope;

        // Hanya tangani event domain ewallet/finansial
        if (
          event.type !== "WMS_WALLET_ACCOUNT_CREATED" &&
          event.type !== "WMS_WALLET_ACCOUNT_DELETED" &&
          event.type !== "WMS_FINANCIAL_CONFIG_UPDATED"
        ) {
          msg.ack();
          continue;
        }

        // 4. Cek idempotensi
        const existing = await db
          .select()
          .from(wmsProcessedEvents)
          .where(eq(wmsProcessedEvents.eventId, eventId))
          .limit(1);

        if (existing.length > 0) {
          console.log(`⏭️ [Worker] Event ${eventId} sudah diproses, dilewati.`);
          msg.ack();
          continue;
        }

        let processed = false;
        let targetBranch = "PUSAT";

        // 5. Proyeksi Database
        if (event.type === "WMS_WALLET_ACCOUNT_CREATED") {
          const payload = event.payload as any;
          targetBranch = payload.branchId === "HO" ? "PUSAT" : payload.branchId;

          await db
            .insert(wmsWalletAccounts)
            .values({
              id: payload.id,
              regionId: payload.regionId,
              branchId: payload.branchId,
              managedBy: payload.managedBy,
              type: payload.type,
              bankName: payload.bankName,
              accountNumber: payload.accountNumber,
              accountHolder: payload.accountHolder,
              accountName: payload.accountName,

              // --- TAMBAHKAN INI AGAR TERSIMPAN KE POSTGRESQL ---
              binding: payload.binding || [],

              isActive: payload.isActive,
              createdAt: new Date(payload.createdAt),
              updatedAt: new Date(payload.updatedAt),
            })
            .onConflictDoUpdate({
              target: wmsWalletAccounts.id,
              set: {
                managedBy: payload.managedBy,
                type: payload.type,
                bankName: payload.bankName,
                accountNumber: payload.accountNumber,
                accountHolder: payload.accountHolder,
                accountName: payload.accountName,
                binding: payload.binding || [],

                isActive: payload.isActive,
                updatedAt: new Date(),
              },
            });

          processed = true;
          console.log(
            `✅ [Worker] Akun wallet dibuat/diupdate: ${payload.accountName}`,
          );
        } else if (event.type === "WMS_WALLET_ACCOUNT_DELETED") {
          const payload = event.payload as any;

          const account = await db
            .select()
            .from(wmsWalletAccounts)
            .where(eq(wmsWalletAccounts.id, payload.id))
            .limit(1);

          if (account.length > 0) {
            targetBranch =
              account[0].branchId === "HO" ? "PUSAT" : account[0].branchId;
          }

          await db
            .update(wmsWalletAccounts)
            .set({
              isActive: false,
              deletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(wmsWalletAccounts.id, payload.id));

          processed = true;
          console.log(`🗑️ [Worker] Akun wallet dinonaktifkan: ${payload.id}`);
        } else if (event.type === "WMS_FINANCIAL_CONFIG_UPDATED") {
          // --- PROYEKSI EVENT BARU: CONFIG FINANCIAL ---
          const payload = event.payload as any;
          targetBranch = payload.branchId; // Beritahu cabang spesifik agar POS-nya ter-update

          await db
            .insert(wmsFinancialConfigs)
            .values({
              branchId: payload.branchId,
              taxRate: payload.taxRate.toString(),
              serviceRate: payload.serviceRate.toString(),
              apLimitRate: payload.apLimitRate.toString(),
              isActive: payload.isActive,
              createdAt: new Date(payload.createdAt),
              updatedAt: new Date(payload.updatedAt),
            })
            .onConflictDoUpdate({
              target: wmsFinancialConfigs.branchId,
              set: {
                taxRate: payload.taxRate.toString(),
                serviceRate: payload.serviceRate.toString(),
                apLimitRate: payload.apLimitRate.toString(),
                isActive: payload.isActive,
                updatedAt: new Date(),
              },
            });

          // --- CROSS-DOMAIN BRIDGE: PUSH KE JURNAL POS ---
          // Cari semua mesin POS yang ada di cabang terkait
          const posDevices = await db
            .select({ id: devices.id })
            .from(devices)
            .where(eq(devices.branchId, payload.branchId));

          if (posDevices.length > 0) {
            // Buat event jurnal untuk ditarik oleh POS via Delta Pull
            const posEvents = posDevices.map((d) => ({
              id: ulid(),
              deviceId: d.id,
              eventType: "FINANCIAL_CONFIG_SYNCED",
              payload: {
                taxRate: Number(payload.taxRate),
                serviceRate: Number(payload.serviceRate),
              },
            }));

            await db.insert(eventJournal).values(posEvents);

            // Tembak WebSocket Hint khusus untuk channel POS
            const nc = getNatsInstance().nc;
            const posSyncHint = JSON.stringify({
              latestSequence: posEvents[posEvents.length - 1].id,
              sourceDeviceId: "WMS_SYSTEM",
            });
            nc.publish(
              `sync.default.${payload.branchId}`,
              sc.encode(posSyncHint),
            );
            console.log(
              `🔌 [Bridge] Event dikirim ke ${posDevices.length} mesin POS di cabang ${payload.branchId}`,
            );
          }

          processed = true;
          console.log(
            `⚙️ [Worker] Config Finansial diupdate untuk cabang: ${payload.branchId}`,
          );
        }

        // 6. Tandai Idempotensi & Trigger Sync Hint
        if (processed) {
          await db.insert(wmsProcessedEvents).values({
            eventId,
            aggregateId,
            eventType: event.type,
            processedAt: new Date(),
          });

          // Trigger WebSocket agar PWA WMS dan PWA POS lokal ter-update seketika
          publishSyncHint("wms", targetBranch, Date.now());
          console.log(
            `📤 [Worker] Sync hint dikirim ke branch_${targetBranch}`,
          );
        }

        msg.ack();
      } catch (err) {
        console.error("❌ [Worker] Gagal memproses event:", err);
        msg.nak();
      }
    }
  } catch (error) {
    console.error("❌ [Worker] Gagal menjalankan E-Wallet Worker:", error);
  }
};
