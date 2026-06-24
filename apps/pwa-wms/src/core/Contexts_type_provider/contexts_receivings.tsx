import { useState, useCallback, useEffect } from "react";
import { executeMutation } from "../service";
import { API_BASE_URL } from "../constants";
import type { WmsDatabase } from "../database/rx-db";
import type { WmsState } from "./contexts_auth";
import type { PiutangPayment } from "./contexts_piutang";

// Jaga kompatibilitas tipe data agar halaman PusatHutang tidak break
export interface AccountPayableData {
  id: string;
  tanggal: string;
  vendor: string;
  total: number;
  dibayar: number;
  sisa: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  docStatus?: string;
  jatuhTempo: string | null;
  payments: PiutangPayment[];
  items: any[];
}

export function useReceivings(
  db: WmsDatabase | null,
  wmsState: WmsState | null,
) {
  const [receivings, setReceivings] = useState<any[]>([]);

  // 1. Subscription Otomatis ke RxDB Lokal (Mendorong Real-time UI Update)
  useEffect(() => {
    if (!db) return;
    const sub = db.wms_receivings.find().$.subscribe((docs) => {
      setReceivings(docs.map((d) => d.toJSON()));
    });
    return () => sub.unsubscribe();
  }, [db]);

  // 2. Sinkronisasi Awal Data dari Server SQL ke RxDB Lokal
  const fetchReceivings = useCallback(async () => {
    if (!wmsState?.regionId || !db) return;
    try {
      // FIX: Potong URL agar base url bersih (contoh: http://localhost:4000)
      const baseUrl = API_BASE_URL.split("/api")[0];
      const targetUrl = `${baseUrl}/api/wms/receivings?regionId=${wmsState.regionId}`;

      const response = await fetch(targetUrl);
      if (!response.ok)
        throw new Error("Gagal mengambil data receivings dari server");
      const data = await response.json();

      if (data && data.length > 0) {
        for (const item of data) {
          await db.wms_receivings.upsert(item);
        }
      }
    } catch (error) {
      console.error("[FETCH_RECEIVINGS_ERROR] Gagal sinkronisasi data:", error);
    }
  }, [wmsState, db]);

  // 3. Proses Pembayaran Hutang Pusat (Beralih ke Offline-First Outbox)
  const processPaymentHutang = useCallback(
    async (payload: any) => {
      if (!db) return;

      // Simpan ke outbox untuk antrean background sync
      await db.wms_outbox.insert({
        id: payload.id,
        type: "PAYMENT_CREATED",
        payload,
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });

      // Proyeksi Optimistik UI ke database RxDB lokal
      const doc = await db.wms_receivings.findOne(payload.receivingId).exec();
      if (doc) {
        const currentData = doc.toJSON();
        const updatedPayments = [
          ...(currentData.payments || []),
          {
            id: payload.id,
            date: payload.paymentDate.split("T")[0],
            amount: payload.amount,
            proof: payload.proofOfTransfer,
            notes: payload.notes,
          },
        ];
        await doc.incrementalPatch({
          totalPayment: payload.newTotalPayment,
          paymentStatus: payload.newPaymentStatus,
          payments: updatedPayments,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db],
  );

  // 4. Proses Pembayaran/Pengembalian dari Sisi AP Outlet (Fisik / Uang)
  const processPaymentApOutlet = useCallback(
    async (payload: any) => {
      if (!db) return;

      // Simpan ke outbox antrean
      await db.wms_outbox.insert({
        id: payload.id,
        type: "AP_OUTLET_PAYMENT_SUBMITTED",
        payload,
        createdAt: new Date().toISOString(),
        syncStatus: "PENDING",
      });

      // Jalankan Optimistic Patch lokal
      const doc = await db.wms_receivings.findOne(payload.receivingId).exec();
      if (doc) {
        const currentData = doc.toJSON();
        const updatedPayments = [
          ...(currentData.payments || []),
          {
            id: payload.id,
            date: payload.paymentDate.split("T")[0],
            amount: payload.amount,
            proof: payload.proofOfTransfer,
            notes: payload.notes,
            paymentMethod: payload.paymentMethod,
            fundingSource: payload.fundingSource,
          },
        ];

        const patchData: any = {
          totalPayment: payload.newTotalPayment,
          paymentStatus: payload.newPaymentStatus,
          payments: updatedPayments,
          updatedAt: new Date().toISOString(),
        };

        if (payload.newLoanStatus) {
          patchData.loanStatus = payload.newLoanStatus;
        }

        await doc.incrementalPatch(patchData);
      }
    },
    [db],
  );

  return {
    receivings,
    fetchReceivings,
    processPaymentHutang,
    processPaymentApOutlet,
  };
}
