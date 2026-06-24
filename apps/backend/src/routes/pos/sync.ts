import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import {
  devices,
  users,
  branches,
  products,
  branchProducts,
  productCategories,
} from "../../db/schema";
import { eventJournal } from "../../db/schema/db_pos/journal";
import { wmsFinancialConfigs } from "../../db/schema/db_wms/wms.akunting"; // <-- TAMBAHAN IMPOR
import { eq, and, inArray, gte, gt, desc, asc } from "drizzle-orm";
import { ulid } from "ulidx";
import { getNatsInstance, sc } from "../../services/nats";

const router = Router();

// ====================================================================
// 1. FULL HYDRATION (Cold Start / Initial Load)
// ====================================================================
router.get("/hydrate", async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Akses ditolak: Device Token tidak ditemukan." });
  }

  const deviceToken = authHeader.split(" ")[1];

  try {
    const deviceResult = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceToken, deviceToken))
      .limit(1);
    const device = deviceResult[0];

    if (!device || device.status !== "active") {
      return res.status(401).json({
        error: "Perangkat tidak dikenali atau ditangguhkan dari pusat.",
      });
    }

    const branchResult = await db
      .select()
      .from(branches)
      .where(eq(branches.id, device.branchId))
      .limit(1);
    const branch = branchResult[0];

    const staffResult = await db
      .select()
      .from(users)
      .where(eq(users.branchId, device.branchId));

    const catalogResult = await db
      .select({
        sku: products.sku,
        name: products.name,
        price: branchProducts.salePrice,
        categoryId: products.categoryId,
      })
      .from(branchProducts)
      .innerJoin(products, eq(branchProducts.productId, products.id))
      .where(
        and(
          eq(branchProducts.branchId, device.branchId),
          eq(branchProducts.isActive, true),
        ),
      );

    const categoriesResult = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
      })
      .from(productCategories)
      .where(eq(productCategories.isActive, true));

    // ====================================================================
    // TAMBAHAN: Ambil konfigurasi akunting untuk cabang ini
    // ====================================================================
    const configResult = await db
      .select()
      .from(wmsFinancialConfigs)
      .where(eq(wmsFinancialConfigs.branchId, device.branchId))
      .limit(1);

    const financialConfig = configResult[0] || {
      taxRate: "0",
      serviceRate: "0",
    };
    // ====================================================================

    // ====================================================================
    // KEAJAIBAN RECOVERY DENGAN SMART CUT-OFF (LOCAL_DATA_PURGED)
    // ====================================================================
    const branchDevices = await db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.branchId, device.branchId));

    const branchDeviceIds = branchDevices.map((d) => d.id);

    let recentEvents: any[] = [];
    if (branchDeviceIds.length > 0) {
      const lastPurgeEventResult = await db
        .select({ id: eventJournal.id })
        .from(eventJournal)
        .where(
          and(
            inArray(eventJournal.deviceId, branchDeviceIds),
            eq(eventJournal.eventType, "LOCAL_DATA_PURGED"),
          ),
        )
        .orderBy(desc(eventJournal.id))
        .limit(1);

      let startUlid;

      if (lastPurgeEventResult.length > 0) {
        startUlid = lastPurgeEventResult[0].id;
        console.log(
          `[RECOVERY] Smart Cut-Off Aktif! Menarik data HANYA setelah proses EOD terakhir: ${startUlid}`,
        );
      } else {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        startUlid = ulid(twentyFourHoursAgo.getTime());
        console.log(
          `[RECOVERY] Belum ada histori EOD. Menggunakan fallback 24 jam: ${startUlid}`,
        );
      }

      const eventsResult = await db
        .select()
        .from(eventJournal)
        .where(
          and(
            inArray(eventJournal.deviceId, branchDeviceIds),
            gte(eventJournal.id, startUlid),
          ),
        )
        .orderBy(desc(eventJournal.id));

      recentEvents = eventsResult.reverse().map((e) => ({
        sequence_id: e.id,
        type: e.eventType,
        payload: e.payload,
      }));
    }
    // ====================================================================

    return res.json({
      message: "Hydration sukses",
      data: {
        branch: { id: branch.id, name: branch.name, code: branch.code },
        staff: staffResult.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          pin: s.pin,
        })),
        categories: categoriesResult,
        products: catalogResult,
        recentEvents,
        // TAMBAHAN: financialConfig untuk POS
        financialConfig: {
          taxRate: Number(financialConfig.taxRate),
          serviceRate: Number(financialConfig.serviceRate),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Gagal melakukan sinkronisasi data master." });
  }
});

// ====================================================================
// 2. DELTA PULL API (O(1) Sync saat menerima WebSocket Hint)
// ====================================================================
router.get("/pull", async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  const since = req.query.since as string;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Akses ditolak." });
  }
  if (!since) {
    return res
      .status(400)
      .json({ error: "Parameter 'since' wajib diisi dengan ULID/Sequence." });
  }

  const deviceToken = authHeader.split(" ")[1];

  try {
    const deviceResult = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceToken, deviceToken))
      .limit(1);
    const device = deviceResult[0];

    if (!device)
      return res.status(401).json({ error: "Perangkat tidak dikenali." });

    const branchDevices = await db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.branchId, device.branchId));

    const branchDeviceIds = branchDevices.map((d) => d.id);

    // Ambil hanya data yang masuk *setelah* last checkpoint
    const newEvents = await db
      .select()
      .from(eventJournal)
      .where(
        and(
          inArray(eventJournal.deviceId, branchDeviceIds),
          gt(eventJournal.id, since), // greater than
        ),
      )
      .orderBy(asc(eventJournal.id)); // Susun urut waktu dari paling awal

    const payloadEvents = newEvents.map((e) => ({
      sequence_id: e.id,
      type: e.eventType,
      payload: e.payload,
    }));

    return res.json(payloadEvents);
  } catch (error) {
    console.error("[PULL] Delta Pull Error:", error);
    return res.status(500).json({ error: "Gagal menarik delta data." });
  }
});

// ====================================================================
// 3. DECOUPLED PUSH API (Push to DB & NATS)
// ====================================================================
router.post("/push", async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Akses ditolak: Device Token tidak ditemukan." });
  }

  const deviceToken = authHeader.split(" ")[1];
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "Payload tidak valid atau kosong." });
  }

  try {
    const deviceResult = await db
      .select()
      .from(devices)
      .where(eq(devices.deviceToken, deviceToken))
      .limit(1);
    const device = deviceResult[0];

    if (!device || device.status !== "active") {
      return res.status(401).json({ error: "Perangkat tidak dikenali." });
    }

    // 1. Catat ke Jurnal Fisik (Event Sourcing Root)
    const journalEntries = events.map((ev: any) => ({
      id: ev.id || ulid(),
      deviceId: device.id,
      eventType: ev.type,
      payload: ev.payload || {},
    }));

    await db.insert(eventJournal).values(journalEntries).onConflictDoNothing();

    // Dapatkan instance js (JetStream) & nc (Core NATS)
    const { js, nc } = getNatsInstance();

    // 2. Lempar ke Message Queue (NATS JetStream) untuk Workers/Projector
    for (const entry of journalEntries) {
      const natsPayload = {
        journalId: entry.id,
        deviceId: entry.deviceId,
        branchId: device.branchId,
        eventType: entry.eventType,
        payload: entry.payload,
      };

      await js.publish("events.sync", sc.encode(JSON.stringify(natsPayload)));
    }

    const latestJournalId = journalEntries[journalEntries.length - 1].id;

    // 3. [KODE BARU] Broadcast Sinyal HINT ke WebSocket via NATS Core
    const tenantId = (device as any).tenantId || "default";

    const syncHintPayload = JSON.stringify({
      latestSequence: latestJournalId,
      sourceDeviceId: device.id,
    });

    nc.publish(
      `sync.${tenantId}.${device.branchId}`,
      sc.encode(syncHintPayload),
    );

    // ====================================================================
    // [KODE BARU] CROSS-DOMAIN BRIDGE KE WMS PUSAT
    // Memberitahu Dashboard WMS bahwa ada transaksi POS baru
    // ====================================================================
    nc.publish(
      `sync.${tenantId}.PUSAT`,
      sc.encode(
        JSON.stringify({
          latestSequence: latestJournalId,
          sourceDeviceId: device.id,
          trigger: "NEW_POS_TRANSACTION",
        }),
      ),
    );
    // ====================================================================
    console.log(
      `📤 [API/PUSH] Menerima ${events.length} event dari Device ${device.id}. Hint NATS dikirim.`,
    );

    // 4. API SELESAI seketika
    return res.json({
      message: "Sync Accepted & Queued",
      syncedCount: events.length,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Gagal memproses sinkronisasi data." });
  }
});

export default router;
