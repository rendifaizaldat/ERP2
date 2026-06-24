import { LedgerEvent } from "../../ledger/src/engine";
import { InventoryState, SalesState, OrderItem } from "./types";

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

      default:
        break;
    }
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
    };
  }

  public getState() {
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
    };
  }
}
