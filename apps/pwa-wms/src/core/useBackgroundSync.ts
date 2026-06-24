import { useState, useEffect, useCallback, useRef } from "react";
import { getWmsDb } from "./database/rx-db";
import { executeMutation } from "./service";
import { API_BASE_URL } from "./constants";
import { WmsEventEnvelope } from "../../../../packages/protocol/src/wms-events";
import { io, Socket } from "socket.io-client";

export const useBackgroundSync = (
  wmsState?: any,
  onSyncTriggered?: () => Promise<void>,
) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isProcessing = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  // [BARU] Simpan referensi fungsi agar tidak men-trigger ulang useEffect WebSocket
  const syncTriggerRef = useRef(onSyncTriggered);
  useEffect(() => {
    syncTriggerRef.current = onSyncTriggered;
  }, [onSyncTriggered]);

  // =====================================================================
  // 1. PUSH LOGIC (Tidak ada perubahan)
  // =====================================================================
  const syncData = useCallback(async () => {
    if (!navigator.onLine || isProcessing.current) return;
    isProcessing.current = true;
    setIsSyncing(true);

    try {
      const db = await getWmsDb();
      const pendingDocs = await db.wms_outbox
        .find({
          selector: { syncStatus: "PENDING" },
          sort: [{ createdAt: "asc" }],
        })
        .exec();

      if (pendingDocs.length > 0) {
        const baseUrl = API_BASE_URL.split("/api")[0];
        const UNIVERSAL_SYNC_URL = `${baseUrl}/api/wms/events`;

        for (const doc of pendingDocs) {
          try {
            const envelope: WmsEventEnvelope = {
              eventId: doc.id,
              aggregateId: doc.aggregateId,
              timestamp: doc.createdAt,
              event: { type: doc.type as any, payload: doc.payload },
            };

            await executeMutation(UNIVERSAL_SYNC_URL, "POST", envelope);

            const latestDoc = await db.wms_outbox.findOne(doc.id).exec();
            if (latestDoc) await latestDoc.remove();
          } catch (error) {
            console.error(
              `[SYNC_PUSH] Gagal memproses event ${doc.id}:`,
              error,
            );
            break;
          }
        }
      }
    } catch (error) {
      console.error("[SYNC_ERROR] Fatal Error:", error);
    } finally {
      setIsSyncing(false);
      isProcessing.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", () => setIsOnline(false));

    let sub: any;
    getWmsDb().then((db) => {
      sub = db.wms_outbox
        .find({ selector: { syncStatus: "PENDING" } })
        .$.subscribe((docs) => {
          if (docs.length > 0 && navigator.onLine && !isProcessing.current)
            syncData();
        });
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", () => setIsOnline(false));
      if (sub) sub.unsubscribe();
    };
  }, [syncData]);

  // =====================================================================
  // 2. PULL LOGIC (Diperbaiki dependency-nya agar tidak disconnect)
  // =====================================================================

  const branchId = wmsState?.branchId;
  const wmsType = wmsState?.wmsType;

  useEffect(() => {
    if (!wmsType) return; // Tunggu sampai state auth ready

    const roomIdentity = wmsType === "PUSAT" ? "PUSAT" : branchId;
    const baseUrl = API_BASE_URL.split("/api")[0];

    // AMBIL LANGSUNG DARI LOCALSTORAGE
    const deviceId =
      localStorage.getItem("ASSTRO_DEVICE_ID") || wmsState?.deviceId || "";

    const socket = io(baseUrl, {
      query: {
        branchId: roomIdentity,
        deviceId: deviceId,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log(
        `[PWA SYNC] 🟢 Terhubung stabil ke WS! Room: branch_${roomIdentity}`,
      );
    });
    socket.on("SYNC_HINT", async (payload) => {
      console.log(
        `[PWA SYNC] 🔔 Sinyal Data Baru: Seq ${payload.latestSequence}`,
      );
      if (syncTriggerRef.current) {
        try {
          await syncTriggerRef.current();
          console.log(`[PWA SYNC] ✅ Delta Sync Selesai.`);
        } catch (error) {
          console.error("[PWA SYNC] ❌ Delta Sync gagal:", error);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("WMS_SYNC_HINT_RECEIVED", { detail: payload }),
        );
      }
    });

    socket.on("disconnect", () => {
      console.log(`[PWA SYNC] 🔴 Terputus dari Gateway WS.`);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [branchId, wmsType]);

  return { isOnline, isSyncing, syncData };
};
