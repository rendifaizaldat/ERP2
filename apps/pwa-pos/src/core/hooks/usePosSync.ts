// apps/pwa-pos/src/core/hooks/usePosSync.ts
import { useState, useRef, useEffect } from "react";
import { ledger, projector, eventBus, errorBus } from "../instances";
import { backgroundSync } from "../BackgroundSync";

export interface ExtendedProjectorState {
  isInitialized?: boolean;
  companyName?: string;
  branchId?: string;
  staffList?: any[];
  tables?: any[];
  categories?: any[];
  products?: any[];
  activeOperator?: any;
  sales?: any;
  transactions?: any[];
  pettyCashTransactions?: any[];
  auditLogs?: any[];
  currentShiftInitialCash?: number;
  settings?: any;
  [key: string]: any;
}

export interface ViewStateContract {
  activeTab: "DINE_IN" | "TAKE_AWAY" | "MENU";
  viewMode: "TABLES" | "MENU";
  selectedTable: string | null;
}

export const usePosSync = () => {
  const [state, setState] = useState<ExtendedProjectorState>(
    projector.getInitialState() as unknown as ExtendedProjectorState,
  );
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<any | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(true);
  const [viewState, setViewState] = useState<ViewStateContract>({
    activeTab: "DINE_IN",
    viewMode: "TABLES",
    selectedTable: null,
  });

  const isFirstLoadRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================
  // 🚀 IN-MEMORY STATE (THE O(1) ENGINE)
  // Menyimpan memori secara persisten antar render tanpa membebani DB
  // ============================================================
  const memRef = useRef({
    txMap: new Map(),
    pcMap: new Map(),
    activeOrdersMap: new Map(),
    auditArr: [] as any[],
    activeOperatorIdFromLedger: null as string | null,
  });

  const getCombinedStaff = () => {
    const ledgerStaff = state?.staffList || [];
    let hydratedStaff: any[] = [];
    try {
      const stored = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
      if (stored) hydratedStaff = JSON.parse(stored);
    } catch (err) {}
    return [...ledgerStaff, ...hydratedStaff];
  };

  const setViewStateDirect = (view: Partial<ViewStateContract>) => {
    setViewState((prev) => ({ ...prev, ...view }));
  };

  // ------------------------------------------------------------
  // 1. ENGINE PEMROSES EVENT (Reducer Murni)
  // ------------------------------------------------------------
  const processEvent = (ev: any, mem: typeof memRef.current) => {
    if (ev.type === "SHIFT_OPENED") {
      mem.activeOperatorIdFromLedger = ev.payload.operator_id;
    }
    if (ev.type === "SHIFT_CLOSED" || ev.type === "END_OF_DAY_PROCESSED") {
      mem.activeOperatorIdFromLedger = null;
    }
    if (ev.type === "LOCAL_DATA_PURGED") {
      mem.txMap.clear();
      mem.pcMap.clear();
      mem.activeOrdersMap.clear();
      mem.auditArr.length = 0;
      mem.activeOperatorIdFromLedger = null;
    }

    if (ev.type === "ORDER_CREATED" || ev.type === "ORDER_UPDATED") {
      mem.activeOrdersMap.set(
        ev.payload.orderId,
        JSON.parse(JSON.stringify(ev.payload)),
      );
    }

    if (ev.type === "KDS_STATUS_UPDATED") {
      const order = mem.activeOrdersMap.get(ev.payload.orderId);
      if (order && order.items) {
        order.items = order.items.map((i: any) => {
          if ((i.skuSnapshot || i.sku) === ev.payload.sku) {
            return { ...i, status: ev.payload.status };
          }
          return i;
        });
      }
    }

    if (ev.type === "INVOICE_CREATED") {
      const p = ev.payload;
      const relatedOrder = mem.activeOrdersMap.get(p.orderId);
      mem.txMap.set(p.invoiceId, {
        orderId: p.orderId,
        invoice_id: p.invoiceNumber,
        timestamp: ev.timestamp || Date.now(),
        tableLabel: relatedOrder?.tableLabel || "UNKNOWN",
        customerName: relatedOrder?.customerName || null,
        waiterName: "WAITRESS",
        cashierName: "CASHIER",
        subtotal: p.subtotal,
        tax_amount: p.taxAmount,
        service_amount: p.serviceAmount,
        grand_total: p.grandTotal,
        payment_method: "PENDING",
        status: p.status,
        items: relatedOrder
          ? relatedOrder.items.map((i: any) => ({
              sku: i.skuSnapshot,
              name: i.nameSnapshot,
              price: i.basePriceSnapshot,
              qty: i.qty,
              refundedQty: 0,
            }))
          : [],
      });
    }

    if (ev.type === "PAYMENT_RECEIVED") {
      const p = ev.payload;
      const tx = mem.txMap.get(p.invoiceId);
      if (tx) {
        tx.payment_method = p.method;
        tx.status = "PAID";

        if (tx.orderId) {
          const order = mem.activeOrdersMap.get(tx.orderId);
          if (order) order.isClosed = true;
        } else {
          mem.activeOrdersMap.forEach((order) => {
            if (order.tableLabel === tx.tableLabel) order.isClosed = true;
          });
        }
      }
    }

    if (ev.type === "PAYMENT_REFUNDED") {
      const p = ev.payload;
      const tx = mem.txMap.get(p.invoiceId);
      if (tx) {
        tx.status = "REFUNDED";
        if (Array.isArray(p.items)) {
          p.items.forEach((refundItem: any) => {
            const targetItem = tx.items.find(
              (i: any) => i.sku === refundItem.sku,
            );
            if (targetItem) {
              targetItem.refundedQty =
                (targetItem.refundedQty || 0) + refundItem.qtyRefunded;
            }
          });
        }
      }
    }

    if (ev.type === "TABLE_CLEARED") {
      mem.activeOrdersMap.forEach((order) => {
        if (order.tableLabel === ev.payload.tableLabel) order.isClosed = true;
      });
    }

  };

  // ------------------------------------------------------------
  // 2. BUILD STATE (Menerjemahkan Memory ke UI React)
  // ------------------------------------------------------------
  const buildAndSetState = (mem: typeof memRef.current) => {
    const computedState =
      projector.getState() as unknown as ExtendedProjectorState;
    const combinedStaff = getCombinedStaff();

    if (!computedState.tables) computedState.tables = [];
    computedState.tables.forEach((t: any) => {
      t.savedItems = [];
      t.currentBill = 0;
    });

    mem.activeOrdersMap.forEach((order) => {
      if (order.isClosed) return;
      let table = computedState.tables!.find(
        (t: any) => t.label === order.tableLabel,
      );
      if (!table) {
        table = {
          id: `MEJA-ID-${order.tableLabel}`,
          label: order.tableLabel,
          type: "VIRTUAL",
          capacity: 4,
          currentBill: 0,
          savedItems: [],
        };
        computedState.tables!.push(table);
      }
      table.savedItems = order.items.map((i: any) => ({
        id: i.id || i.productId,
        sku: i.skuSnapshot || i.sku,
        name: i.nameSnapshot || i.name,
        price: i.basePriceSnapshot || i.price,
        qty: i.qty,
        note: i.notes || i.note,
        status: i.status || "PENDING",
        voidedQty: i.voidedQty || 0,
        refundedQty: i.refundedQty || 0,
        voidReason: i.voidReason || null,
      }));
      table.currentBill = table.savedItems.reduce(
        (acc: number, curr: any) =>
          acc +
          curr.price *
            Math.max(
              0,
              curr.qty - (curr.voidedQty || 0) - (curr.refundedQty || 0),
            ),
        0,
      );
    });

    if (mem.activeOperatorIdFromLedger) {
      const foundStaff = combinedStaff.find(
        (s) => s.id === mem.activeOperatorIdFromLedger,
      );
      if (foundStaff) computedState.activeOperator = foundStaff;
    } else {
      computedState.activeOperator = null;
    }

    setState(computedState);
    setIsInitialized(
      !!computedState?.isInitialized ||
        Boolean(localStorage.getItem("ASSTRO_DEVICE_TOKEN")),
    );

    if (computedState?.activeOperator) {
      setCurrentOperator(computedState.activeOperator);
      if (isFirstLoadRef.current) {
        setIsScreenLocked(true);
        setViewState({
          activeTab: "DINE_IN",
          viewMode: "TABLES",
          selectedTable: null,
        });
      }
    } else {
      setCurrentOperator(null);
      setIsScreenLocked(true);
    }
    isFirstLoadRef.current = false;
  };

  // ------------------------------------------------------------
  // 3. JALUR EKSEKUSI (Full Scan vs Delta)
  // ------------------------------------------------------------
  const fullRebuild = async () => {
    try {
      const events: any[] = [];
      await ledger.replay((ev) => {
        events.push(ev);
      });
      await projector.runProjection(events);

      memRef.current.txMap.clear();
      memRef.current.pcMap.clear();
      memRef.current.activeOrdersMap.clear();
      memRef.current.auditArr = [];
      memRef.current.activeOperatorIdFromLedger = null;

      events.forEach((ev) => processEvent(ev, memRef.current));
      buildAndSetState(memRef.current);
    } catch (err: any) {
      errorBus.next(`Gagal memuat data: ${err.message || "Unknown error"}`);
    }
  };

  const applyDelta = async (newEv: any) => {
    try {
      // Jalankan 1 event saja ke Projector (Katalog/Kategori) -> Sangat Cepat
      await projector.runProjection([newEv]);
      // Masukkan ke memori RAM -> Instan
      processEvent(newEv, memRef.current);
      buildAndSetState(memRef.current);
    } catch (err: any) {
      console.error("Delta Sync Error:", err);
    }
  };

  useEffect(() => {
    const subscription = eventBus.subscribe((evPayload) => {
      // Jalur Cepat (Tombol ditekan): Tembak Delta langsung ke UI
      if (evPayload && evPayload.type) {
        applyDelta(evPayload);
      }
      // Panggilan kosongan dari usePosActions tidak akan memicu loading berulang
      backgroundSync.triggerPush();
    });

    const handleRemoteSync = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        // Delta Batch dari Tarikan Pusat
        e.detail.forEach((ev: any) =>
          processEvent({ type: ev.type, payload: ev.payload }, memRef.current),
        );
        buildAndSetState(memRef.current);
      } else {
        fullRebuild();
      }
    };

    window.addEventListener("SYNC_PULL_SUCCESS", handleRemoteSync);
    window.addEventListener("FORCE_FULL_REBUILD", fullRebuild);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("SYNC_PULL_SUCCESS", handleRemoteSync);
      window.removeEventListener("FORCE_FULL_REBUILD", fullRebuild);
    };
  }, []);

  const resetIdleTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentOperator && !isScreenLocked) {
      timeoutRef.current = setTimeout(() => setIsScreenLocked(true), 60000);
    }
  };

  useEffect(() => {
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    if (currentOperator && !isScreenLocked) {
      resetIdleTimer();
      activityEvents.forEach((evt) =>
        window.addEventListener(evt, resetIdleTimer),
      );
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, resetIdleTimer),
      );
    };
  }, [currentOperator, isScreenLocked]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await ledger.init();
      if (isMounted) {
        await fullRebuild(); // Hanya terjadi 1x saat aplikasi baru dibuka (F5)
        setIsReady(true);
        backgroundSync.start();
      }
    };
    init();
    return () => {
      isMounted = false;
      backgroundSync.stop();
    };
  }, []);

  return {
    state,
    isReady,
    isInitialized,
    currentOperator,
    isScreenLocked,
    viewState,
    getCombinedStaff,
    setIsScreenLocked,
    setViewStateDirect,
    setCurrentOperator,
  };
};
