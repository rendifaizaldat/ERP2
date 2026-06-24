// Path: apps/backend/src/workers/pos/shift.worker.ts
import { getNatsInstance, sc } from "../../services/nats";
import { db } from "../../db";
import { posShifts } from "../../db/schema/db_pos/shifts";
import { sql } from "drizzle-orm";
import { AckPolicy } from "nats";

export const startShiftWorker = async () => {
  const { js, jsm } = getNatsInstance();
  const streamName = "ASSTRO_EVENTS";
  const consumerName = "shift_domain_worker";

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

      if (
        payload.eventType === "SHIFT_OPENED" ||
        payload.eventType === "SHIFT_CLOSED"
      ) {
        console.log(
          `⏰ [SHIFT WORKER] Memproses: ${payload.eventType} | ID: ${payload.payload?.shiftId}`,
        );
        await processShiftEvent(payload);
      }

      m.ack();
    } catch (error) {
      console.error("❌ Shift Worker Error:", error);
      m.nak();
    }
  }
};

async function processShiftEvent(entry: any) {
  const p = entry.payload;
  const branchId = entry.branchId;

  if (entry.eventType === "SHIFT_OPENED") {
    await db
      .insert(posShifts)
      .values({
        id: p.shiftId,
        branchId: branchId,
        deviceId: p.deviceId || "UNKNOWN-DEVICE",
        cashierId: p.cashierId || p.operator_id,
        openedAt: new Date(p.openedAt || Date.now()),
        startingCash: String(p.startingCash || p.initial_cash || 0),
        businessDate: p.businessDate || "1970-01-01",
        status: "OPEN",
      })
      .onConflictDoUpdate({
        target: posShifts.id,
        set: {
          deviceId: sql`excluded.device_id`,
          cashierId: sql`excluded.cashier_id`,
          openedAt: sql`excluded.opened_at`,
          startingCash: sql`excluded.starting_cash`,
          businessDate: sql`excluded.business_date`,
          status: sql`excluded.status`,
          updatedAt: new Date(),
        },
      });
  }

  if (entry.eventType === "SHIFT_CLOSED") {
    await db
      .insert(posShifts)
      .values({
        id: p.shiftId,
        branchId: branchId,
        deviceId: "UNKNOWN-DEVICE", // Fallback jika insert dari closed
        cashierId: "UNKNOWN",
        openedAt: new Date(0), // Fallback
        closedAt: new Date(p.closedAt || Date.now()),
        startingCash: "0",
        expectedEndingCash: String(p.expectedEndingCash || p.system_cash || 0),
        actualEndingCash: String(p.actualEndingCash || p.actual_cash || 0),
        difference: String(p.difference || 0),
        expectedNonCash: String(p.expectedNonCash || 0),
        actualNonCash: String(p.actualNonCash || 0),
        nonCashDifference: String(p.nonCashDifference || 0),
        differenceReason: p.differenceReason || null,
        status: "CLOSED",
      })
      .onConflictDoUpdate({
        target: posShifts.id,
        set: {
          closedAt: sql`excluded.closed_at`,
          expectedEndingCash: sql`excluded.expected_ending_cash`,
          actualEndingCash: sql`excluded.actual_ending_cash`,
          difference: sql`excluded.difference`,
          expectedNonCash: sql`excluded.expected_non_cash`,
          actualNonCash: sql`excluded.actual_non_cash`,
          nonCashDifference: sql`excluded.non_cash_difference`,
          differenceReason: sql`excluded.difference_reason`,
          status: sql`excluded.status`,
          updatedAt: new Date(),
        },
      });
  }
}
