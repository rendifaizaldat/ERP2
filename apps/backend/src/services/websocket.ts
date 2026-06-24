import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { getNatsInstance, sc } from "./nats";
import { db } from "../db";
import { branches, devices } from "../db/schema/master/organization";
import { eq } from "drizzle-orm";

let io: Server;

export const initWebSocket = async (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    const branchId = socket.handshake.query.branchId as string;
    const deviceId = socket.handshake.query.deviceId as string;

    let branchName = branchId;
    let deviceName = deviceId;

    // Resolusi Nama Cabang
    if (branchId && branchId !== "PUSAT" && branchId !== "GLOBAL") {
      try {
        const bData = await db
          .select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, branchId))
          .limit(1);
        if (bData.length > 0) branchName = bData[0].name;
      } catch (err) {}
    }

    // Resolusi Nama Device
    if (deviceId) {
      try {
        const dData = await db
          .select({ name: devices.name })
          .from(devices)
          .where(eq(devices.id, deviceId))
          .limit(1);
        if (dData.length > 0) deviceName = dData[0].name;
      } catch (err) {
        // Abaikan error database
      }
    }

    if (branchId) {
      socket.join(`branch_${branchId}`);
      console.log(
        `[WS] 🟢 Client terhubung ke Room: branch_${branchId} [Outlet: ${branchName}] ${deviceId ? `(Device: ${deviceId} - ${deviceName})` : ""}`,
      );
    } else {
      console.log(`[WS] 🟡 Client terhubung (Tanpa identitas Branch)`);
    }

    socket.on("disconnect", () => {
      console.log(
        `[WS] 🔴 Client disconnected dari Room: branch_${branchId || "UNKNOWN"} [Outlet: ${branchName}] ${deviceId ? `(Device: ${deviceId} - ${deviceName})` : ""}`,
      );
    });
  });

  // Hubungkan NATS Core Pub/Sub ke WebSocket Gateway
  const { nc } = getNatsInstance();
  const sub = nc.subscribe("sync.>");
  console.log("📡 WebSocket Gateway: Mendengarkan NATS subject 'sync.>'");

  (async () => {
    for await (const msg of sub) {
      try {
        const parts = msg.subject.split(".");
        const targetBranchId = parts[2];
        const payload = JSON.parse(sc.decode(msg.data));

        if (targetBranchId === "GLOBAL" || targetBranchId === "*") {
          io.emit("SYNC_HINT", payload);
          console.log(`[WS] 📢 Broadcast GLOBAL SYNC_HINT dikirim!`);
        } else if (targetBranchId) {
          io.to(`branch_${targetBranchId}`).emit("SYNC_HINT", payload);

          const sourceInfo = payload.sourceDeviceId
            ? ` dari Device: ${payload.sourceDeviceId}`
            : "";
          console.log(
            `[WS] ⚡ SYNC_HINT (Seq: ${payload.latestSequence}) dikirim ke branch_${targetBranchId}${sourceInfo}`,
          );
        }
      } catch (err) {
        console.error("[WS] Error forwarding sync hint:", err);
      }
    }
  })();
};

export const publishSyncHint = (
  tenantId: string,
  branchId: string,
  latestSequence: number | string,
  sourceDeviceId?: string,
) => {
  try {
    const { nc } = getNatsInstance();
    const subject = `sync.${tenantId}.${branchId}`;

    const payload = JSON.stringify({
      latestSequence,
      sourceDeviceId,
      timestamp: Date.now(),
    });

    nc.publish(subject, sc.encode(payload));
  } catch (error) {
    console.error("[NATS] Gagal mempublish Sync Hint", error);
  }
};
