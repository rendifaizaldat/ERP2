import { useEffect, useRef } from "react";
import { useWms } from "./WmsProvider";

export const useDashboardPosSync = () => {
  const { db, wmsState } = useWms();
  const isPulling = useRef(false);

  const pullPosData = async () => {
    if (!db || isPulling.current) return;
    isPulling.current = true;

    try {
      // Ambil timestamp tarikan terakhir dari LocalStorage
      const lastUpdate = localStorage.getItem("ASSTRO_WMS_POS_LAST_SYNC") || "";
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

      const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN"); // Gunakan token admin WMS

      const res = await fetch(
        `${API_URL}/api/wms/pos-data/sync?lastUpdate=${lastUpdate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) throw new Error("Gagal fetch data POS");

      const result = await res.json();
      const { invoices, payments } = result.data;

      if (invoices.length > 0) {
        await db.wms_pos_invoices.bulkUpsert(
          invoices.map((inv: any) => ({ ...inv, _deleted: false })),
        );
      }

      if (payments.length > 0) {
        await db.wms_pos_payments.bulkUpsert(
          payments.map((pay: any) => ({ ...pay, _deleted: false })),
        );
      }

      // Simpan waktu server sebagai checkpoint untuk Delta Pull selanjutnya
      localStorage.setItem("ASSTRO_WMS_POS_LAST_SYNC", result.timestamp);

      if (invoices.length > 0 || payments.length > 0) {
        console.log(
          `📊 [Dashboard Sync] Berhasil menarik ${invoices.length} invoice & ${payments.length} payment dari POS.`,
        );
      }
    } catch (error) {
      console.error("❌ [Dashboard Sync] Error pulling POS data:", error);
    } finally {
      isPulling.current = false;
    }
  };

  useEffect(() => {
    // 1. Tarikan pertama kali saat komponen di-mount
    pullPosData();

    // 2. Dengarkan sinyal dari WebSocket (melalui sync-worker WMS Anda)
    // Asumsi: WMS memancarkan event ini saat mendeteksi WSS SYNC_HINT
    const handleSyncHint = () => pullPosData();
    window.addEventListener("WMS_SYNC_HINT_RECEIVED", handleSyncHint);

    return () => {
      window.removeEventListener("WMS_SYNC_HINT_RECEIVED", handleSyncHint);
    };
  }, [db]);

  return { pullPosData };
};
