// apps/pwa-wms/src/core/Contexts_type_provider/contexts_sync.tsx
import { useCallback } from "react";
import { executeMutation } from "../service";
import { useBackgroundSync } from "../useBackgroundSync";

export function useSync(wmsState?: any, onSyncTriggered?: () => Promise<void>) {
  // Mengirim state dan trigger WebSocket ke Engine Background Sync
  const { isOnline, isSyncing, syncData } = useBackgroundSync(
    wmsState,
    onSyncTriggered,
  );

  const addSyncTask = useCallback(
    async (target: string, method: "POST" | "GET", payload: any) => {
      console.log("[SYNC_TASK]", { target, method, payload });
      try {
        await executeMutation(target, method, payload);
      } catch (err) {
        console.error("[SYNC_TASK] Gagal eksekusi", err);
      }
    },
    [],
  );

  const showToast = useCallback(
    (message: string, type: "SUCCESS" | "ERROR" | "WARNING" | "INFO") => {
      console.log(`[TOAST][${type}]`, message);
    },
    [],
  );

  return { isOnline, isSyncing, syncData, addSyncTask, showToast };
}
