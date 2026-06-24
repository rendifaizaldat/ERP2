// apps/pwa-pos/src/core/instances.ts
import { LedgerEngine } from "@asstro/ledger";
import { ProjectionEngine } from "@asstro/projection";
import { Subject, BehaviorSubject } from "rxjs";

// Global instances (Singleton)
export const ledger = new LedgerEngine();
export const projector = new ProjectionEngine();

// Event Bus untuk reaktivitas UI (Jalur Sukses/Update)
export const eventBus = new Subject<any>(); // [UBAH] Tambahkan <any> agar bisa membawa payload

// Error Bus untuk menyiarkan kegagalan sistem ke UI (Jalur Gagal/Alarm)
export const errorBus = new Subject<string>();

// Status Jaringan Reaktif
export const networkStatus = new BehaviorSubject<boolean>(navigator.onLine);
window.addEventListener("online", () => networkStatus.next(true));
window.addEventListener("offline", () => networkStatus.next(false));

// =========================================================================
// 🔥 OPTIMASI O(1) DELTA PERFORMANCE (THE INTERCEPTOR)
// =========================================================================
// Menyadap fungsi appendEvent agar setiap event yang masuk ke DB lokal
// langsung dilemparkan secara spesifik ke UI. Ini membunuh kebutuhan
// UI untuk melakukan full-scan (baca ulang seluruh database).
const originalAppend = ledger.appendEvent.bind(ledger);
ledger.appendEvent = async (type: string, payload: any, meta?: any) => {
  const result = await originalAppend(type, payload, meta);
  // Tembakkan event yang baru masuk ke eventBus sebagai Delta
  eventBus.next({ type, payload, meta, timestamp: Date.now() });
  return result;
};

// =========================================================================
// FUNGSI DISASTER RECOVERY (OFFLINE EOD CLOSING & MANUAL BACKUP)
// =========================================================================

export const exportLedgerToJson = async (branchId: string): Promise<void> => {
  try {
    const events: any[] = [];
    await ledger.replay((ev) => {
      events.push(ev);
    });

    if (events.length === 0) {
      throw new Error("Tidak ada data transaksi hari ini untuk dibackup.");
    }

    const backupData = {
      version: "1.0",
      branch_id: branchId,
      timestamp: Date.now(),
      record_count: events.length,
      events: events,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 16).replace(":", "");
    a.download = `Backup_EOD_${branchId}_${dateStr}_${timeStr}.json`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(
      `✅ [DISASTER RECOVERY] Berhasil membuat file backup: ${a.download}`,
    );
  } catch (error) {
    console.error("Gagal mengekspor Ledger:", error);
    throw error;
  }
};

export const importLedgerFromJson = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        if (!backupData.events || !Array.isArray(backupData.events)) {
          throw new Error(
            "Format file JSON tidak valid. Kunci 'events' tidak ditemukan.",
          );
        }

        let importedCount = 0;

        for (const ev of backupData.events) {
          if (ev.type !== "LOCAL_DATA_PURGED") {
            await ledger.appendEvent(ev.type, ev.payload);
            importedCount++;
          }
        }

        // Tembak event untuk trigger Full Rebuild
        window.dispatchEvent(new CustomEvent("FORCE_FULL_REBUILD"));
        console.log(`✅ [RESTORE] Berhasil memulihkan ${importedCount} event.`);
        resolve(importedCount);
      } catch (err) {
        console.error("Gagal mengurai file JSON:", err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Gagal membaca file fisik."));
    reader.readAsText(file);
  });
};
