import { LedgerEvent } from "../../ledger/src/engine";
import { InventoryState, SalesState, OrderItem, SettingsState, ReconProjection, ReportProjection, CashProjection } from "./types";

export interface StaffMember {
  id: string;
  name: string;
  role: "ADMIN" | "CASHIER" | "WAITER";
  pin: string;
  isActive: boolean;
}

export interface TableMaster {
  id: string;
  label: string;
  type: "MEJA" | "LESEHAN";
  capacity: number;
  status: "KOSONG" | "TERISI" | "REQUEST_BAYAR" | "PAID";
  currentBill: number;
  isActive: boolean;
  activeOrderId?: string;
  savedItems?: OrderItem[] | any[];
}

export interface CategoryMaster {
  id: string;
  name: string;
}

export interface ProductMaster {
  id?: string;
  sku: string;
  name: string;
  price: number;
  categoryId: string;
  isActive: boolean;
  isArchived: boolean;
}

export class ProjectionEngine {
  private lastProcessedSeq: number = 0;

  private isInitialized: boolean = false;
  private companyName: string = "";
  private branchId: string = "";
  private regionName: string = "";
  private latitude: number = 0;
  private longitude: number = 0;
  private staffList: StaffMember[] = [];
  private tables: TableMaster[] = [];
  private categories: CategoryMaster[] = [];
  private products: ProductMaster[] = [];
  private inventory: InventoryState = {};
  private auditLogs: any[] = [];
  private transactions: any[] = [];
  private sales: SalesState = {
    total_revenue: 0,
    total_transactions: 0,
    total_refunds: 0,
    last_invoice: null,
  };
  private activeOperator: StaffMember | null = null;
  private settings: SettingsState = {};

  private shiftInitialCash: number = 0;
  private pettyCashTransactions: any[] = [];
  private reportData: ReportProjection | null = null;
  private reconData: ReconProjection | null = null;
  private cashData: CashProjection | null = null;

  private calculateOrderBill(items: OrderItem[] | any[]): number {
    return (items as any[]).reduce((total: number, item: any) => {
      const voidQty = item.voidedQty || 0;
      const refundQty = item.refundedQty || 0;
      const activeQty = Math.max(0, item.qty - voidQty - refundQty);
      const price = item.basePriceSnapshot || item.price || 0;
      return total + activeQty * price;
    }, 0);
  }

  private handleEvent(event: LedgerEvent) {
    // ==============================================================
    // [OPTIMISTIC UI INTERCEPTOR] Tangkap Semua Log Keamanan
    // ==============================================================
    const securityEvents = [
      "ORDER_VOIDED",
      "ORDER_CANCELLED",
      "PAYMENT_REFUNDED",
      "ORDER_REFUNDED",
    ];
    if (securityEvents.includes(event.type)) {
      const p = event.payload as any;
      this.auditLogs.unshift({
        eventType: event.type,
        timestamp: Date.now(), // Realtime UI feedback
        reason:
          p.reason ||
          p.voidNote ||
          p.voidReason ||
          "[Sistem] Otorisasi Keamanan Dijalankan",
        operatorId: p.operatorId || p.managerId || p.operator_id || "SYS",
        orderId: p.invoiceId || p.orderId || p.tableLabel || "UNKNOWN",
      });
    }

    switch (event.type) {
      case "SYSTEM_INITIALIZED": {
        const payload = event.payload as any;
        this.isInitialized = true;
        this.companyName = payload.company_name || "";
        this.branchId = payload.branch_id || "";
        this.regionName = payload.region_name || "";
        this.latitude = Number(payload.latitude) || 0;
        this.longitude = Number(payload.longitude) || 0;
        this.staffList = [
          {
            id: "ADMIN-000",
            name: payload.admin_name || "",
            role: "ADMIN",
            pin: payload.admin_pin || "",
            isActive: true,
          },
        ];
        break;
      }

      case "MEMBER_REGISTERED": {
        break;
      } // ==============================================================
      // [NEW ARCHITECTURE] ORDER (LAYER 1)
      // ==============================================================

      case "ORDER_CREATED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();
        const orderId = payload.orderId;
        const newBill = this.calculateOrderBill(payload.items || []);

        const tableIndex = this.tables.findIndex((t) => t.label === labelUpper);
        if (tableIndex >= 0) {
          this.tables[tableIndex] = {
            ...this.tables[tableIndex],
            status: "TERISI" as const,
            currentBill: newBill,
            activeOrderId: orderId,
            savedItems: payload.items || [],
          };
        } else {
          this.tables.push({
            id: `V-ID-${labelUpper}-${Date.now()}`,
            label: labelUpper,
            type: "MEJA" as const,
            capacity: 4,
            status: "TERISI" as const,
            currentBill: newBill,
            activeOrderId: orderId,
            savedItems: payload.items || [],
            isActive: true,
          });
        }
        break;
      }

      case "ORDER_UPDATED": {
        const payload = event.payload as any;
        const newLabelUpper = payload.tableLabel.toUpperCase();
        const orderId = payload.orderId;
        const updatedBill = this.calculateOrderBill(payload.items || []); // 1. Tangani Skenario Pindah Meja: Bersihkan meja lama jika order ini pindah

        this.tables = this.tables.map((t) => {
          if (t.activeOrderId === orderId && t.label !== newLabelUpper) {
            return {
              ...t,
              status: "KOSONG" as const,
              currentBill: 0,
              activeOrderId: undefined,
              savedItems: [],
            };
          }
          return t;
        }); // 2. Terapkan update ke meja yang dituju

        let foundTargetTable = false;
        this.tables = this.tables.map((t) => {
          if (t.label === newLabelUpper) {
            foundTargetTable = true; // Cek jika seluruh item void/refund

            const activeItemsExist = (payload.items || []).some(
              (item: any) =>
                Math.max(
                  0,
                  item.qty - (item.voidedQty || 0) - (item.refundedQty || 0),
                ) > 0,
            ); // Matikan produk jika alasan Void adalah BARANG_KOSONG

            (payload.items || []).forEach((item: any) => {
              if (item.voidReason === "BARANG_KOSONG") {
                this.products = this.products.map((p) =>
                  p.sku === item.skuSnapshot ? { ...p, isActive: false } : p,
                );
              }
            });

            return {
              ...t,
              status: activeItemsExist
                ? t.status === "KOSONG"
                  ? "TERISI"
                  : t.status
                : "KOSONG",
              currentBill: updatedBill,
              activeOrderId: orderId,
              savedItems: payload.items || [],
            };
          }
          return t;
        });

        if (!foundTargetTable) {
          this.tables.push({
            id: `V-ID-${newLabelUpper}-${Date.now()}`,
            label: newLabelUpper,
            type: "MEJA" as const,
            capacity: 4,
            status: updatedBill > 0 ? "TERISI" : "KOSONG",
            currentBill: updatedBill,
            activeOrderId: orderId,
            savedItems: payload.items || [],
            isActive: true,
          });
        } // Hancurkan meja Virtual / Take Away yang sudah KOSONG akibat Void penuh

        this.tables = this.tables.filter(
          (t) => t.status !== "KOSONG" || t.id.startsWith("MEJA-ID"),
        );
        break;
      }
      case "KDS_STATUS_UPDATED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();

        this.tables = this.tables.map((t) => {
          if (
            t.label === labelUpper &&
            t.activeOrderId === payload.orderId &&
            t.savedItems
          ) {
            const updatedItems = t.savedItems.map((item: any) => {
              // Ganti statusnya hanya pada SKU yang dituju
              if ((item.skuSnapshot || item.sku) === payload.sku) {
                return { ...item, status: payload.status };
              }
              return item;
            });
            return { ...t, savedItems: updatedItems };
          }
          return t;
        });
        break;
      } // ==============================================================
      // [NEW ARCHITECTURE] INVOICE (LAYER 2) & PAYMENT (LAYER 3)
      // ==============================================================
      case "INVOICE_CREATED": {
        const payload = event.payload as any;
        const orderId = payload.orderId;

        if (orderId) {
          this.tables = this.tables.map((t) =>
            t.activeOrderId === orderId
              ? { ...t, status: "REQUEST_BAYAR" as const }
              : t,
          );
        }
        break;
      }

      case "INVOICE_STATUS_UPDATED": {
        // Reservasi logika untuk parsial payment jika diperlukan ke depannya
        break;
      }

      case "PAYMENT_RECEIVED": {
        const payload = event.payload as any;
        const netAmount =
          (payload.amountPaid || 0) - (payload.changeAmount || 0);

        this.sales.total_revenue += netAmount;
        this.sales.total_transactions += 1;
        this.sales.last_invoice = payload.invoiceId;
        break;
      }

      case "PAYMENT_REFUNDED": {
        const payload = event.payload as any;
        this.sales.total_revenue -= payload.totalRefundAmount || 0;
        this.sales.total_refunds += payload.totalRefundAmount || 0;
        break;
      } // ==============================================================
      // [LEGACY] EVENT TRANSAKSI (DIPERTAHANKAN UNTUK DATA LAMA)
      // ==============================================================

      case "TABLE_ORDER_PLACED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();
        const tableIndex = this.tables.findIndex((t) => t.label === labelUpper);

        if (tableIndex >= 0) {
          this.tables[tableIndex] = {
            ...this.tables[tableIndex],
            status: "TERISI" as const,
            currentBill: Number(payload.grandTotal) || 0,
            savedItems: payload.items || [],
          };
        } else {
          this.tables.push({
            id: payload.id || `V-ID-${labelUpper}-${Date.now()}`,
            label: labelUpper,
            type: "MEJA" as const,
            capacity: 4,
            status: "TERISI" as const,
            currentBill: Number(payload.grandTotal) || 0,
            savedItems: payload.items || [],
            isActive: true,
          });
        }
        break;
      }

      case "TABLE_PAYMENT_PROCESSED": {
        const payload = event.payload as any;
        this.tables = this.tables.map((t) =>
          t.label === payload.tableLabel.toUpperCase()
            ? { ...t, status: "PAID" as const }
            : t,
        );
        break;
      }

      case "SALE_CREATED": {
        const payload = event.payload as any;
        this.sales.total_revenue += payload.grand_total || 0;
        this.sales.total_transactions += 1;
        this.sales.last_invoice = payload.invoice_id;

        if (payload.items) {
          payload.items.forEach((item: any) => {
            this.updateStock(item.sku, -(item.qty || 0), event.hlc);
          });
        }
        break;
      }

      case "ORDER_VOIDED": {
        const payload = event.payload as any;
        const labelUpper = payload.tableLabel.toUpperCase();

        this.tables = this.tables
          .map((t) => {
            if (t.label === labelUpper && t.savedItems) {
              let itemPrice = 0;
              const updatedItems = t.savedItems
                .map((item: any) => {
                  // Prioritas pencocokan berdasarkan ID
                  if (
                    item.id === payload.sku ||
                    (!item.id &&
                      (item.sku === payload.sku ||
                        item.skuSnapshot === payload.sku))
                  ) {
                    itemPrice = item.price || item.basePriceSnapshot || 0;
                    return {
                      ...item,
                      qty: Math.max(0, item.qty - payload.qtyToVoid),
                    };
                  }
                  return item;
                })
                .filter((item: any) => item.qty > 0);

              const newBill =
                updatedItems.length === 0
                  ? 0
                  : Math.max(0, t.currentBill - itemPrice * payload.qtyToVoid);
              const newStatus = updatedItems.length === 0 ? "KOSONG" : t.status;

              return {
                ...t,
                savedItems: updatedItems,
                currentBill: newBill,
                status: newStatus,
              };
            }
            return t;
          })
          .filter((t) => t.status !== "KOSONG" || t.id.startsWith("MEJA-ID"));

        if (payload.voidType === "BARANG_KOSONG") {
          this.products = this.products.map((p) =>
            p.sku === payload.sku || p.id === payload.sku
              ? { ...p, isActive: false }
              : p,
          );
        }
        break;
      }

      case "TABLE_CLEARED": {
        const payload = event.payload as any;
        this.tables = this.tables
          .map((t) =>
            t.label === payload.tableLabel.toUpperCase()
              ? {
                  ...t,
                  status: "KOSONG" as const,
                  currentBill: 0,
                  activeOrderId: undefined,
                  savedItems: [],
                }
              : t,
          )
          .filter((t) => t.status !== "KOSONG" || t.id.startsWith("MEJA-ID"));
        break;
      } // ==============================================================
      // MASTER DATA (PRODUK, KATEGORI, MEJA, STAFF)
      // ==============================================================

      case "TABLE_ADDED": {
        const payload = event.payload as any;
        if (
          !this.tables.some(
            (t) =>
              t.id === payload.id || t.label === payload.label.toUpperCase(),
          )
        ) {
          this.tables.push({
            id: payload.id,
            label: payload.label.toUpperCase(),
            type: payload.type as "MEJA" | "LESEHAN",
            capacity: Number(payload.capacity) || 2,
            status: "KOSONG",
            currentBill: 0,
            isActive: true,
          });
        }
        break;
      }

      case "TABLE_TOGGLED": {
        const payload = event.payload as any;
        this.tables = this.tables.map((t) =>
          t.id === payload.id ? { ...t, isActive: payload.isActive } : t,
        );
        break;
      }

      case "CATEGORY_ADDED": {
        const payload = event.payload as any;
        if (!this.categories.some((c) => c.id === payload.id)) {
          this.categories.push({
            id: payload.id,
            name: payload.name.toUpperCase(),
          });
        }
        break;
      }

      case "CATEGORY_DELETED": {
        const payload = event.payload as any;
        this.categories = this.categories.filter((c) => c.id !== payload.id);
        break;
      }

      case "PRODUCT_ADDED": {
        const payload = event.payload as any;
        const index = this.products.findIndex((p) => p.sku === payload.sku);
        if (index >= 0) {
          this.products[index] = {
            sku: payload.sku,
            name: payload.name.toUpperCase(),
            price: Number(payload.price) || 0,
            categoryId: payload.categoryId,
            isActive: true,
            isArchived: false,
          };
        } else {
          this.products.push({
            sku: payload.sku,
            name: payload.name.toUpperCase(),
            price: Number(payload.price) || 0,
            categoryId: payload.categoryId,
            isActive: true,
            isArchived: false,
          });
        }
        break;
      }

      case "PRODUCT_EDITED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku
            ? {
                ...p,
                name: payload.name.toUpperCase(),
                price: Number(payload.price) || 0,
                categoryId: payload.categoryId,
              }
            : p,
        );
        break;
      }

      case "PRODUCT_TOGGLED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku ? { ...p, isActive: payload.isActive } : p,
        );
        break;
      }

      case "PRODUCT_ARCHIVED":
      case "PRODUCT_DELETED": {
        const payload = event.payload as any;
        this.products = this.products.map((p) =>
          p.sku === payload.sku
            ? { ...p, isArchived: true, isActive: false }
            : p,
        );
        break;
      }

      case "STAFF_UPDATED": {
        const payload = event.payload as any;
        const exists = this.staffList.some((s) => s.id === payload.id);
        if (exists) {
          this.staffList = this.staffList.map((s) =>
            s.id === payload.id
              ? {
                  ...s,
                  name: payload.name.toUpperCase(),
                  role: payload.role,
                  pin: payload.pin,
                  isActive: payload.isActive,
                }
              : s,
          );
        } else {
          this.staffList.push({
            id: payload.id,
            name: payload.name.toUpperCase(),
            role: payload.role,
            pin: payload.pin,
            isActive: payload.isActive,
          });
        }
        break;
      }

      case "STAFF_TOGGLED": {
        const payload = event.payload as any;
        this.staffList = this.staffList.map((s) =>
          s.id === payload.id ? { ...s, isActive: payload.isActive } : s,
        );
        break;
      }

      case "SHIFT_OPENED": {
        const payload = event.payload as any;
        if (payload.cashierId || payload.operator_id) {
          const found = this.staffList.find(
            (s) => s.id === (payload.cashierId || payload.operator_id),
          );
          if (found) {
            this.activeOperator = found;
          }
        }
        this.shiftInitialCash = payload.startingCash || payload.initial_cash || 0;
        this.transactions = [];
        this.auditLogs = [];
        this.pettyCashTransactions = [];
        break;
      }

      case "SHIFT_CLOSED": {
        this.activeOperator = null;
        break;
      }

      case "STOCK_ADJUSTED": {
        const payload = event.payload as any;
        this.updateStock(payload.sku, payload.delta, event.hlc);
        break;
      }

      case "SETTINGS_UPDATED": {
        this.settings = { ...this.settings, ...(event.payload as any) };
        break;
      }

      case "PAYMENT_RECEIVED":
      case "ORDER_CREATED":
      case "INVOICE_CREATED":
      case "SALE_CREATED": {
        this.transactions.push({ ...event.payload as any, status: event.type === 'PAYMENT_RECEIVED' || event.type === 'SALE_CREATED' ? 'PAID' : 'PENDING' });
        break;
      }

      case "PETTY_CASH_ISSUED": {
        this.pettyCashTransactions.push(event.payload as any);
        break;
      }

      case "PETTY_CASH_RESOLVED": {
        const payload = event.payload as any;
        const index = this.pettyCashTransactions.findIndex((p: any) => p.petty_cash_id === payload.petty_cash_id);
        if (index >= 0) {
          this.pettyCashTransactions[index] = { ...this.pettyCashTransactions[index], status: "COMPLETED", ...payload };
        }
        break;
      }

      default:
        break;
    }

    // Invalidate cached reports to force recalculation on next read
    this.reportData = null;
    this.reconData = null;
    this.cashData = null;
  }

  private updateStock(sku: string, delta: number, hlc: string) {
    if (!this.inventory[sku]) {
      this.inventory[sku] = { stock: 0, last_updated: hlc };
    }
    this.inventory[sku].stock += delta;
    this.inventory[sku].last_updated = hlc;
  }

  private hardResetState() {
    this.isInitialized = false;
    this.companyName = "";
    this.branchId = "";
    this.regionName = "";
    this.latitude = 0;
    this.longitude = 0;
    this.staffList = [];
    this.tables = [];
    this.categories = [];
    this.products = [];
    this.inventory = {};
    this.auditLogs = [];
    this.sales = {
      total_revenue: 0,
      total_transactions: 0,
      total_refunds: 0,
      last_invoice: null,
    };
    this.activeOperator = null;
    this.lastProcessedSeq = 0;
  }

  public async runProjection(events: LedgerEvent[]) {
    if (events.length === 0) return this.getState();

    if (events[events.length - 1].seq < this.lastProcessedSeq) {
      this.hardResetState();
    }

    for (const event of events) {
      if (event.seq > this.lastProcessedSeq) {
        this.handleEvent(event);
        this.lastProcessedSeq = event.seq;
      }
    }

    return this.getState();
  }

  public getInitialState() {
    return {
      isInitialized: false,
      companyName: "",
      branchId: "",
      regionName: "",
      latitude: 0,
      longitude: 0,
      staffList: [],
      tables: [],
      categories: [],
      products: [],
      inventory: {},
      auditLogs: [],
      sales: {
        total_revenue: 0,
        total_transactions: 0,
        total_refunds: 0,
        last_invoice: null,
      },
      activeOperator: null,
      settings: {},
      report: {
        totalTrx: 0,
        initialCash: 0,
        cashSales: 0,
        systemCash: 0,
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        totalService: 0,
        catSales: {},
        paymentSales: {},
        pettyCashOut: 0,
        totalVoid: 0,
        totalRefund: 0,
        staffList: [],
        pluData: [],
      },
      recon: {
        systemCash: 0,
        activeTables: 0,
        voidRefundCount: 0,
      },
      cash: {
        currentCash: 0,
        openingCash: 0,
        pettyCash: 0,
        cashIn: 0,
        cashOut: 0,
        closingCash: 0,
      },
    };
  }

  public getState() {
    // 1. COMPUTED PROJECTIONS (REPORT, RECON, CASH)
    if (!this.reportData || !this.reconData || !this.cashData) {
      const completedTransactions = this.transactions.filter((tx: any) => tx.status === "PAID" || tx.status === "COMPLETED" || !tx.status || tx.status !== "PENDING");

      let cashSales = 0;
      let totalGross = 0;
      let totalNet = 0;
      let totalTax = 0;
      let totalService = 0;
      const catSales: Record<string, { qty: number; total: number }> = {};
      const paymentSales: Record<string, number> = {};
      const staffSet = new Set<string>();

      completedTransactions.forEach((tx: any) => {
      totalNet += tx.subtotal || 0;
      totalTax += tx.tax_amount || tx.taxAmount || 0;
      totalService += tx.service_amount || tx.serviceAmount || 0;
      totalGross += tx.grand_total || tx.grandTotal || tx.amountPaid || 0;

      if (tx.cashierName) staffSet.add(tx.cashierName);
      if (tx.waiterName) staffSet.add(tx.waiterName);

      const method = (tx.payment_method || tx.method || "CASH").toUpperCase();
      paymentSales[method] = (paymentSales[method] || 0) + (tx.grand_total || tx.amountPaid || 0);

      if (method === "CASH" || method === "TUNAI") {
        cashSales += tx.grand_total || tx.amountPaid || 0;
      }

      (tx.items || []).forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          const catName = item.category_name || "UNCATEGORIZED";
          if (!catSales[catName]) catSales[catName] = { qty: 0, total: 0 };
          catSales[catName].qty += activeQty;
          catSales[catName].total += (item.price || item.basePriceSnapshot || 0) * activeQty;
        }
      });
    });

    let pettyCashOut = 0;
    this.pettyCashTransactions.forEach((pc: any) => {
      pettyCashOut += pc.amount_requested;
      if (pc.status === "COMPLETED") pettyCashOut -= pc.amount_returned || 0;
      if (pc.cashier_issued_name) staffSet.add(pc.cashier_issued_name);
    });

    let totalVoid = 0;
    let totalRefund = 0;
    this.auditLogs.forEach((a: any) => {
      if (a.eventType === "ORDER_VOIDED") totalVoid += a.totalAmount || 0;
      if (a.eventType === "PAYMENT_REFUNDED" || a.eventType === "ORDER_REFUNDED") totalRefund += a.totalAmount || 0;
    });

    const systemCash = this.shiftInitialCash + cashSales - pettyCashOut - totalRefund;

    const pluMap: Record<string, { qty: number; total: number }> = {};
    completedTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        const activeQty = item.qty - (item.refundedQty || 0);
        if (activeQty > 0) {
          const itemName = item.name || item.nameSnapshot || "UNKNOWN";
          if (!pluMap[itemName]) pluMap[itemName] = { qty: 0, total: 0 };
          pluMap[itemName].qty += activeQty;
          pluMap[itemName].total += (item.price || item.basePriceSnapshot || 0) * activeQty;
        }
      });
    });

    const pluData = Object.entries(pluMap).sort((a, b) => b[1].qty - a[1].qty);

    const activeTables = this.tables.filter((t: any) => (t.savedItems && t.savedItems.length > 0) || t.currentBill > 0).length;

    const report = {
      totalTrx: completedTransactions.length,
      initialCash: this.shiftInitialCash,
      cashSales,
      systemCash,
      totalGross,
      totalNet,
      totalTax,
      totalService,
      catSales,
      paymentSales,
      pettyCashOut,
      totalVoid,
      totalRefund,
      staffList: Array.from(staffSet),
      pluData,
    };

    const recon = {
      systemCash,
      activeTables,
      voidRefundCount: this.auditLogs.filter(log => log.eventType === "ORDER_VOIDED" || log.eventType === "ORDER_CANCELLED" || log.eventType === "PAYMENT_REFUNDED" || log.eventType === "ORDER_REFUNDED").length,
    };

      const cash = {
        currentCash: systemCash,
        openingCash: this.shiftInitialCash,
        pettyCash: pettyCashOut,
        cashIn: cashSales,
        cashOut: pettyCashOut + totalRefund,
        closingCash: systemCash,
        pettyCashTransactions: [...this.pettyCashTransactions],
      };

      this.reportData = report;
      this.reconData = recon;
      this.cashData = cash;
    }

    return {
      isInitialized: this.isInitialized,
      companyName: this.companyName,
      branchId: this.branchId,
      regionName: this.regionName,
      latitude: this.latitude,
      longitude: this.longitude,
      staffList: [...this.staffList],
      tables: [...this.tables],
      categories: [...this.categories],
      products: [...this.products],
      inventory: { ...this.inventory },
      auditLogs: [...this.auditLogs],
      sales: { ...this.sales },
      activeOperator: this.activeOperator ? { ...this.activeOperator } : null,
      settings: { ...this.settings },
      report: this.reportData,
      recon: this.reconData,
      cash: this.cashData,
    };
  }
}
