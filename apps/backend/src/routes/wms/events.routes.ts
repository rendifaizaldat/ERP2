import { Router, Request, Response } from "express";
import { db } from "../../db";
import { wmsProcessedEvents } from "../../db/schema/db_wms/wms.events";
import { eq } from "drizzle-orm";
import { sc, getNatsInstance } from "../../services/nats";
import { WmsEventEnvelope } from "@asstro/protocol/src/wms-events";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    // 1. Tangkap format WmsEventEnvelope dari client
    const { eventId, aggregateId, timestamp, event } = req.body;

    if (!eventId || !aggregateId || !event || !event.type) {
      return res.status(400).json({
        status: "error",
        message: "Format envelope event dari client tidak valid",
      });
    }

    // 2. Cek Idempotency: Mencegah duplikasi jika network client me-retry (Double Submit)
    const existingEvent = await db
      .select()
      .from(wmsProcessedEvents)
      .where(eq(wmsProcessedEvents.eventId, eventId))
      .limit(1);

    if (existingEvent.length > 0) {
      console.log(
        `[Event Sync] Idempotency Hit: Event ${eventId} sudah pernah diproses.`,
      );
      return res.status(200).json({
        status: "success",
        message: "Event already processed (Idempotent)",
        eventId: eventId,
      });
    }

    // 3. Pastikan format sesuai dengan WmsEventEnvelope baku
    const envelope: WmsEventEnvelope = {
      eventId: eventId,
      aggregateId: aggregateId,
      timestamp: timestamp || new Date().toISOString(),
      event: {
        type: event.type,
        payload: event.payload,
      },
    };

    // 4. Publish ke NATS JetStream
    const { js } = getNatsInstance();
    await js.publish("events.wms", sc.encode(JSON.stringify(envelope)));

    console.log(
      `[Event Sync] Berhasil publish ke NATS: events.wms (${event.type} - AggID: ${aggregateId})`,
    );

    // 5. Kembalikan 200 OK agar RxDB client menghapus antrean PENDING-nya
    return res.status(200).json({
      status: "success",
      message: "Event accepted and queued in NATS",
      eventId: eventId,
    });
  } catch (error) {
    console.error("[Event Sync Error]:", error);
    // Berikan status 500 agar client melakukan break (pause) dan retry nanti
    return res.status(500).json({
      status: "error",
      message: "Failed to process incoming event sync",
    });
  }
});

export default router;
