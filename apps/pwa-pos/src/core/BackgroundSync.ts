import { ledger } from "./instances";
import { io, Socket } from "socket.io-client";

class SyncWorker {
  private isSyncing = false;
  private hasPendingPush = false; // [FIX] Bendera Antrean untuk input super cepat
  private isPulling = false;
  private socket: Socket | null = null;
  private pullTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private deviceId = "";

  start(branchId: string = "", deviceId: string = "") {
    this.deviceId = deviceId || localStorage.getItem("ASSTRO_DEVICE_ID") || "";
    const bId = branchId || localStorage.getItem("ASSTRO_BRANCH_ID") || "";

    window.addEventListener("online", () => {
      this.retryCount = 0;
      this.triggerPush();
      this.triggerDebouncedPull();
    });

    this.connectWebSocket(bId, this.deviceId);

    if (navigator.onLine) {
      this.triggerPush();
      this.triggerDebouncedPull();
    }
  }

  stop() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.pullTimeoutId) {
      clearTimeout(this.pullTimeoutId);
    }
  }

  private connectWebSocket(branchId: string, deviceId: string) {
    const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

    this.socket = io(API_URL, {
      query: { branchId, deviceId },
    });

    this.socket.on(
      "SYNC_HINT",
      (payload: { latestSequence: string; sourceDeviceId: string }) => {
        if (payload.sourceDeviceId === this.deviceId) return;

        const localSequence =
          localStorage.getItem("ASSTRO_LAST_PULL_SEQUENCE") || "0";

        if (payload.latestSequence > localSequence) {
          this.triggerDebouncedPull();
        }
      },
    );
  }

  public triggerDebouncedPull() {
    if (this.pullTimeoutId) clearTimeout(this.pullTimeoutId);

    this.pullTimeoutId = setTimeout(async () => {
      if (this.isPulling || !navigator.onLine) return;
      this.isPulling = true;

      try {
        await this.executeDeltaPull();
      } catch (error) {
        console.error("[SYNC] Delta Pull Error:", error);
      } finally {
        this.isPulling = false;
      }
    }, 1500);
  }

  private async executeDeltaPull() {
    const since = localStorage.getItem("ASSTRO_LAST_PULL_SEQUENCE") || "0";
    const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
    if (!token) return;

    const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

    const response = await fetch(`${API_URL}/api/sync/pull?since=${since}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const newEvents = await response.json();
      if (newEvents.length > 0) {
        const highestSequence = newEvents[newEvents.length - 1].sequence_id;
        localStorage.setItem("ASSTRO_LAST_PULL_SEQUENCE", highestSequence);

        for (const ev of newEvents) {
          await ledger.appendEvent(ev.type, ev.payload, { _isRemote: true });
        }

        window.dispatchEvent(
          new CustomEvent("SYNC_PULL_SUCCESS", { detail: newEvents }),
        );
      }
    }
  }

  async forceTrigger() {
    localStorage.setItem("ASSTRO_SYNC_INDEX", "0");
    this.retryCount = 0;
    await this.triggerPush(true);
    await this.executeDeltaPull();
  }

  public async triggerPush(isManual: boolean = false) {
    // 1. Jika sedang offline dan bukan paksaan manual, batalkan.
    if (!navigator.onLine && !isManual) return;

    // [FIX] 2. Logika Antrean (Queue)
    // Jika sistem sedang sibuk mengirim data sebelumnya, catat bahwa ada ketukan baru
    // agar dieksekusi setelah pengiriman yang sekarang selesai.
    if (this.isSyncing && !isManual) {
      this.hasPendingPush = true;
      return;
    }

    this.isSyncing = true;

    try {
      const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
      if (!token) {
        this.isSyncing = false;
        return;
      }

      const allEvents: any[] = [];
      await ledger.replay((ev) => {
        allEvents.push(ev);
      });

      const lastIndex = Number(
        localStorage.getItem("ASSTRO_SYNC_INDEX") || "0",
      );

      const eventsToPush = allEvents
        .slice(lastIndex)
        .filter((ev) => !ev.metadata?._isRemote);

      if (eventsToPush.length === 0) {
        this.isSyncing = false;
        this.retryCount = 0;
        localStorage.setItem("ASSTRO_SYNC_INDEX", allEvents.length.toString());
        return;
      }

      const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

      const response = await fetch(`${API_URL}/api/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: eventsToPush }),
      });

      if (response.ok) {
        localStorage.setItem("ASSTRO_SYNC_INDEX", allEvents.length.toString());
        this.retryCount = 0;
        window.dispatchEvent(new CustomEvent("SYNC_SUCCESS"));
      } else if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("REQUIRE_REAUTH"));
        throw new Error("401");
      } else {
        throw new Error("Server menolak paket.");
      }
    } catch (error: any) {
      this.retryCount++;
      window.dispatchEvent(
        new CustomEvent("SYNC_ERROR", { detail: error.message }),
      );
      const backoffDelay = Math.min(
        Math.pow(5, this.retryCount) * 1000,
        300000,
      );

      if (error.message.includes("23503")) {
        localStorage.setItem("ASSTRO_SYNC_INDEX", "0");
      }

      setTimeout(() => this.triggerPush(), backoffDelay);
    } finally {
      this.isSyncing = false;

      // [FIX] 3. Eksekusi Antrean
      // Begitu HTTP Request selesai dan status isSyncing = false,
      // cek apakah ada antrean data yang masuk saat sedang memproses tadi.
      if (this.hasPendingPush) {
        this.hasPendingPush = false; // Reset bendera
        this.triggerPush(); // Panggil ulang dirinya sendiri untuk menyapu sisa data
      }
    }
  }
}

export const backgroundSync = new SyncWorker();
