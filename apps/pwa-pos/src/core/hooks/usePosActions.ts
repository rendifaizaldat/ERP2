import { ledger, eventBus, errorBus } from "../instances";
import { backgroundSync } from "../BackgroundSync";

const generateId = () =>
  "ID-" +
  Date.now().toString(36) +
  Math.random().toString(36).substring(2, 8).toUpperCase();

const sanitizeId = (id: any) => (!id || id === "UNKNOWN" ? generateId() : id);

export const usePosActions = (syncData: any) => {
  const {
    currentOperator,
    isScreenLocked,
    viewState,
    state,
    getCombinedStaff,
    setIsScreenLocked,
    setViewStateDirect,
    setCurrentOperator,
  } = syncData;

  const updateSettings = async (settingsPayload: any) => {
    try {
      await ledger.appendEvent("SETTINGS_UPDATED", {
        ...settingsPayload,
        operator_id: currentOperator?.id || "SYS",
        timestamp: Date.now(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menyimpan pengaturan: ${err.message}`);
      throw err;
    }
  };

  const getActiveTaxSettings = () => {
    const taxConf = state?.settings?.pajak || {
      ppn: 11,
      serviceCharge: 5,
      taxIncluded: true,
    };
    return {
      ppn: Number(taxConf.ppn) || 0,
      serviceCharge: Number(taxConf.serviceCharge) || 0,
      taxIncluded: Boolean(taxConf.taxIncluded),
    };
  };

  const initializeSystem = async (data: any) => {
    await ledger.appendEvent("SYSTEM_INITIALIZED", data);
    eventBus.next();
  };

  const registerStaff = async (data: any) => {
    try {
      await ledger.appendEvent("MEMBER_REGISTERED", {
        member_id: `STF-${Date.now()}`,
        name: data.name,
        tier: "LEGENDARY",
        phone: `${data.role}:${data.pin}`,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mendaftar staf: ${err.message}`);
    }
  };

  const editStaff = async (id: string, data: any) => {
    try {
      await ledger.appendEvent("STAFF_UPDATED", { id, ...data });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal update staf: ${err.message}`);
    }
  };

  const toggleStaffStatus = async (id: string, isActive: boolean) => {
    try {
      await ledger.appendEvent("STAFF_TOGGLED", { id, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal toggle status staf: ${err.message}`);
    }
  };

  const addMasterTable = async (data: any) => {
    try {
      await ledger.appendEvent("TABLE_ADDED", {
        id: `MEJA-ID-${data.label.trim().toUpperCase()}`,
        label: data.label.trim().toUpperCase(),
        type: data.type,
        capacity: Number(data.capacity) || 4,
        created_by: data.created_by || "USER",
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menambah meja: ${err.message}`);
    }
  };

  const deleteMasterTable = async (id: string, label: string) => {
    try {
      await ledger.appendEvent("TABLE_DELETED", { id, label });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menghapus meja: ${err.message}`);
    }
  };

  const toggleMasterTableStatus = async (
    tableId: string,
    isActive: boolean,
  ) => {
    try {
      await ledger.appendEvent("TABLE_TOGGLED", { id: tableId, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengubah status meja: ${err.message}`);
    }
  };

  const addMasterCategory = async (name: string) => {
    try {
      const newId = `CAT-${Date.now()}`;
      await ledger.appendEvent("CATEGORY_ADDED", {
        id: newId,
        name: name.trim().toUpperCase(),
      });
      eventBus.next();
      return newId;
    } catch (err: any) {
      errorBus.next(`Gagal menambah kategori: ${err.message}`);
    }
  };

  const deleteMasterCategory = async (id: string) => {
    try {
      const hasProducts = state?.products?.some(
        (p: any) => p.categoryId === id && !p.isArchived,
      );
      if (hasProducts) {
        errorBus.next("GAGAL: Kategori masih digunakan!");
        return;
      }
      await ledger.appendEvent("CATEGORY_DELETED", { id });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menghapus kategori: ${err.message}`);
    }
  };

  const addMasterProduct = async (data: any) => {
    try {
      await ledger.appendEvent("PRODUCT_ADDED", {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim().toUpperCase(),
        price: Number(data.price) || 0,
        categoryId: data.categoryId,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menambah produk: ${err.message}`);
    }
  };

  const editMasterProduct = async (data: any) => {
    try {
      await ledger.appendEvent("PRODUCT_EDITED", {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim().toUpperCase(),
        price: Number(data.price) || 0,
        categoryId: data.categoryId,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengedit produk: ${err.message}`);
    }
  };

  const toggleProductStatus = async (sku: string, isActive: boolean) => {
    try {
      await ledger.appendEvent("PRODUCT_TOGGLED", { sku, isActive });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengubah status produk: ${err.message}`);
    }
  };

  const deleteMasterProduct = async (sku: string) => {
    try {
      await ledger.appendEvent("PRODUCT_ARCHIVED", { sku });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mengarsipkan produk: ${err.message}`);
    }
  };

  const validatePinOnly = async (pin: string) => {
    if (isScreenLocked && currentOperator) {
      const isOwnerPin = currentOperator.pin === pin;
      const combinedStaff = getCombinedStaff();
      const managerOverride = !isOwnerPin
        ? combinedStaff.find(
            (s: any) =>
              s.pin === pin &&
              s.isActive !== false &&
              (s.role?.toUpperCase() === "MANAGER" ||
                s.role?.toUpperCase() === "SUPERADMIN"),
          )
        : null;

      if (isOwnerPin || managerOverride) {
        setIsScreenLocked(false);
        const targetTable = state?.tables?.find(
          (t: any) => t.label === viewState.selectedTable,
        );
        const hasActiveBill =
          targetTable &&
          (targetTable.currentBill > 0 ||
            (targetTable.savedItems && targetTable.savedItems.length > 0));

        if (viewState.selectedTable && hasActiveBill) {
          setViewStateDirect({
            activeTab: "MENU",
            viewMode: "MENU",
            selectedTable: viewState.selectedTable,
          });
        } else {
          setViewStateDirect({
            activeTab: "DINE_IN",
            viewMode: "TABLES",
            selectedTable: null,
          });
        }
        return {
          valid: true,
          staff: isOwnerPin ? currentOperator : managerOverride,
          screenUnlocked: true,
        };
      }
      return {
        valid: false,
        message: `LAYAR INI MILIK KASIR ${currentOperator.name}. USER LAIN DILARANG MASUK!`,
      };
    }
    if (state?.activeOperator)
      return {
        valid: false,
        message: `KASIR ${state.activeOperator.name} MASIH AKTIF MEMEGANG SHIFT!`,
      };

    const combinedStaff = getCombinedStaff();
    const targetStaff = combinedStaff.find(
      (s: any) => s.pin === pin && s.isActive !== false,
    );

    if (targetStaff) return { valid: true, staff: targetStaff };
    return {
      valid: false,
      message: "PIN SALAH ATAU AKUN NONAKTIF. OTORISASI DITOLAK.",
    };
  };

  const openShiftWithModal = async (pin: string, initialCash: number) => {
    try {
      const combinedStaff = getCombinedStaff();
      const targetStaff = combinedStaff.find(
        (s: any) => s.pin === pin && s.isActive !== false,
      );
      if (targetStaff) {
        const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}`;
        const branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";
        const deviceId =
          localStorage.getItem("ASSTRO_DEVICE_TOKEN") ||
          (state as any)?.settings?.sistem?.deviceId ||
          "UNKNOWN-DEVICE";

        let businessDate = localStorage.getItem("ASSTRO_BUSINESS_DATE");
        if (!businessDate) {
          const now = new Date();
          const ref =
            now.getHours() < 3
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
              : now;
          businessDate = ref.toISOString().slice(0, 10);
          localStorage.setItem("ASSTRO_BUSINESS_DATE", businessDate);
        }

        localStorage.setItem("ASSTRO_CURRENT_SHIFT_ID", shiftId);

        await ledger.appendEvent("SHIFT_OPENED", {
          operator_id: targetStaff.id,
          initial_cash: initialCash,
          shiftId,
          branchId,
          deviceId,
          cashierId: targetStaff.id,
          openedAt: new Date().toISOString(),
          startingCash: initialCash,
          businessDate,
        });
        setCurrentOperator(targetStaff);
        setIsScreenLocked(false);
        setViewStateDirect({
          activeTab: "DINE_IN",
          viewMode: "TABLES",
          selectedTable: null,
        });
        eventBus.next();
      }
    } catch (err: any) {
      errorBus.next(`Gagal membuka shift: ${err.message}`);
    }
  };

  const logoutWithReconciliation = async (
    actualCash: number,
    systemCash: number,
    difference: number,
    differenceReason: string,
  ) => {
    try {
      const shiftId =
        localStorage.getItem("ASSTRO_CURRENT_SHIFT_ID") ||
        `SHIFT-UNTRACKED-${Date.now().toString(36).toUpperCase()}`;

      await ledger.appendEvent("SHIFT_CLOSED", {
        actual_cash: actualCash,
        system_cash: systemCash,
        shiftId,
        closedAt: new Date().toISOString(),
        expectedEndingCash: systemCash,
        actualEndingCash: actualCash,
        difference,
        differenceReason,
      });
      setCurrentOperator(null);
      setIsScreenLocked(true);
      setViewStateDirect({
        activeTab: "DINE_IN",
        viewMode: "TABLES",
        selectedTable: null,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menutup shift: ${err.message}`);
    }
  };

  const executeEndOfDay = async (
    actualCash: number,
    expectedCash: number,
    cashDiff: number,
    actualNonCash: number,
    expectedNonCash: number,
    nonCashDiff: number,
    differenceReason: string,
  ) => {
    try {
      const shiftId =
        localStorage.getItem("ASSTRO_CURRENT_SHIFT_ID") ||
        `SHIFT-UNTRACKED-${Date.now().toString(36).toUpperCase()}`;

      await ledger.appendEvent("SHIFT_CLOSED", {
        shiftId,
        closedAt: new Date().toISOString(),
        expectedEndingCash: expectedCash,
        actualEndingCash: actualCash,
        difference: cashDiff,
        expectedNonCash,
        actualNonCash,
        nonCashDifference: nonCashDiff,
        differenceReason,
      });

      await ledger.appendEvent("END_OF_DAY_PROCESSED", {
        actual_cash: actualCash,
        system_cash: expectedCash,
        difference: cashDiff,
        reason: differenceReason,
        operator_id: currentOperator?.id || "SYS",
        timestamp: Date.now(),
      });

      await ledger.appendEvent("LOCAL_DATA_PURGED", {
        timestamp: Date.now(),
        note: "Self-cleaning executed at End of Day",
      });

      setCurrentOperator(null);
      setIsScreenLocked(true);
      setViewStateDirect({
        activeTab: "DINE_IN",
        viewMode: "TABLES",
        selectedTable: null,
      });
      eventBus.next();

      await backgroundSync.forceTrigger();
      localStorage.removeItem("ASSTRO_BUSINESS_DATE");
      localStorage.removeItem("ASSTRO_CURRENT_SHIFT_ID");
      sessionStorage.clear();
      window.location.reload();
    } catch (err: any) {
      errorBus.next(`Gagal memproses End of Day: ${err.message}`);
      throw err;
    }
  };

  // =========================================================================
  // ARSITEKTUR 3 LAPIS: ORDER & TRANSAKSI
  // =========================================================================

  const placeTableOrder = async (
    tableLabel: string,
    grandTotal: number,
    items: any[] = [],
    isVirtual: boolean = false,
    parentTableId?: string,
    customerName?: string | null,
  ) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      let orderId = "";

      if (typeof window !== "undefined") {
        orderId = sessionStorage.getItem(`asstro_order_id_${labelUpper}`) || "";
      }

      if (!orderId) {
        orderId = generateId();
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`asstro_order_id_${labelUpper}`, orderId);
        }
      }

      // [FIX] Strategi Fallback Cerdas: Ambil dari parameter, jika kosong cek sessionStorage
      let finalCustomerName = customerName || null;
      if (!finalCustomerName && typeof window !== "undefined") {
        finalCustomerName =
          sessionStorage.getItem(`asstro_tamu_meja_${labelUpper}`) || null;
      }

      const businessDate =
        localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
        new Date().toISOString().slice(0, 10);

      await ledger.appendEvent("ORDER_CREATED", {
        orderId,
        tableLabel: labelUpper,
        customerName: finalCustomerName, // [FIX] Tidak lagi bernilai hardcoded null
        guestCount: 1,
        operatorId: currentOperator?.id || "SYS",
        businessDate,
        items: items.map((i) => ({
          id: sanitizeId(i.id),
          productId: i.productId || i.product_id || "UNKNOWN",
          skuSnapshot: i.skuSnapshot || i.sku,
          nameSnapshot: i.nameSnapshot || i.name,
          basePriceSnapshot: i.basePriceSnapshot || i.price,
          qty: i.qty,
          status: i.status || "PENDING",
          notes: i.notes || i.note || null,
        })),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menyimpan pesanan meja: ${err.message}`);
    }
  };

  const executeSale = async (enterprisePayload: any) => {
    try {
      const taxConfig = getActiveTaxSettings();
      const skipOrderLayer =
        enterprisePayload.identity?.skip_order_layer || false;
      let orderId = enterprisePayload.identity?.existing_order_id;
      let isForcedDirectSale = false;

      if (!orderId) {
        orderId = generateId();
        isForcedDirectSale = true;
      }

      const invoiceId = generateId();
      const paymentId = generateId();
      const rawMethod =
        enterprisePayload.payment?.payment_method?.toUpperCase() || "CASH";
      const isComplimentary = rawMethod === "PRIVE";
      const businessDate =
        localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
        new Date().toISOString().slice(0, 10);

      // LAYER 1: ORDER
      if (!skipOrderLayer || isForcedDirectSale) {
        await ledger.appendEvent("ORDER_CREATED", {
          orderId,
          tableLabel: enterprisePayload.table_info?.table_name || "TAKEAWAY",
          customerName: enterprisePayload.customer?.customer_name || null,
          guestCount: 1,
          operatorId: currentOperator?.id || "SYS",
          businessDate,
          items: enterprisePayload.items.map((i: any) => ({
            id: generateId(), // [PATCH FATAL] DIRECT SALE WAJIB ID BARU
            productId: i.productId || i.product_id || "UNKNOWN",
            skuSnapshot: i.skuSnapshot || i.sku,
            nameSnapshot: i.nameSnapshot || i.product_name,
            basePriceSnapshot: i.basePriceSnapshot || i.selling_price,
            qty: i.qty,
            notes: null,
          })),
        });
      }

      // LAYER 2: INVOICE
      const finalInvoiceNumber =
        enterprisePayload.identity?.invoice_number || `INV-${Date.now()}`;
      await ledger.appendEvent("INVOICE_CREATED", {
        invoiceId,
        orderId,
        invoiceNumber: finalInvoiceNumber,
        operatorId: currentOperator?.id || "SYS",
        businessDate,
        subtotal: enterprisePayload.summary.subtotal,
        taxRate: taxConfig.ppn,
        taxAmount: enterprisePayload.summary.total_tax,
        serviceRate: taxConfig.serviceCharge,
        serviceAmount: enterprisePayload.summary.total_service,
        discountAmount: enterprisePayload.summary.total_discount,
        grandTotal: enterprisePayload.summary.grand_total,
        status:
          enterprisePayload.identity?.transaction_status === "OPEN"
            ? "unpaid"
            : isComplimentary
              ? "complimentary"
              : "paid",
      });

      // LAYER 3: PAYMENT
      if (!isComplimentary && enterprisePayload.payment?.amount_paid > 0) {
        let finalMethod = rawMethod;
        const validMethods = [
          "CASH",
          "CARD",
          "QRIS",
          "EWALLET",
          "BANK_TRANSFER",
        ];
        if (finalMethod === "DEBIT") finalMethod = "CARD";
        if (!validMethods.includes(finalMethod)) finalMethod = "CASH";

        const edcMeta = enterprisePayload.payment?.edc_metadata || {};

        await ledger.appendEvent("PAYMENT_RECEIVED", {
          paymentId,
          invoiceId,
          operatorId: currentOperator?.id || "SYS",
          method: finalMethod,
          captureMode: enterprisePayload.payment?.capture_mode || "MANUAL",
          provider: enterprisePayload.payment?.payment_provider || null,
          amountPaid: enterprisePayload.payment.amount_paid,
          changeAmount: enterprisePayload.payment.change_amount || 0,
          referenceNumber: enterprisePayload.payment.payment_reference || null,
          approvalCode: edcMeta.approval_code || null,
          traceNumber: edcMeta.trace_number || null,
        });
      }

      eventBus.next();

      const printerConfig = state?.settings?.printer || {
        autoPrint: true,
        copy: 1,
      };
      if (printerConfig.autoPrint) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("TRIGGER_THERMAL_PRINT", {
              detail: {
                invoiceNumber: finalInvoiceNumber,
                payload: enterprisePayload,
                settings: state?.settings,
              },
            }),
          );
        }
      }
    } catch (err: any) {
      errorBus.next(`Gagal mengeksekusi penjualan: ${err.message}`);
    }
  };

  const processTablePayment = async (tableLabel: string) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      await ledger.appendEvent("TABLE_PAYMENT_PROCESSED", {
        id: `MEJA-ID-${labelUpper}`,
        tableLabel: labelUpper,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal memproses pembayaran meja: ${err.message}`);
    }
  };

  const clearTableStatus = async (tableLabel: string) => {
    try {
      const labelUpper = tableLabel.trim().toUpperCase();
      await ledger.appendEvent("TABLE_CLEARED", {
        id: `MEJA-ID-${labelUpper}`,
        tableLabel: labelUpper,
        isVirtual: labelUpper.includes("-"),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(err.message);
    }
  };

  // =========================================================================
  // ARSITEKTUR 3 LAPIS: UPDATE, VOID & SPLIT BILL
  // =========================================================================

  const updateOrderItems = async (
    orderId: string,
    tableLabel: string,
    items: any[],
    customerName?: string | null,
  ) => {
    const businessDate =
      localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
      new Date().toISOString().slice(0, 10);

    await ledger.appendEvent("ORDER_UPDATED", {
      orderId,
      tableLabel: tableLabel.trim().toUpperCase(),
      customerName: customerName || null,
      guestCount: 1,
      operatorId: currentOperator?.id || "SYS",
      businessDate,
      items: items.map((item: any) => ({
        // [FIX] Gunakan sanitizeId untuk melindungi ID dari bug "UNKNOWN"
        id: sanitizeId(item.id),
        productId: item.productId || item.product_id || "UNKNOWN",
        skuSnapshot: item.skuSnapshot || item.sku || "",
        nameSnapshot: item.nameSnapshot || item.name || "",
        basePriceSnapshot: item.basePriceSnapshot || item.price || 0,
        qty: item.qty,
        voidedQty: item.voidedQty || 0,
        refundedQty: item.refundedQty || 0,
        status: item.status || "PENDING",
        voidReason: item.voidReason || null,
        notes: item.notes || item.note || null,
      })),
    });
    eventBus.next();
  };

  // [PATCH VOID] Menggunakan targetItemId (bukan SKU) untuk akurasi presisi tinggi
  const voidTableOrder = async (
    tableLabel: string,
    targetItemId: string, // Bisa berupa ID Spesifik, atau "ALL"
    qtyToVoid: number, // Akan diabaikan jika targetItemId === "ALL"
    voidType: "SALAH_INPUT" | "BARANG_KOSONG" | "CANCEL",
    managerPin?: string,
    voidNote?: string,
  ) => {
    try {
      let manager_id = undefined;
      if (voidType === "CANCEL" && managerPin) {
        const combinedStaff = getCombinedStaff();
        const manager = combinedStaff.find(
          (s: any) =>
            s.pin === managerPin &&
            s.isActive !== false &&
            ["ADMIN", "SUPERADMIN", "MANAGER"].includes(s.role?.toUpperCase()),
        );
        if (!manager) throw new Error("PIN Manager Salah atau Bukan Admin!");
        manager_id = manager.id;
      }

      const labelUpper = tableLabel.trim().toUpperCase();
      const currentTable = state?.tables?.find(
        (t: any) => t.label === labelUpper,
      );

      // [FIX 1] Ambil nama customer lokal agar tidak tertimpa menjadi NULL
      let customerNameLocal = null;
      if (typeof window !== "undefined") {
        customerNameLocal =
          sessionStorage.getItem(`asstro_tamu_meja_${labelUpper}`) || null;
      }

      if (currentTable?.activeOrderId && currentTable?.savedItems?.length > 0) {
        let isAllVoided = true; // Asumsi awal semua ter-void, akan dibatalkan jika ada yang sisa

        const updatedItems = (currentTable.savedItems as any[]).map(
          (item: any) => {
            let newVoidQty = item.voidedQty || 0;

            // Jika KASIR memilih "Batalkan Seluruh Pesanan Meja"
            if (targetItemId === "ALL") {
              const activeQty =
                item.qty - (item.voidedQty || 0) - (item.refundedQty || 0);
              newVoidQty = (item.voidedQty || 0) + Math.max(0, activeQty);
            }
            // Jika KASIR hanya memilih SATU item spesifik
            else if (
              item.id === targetItemId ||
              (!item.id && (item.skuSnapshot || item.sku) === targetItemId)
            ) {
              newVoidQty = Math.min(
                item.qty,
                (item.voidedQty || 0) + qtyToVoid,
              );
            }

            // Validasi Sisa Produk
            const remaining = item.qty - newVoidQty - (item.refundedQty || 0);
            if (remaining > 0) {
              isAllVoided = false; // Ternyata masih ada makanan/minuman yang aktif
            }

            return {
              ...item,
              voidedQty: newVoidQty,
              voidReason:
                newVoidQty > (item.voidedQty || 0) ? voidType : item.voidReason,
            };
          },
        );

        // 1. Update status Item secara massal (Nama tidak akan hilang karena disisipkan)
        await updateOrderItems(
          currentTable.activeOrderId,
          labelUpper,
          updatedItems,
          customerNameLocal,
        );

        // [FIX 2] Jika SEMUA item dalam meja tersebut habis ter-void
        if (isAllVoided) {
          // A. Tembak event untuk mengubah status DB 'orders' menjadi 'cancelled'
          await ledger.appendEvent("ORDER_CANCELLED", {
            orderId: currentTable.activeOrderId,
            tableLabel: labelUpper,
            reason: voidType,
            operatorId: currentOperator?.id || "UNKNOWN",
            managerId: manager_id,
            voidNote: voidNote,
            timestamp: Date.now(),
          });

          // B. Hancurkan status meja di PWA Kasir
          await clearTableStatus(labelUpper);

          // C. Bersihkan memori Storage secara paksa
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(`asstro_tamu_meja_${labelUpper}`);
            sessionStorage.removeItem(`asstro_order_id_${labelUpper}`);
            sessionStorage.removeItem(`asstro_jam_order_${labelUpper}`);
          }
        }
      } else {
        // Fallback untuk transaksi lama (Legacy)
        await ledger.appendEvent("ORDER_VOIDED", {
          tableLabel,
          sku: targetItemId,
          qtyToVoid,
          voidType,
          operator_id: currentOperator?.id || "UNKNOWN",
          manager_id,
          voidNote,
          timestamp: Date.now(),
        });
        eventBus.next();
      }
    } catch (err: any) {
      errorBus.next(`Gagal void pesanan: ${err.message}`);
      throw err;
    }
  };

  const executePaymentRefund = async (
    invoiceId: string,
    items: Array<{
      productId: string;
      sku: string;
      qtyRefunded: number;
      amountRefunded: number;
    }>,
    refundMethod: "CASH" | "CARD" | "QRIS" | "EWALLET" | "BANK_TRANSFER",
    totalRefundAmount: number,
    reason: string,
    managerPin: string,
    refundType?: "CANCEL" | "SOLD_OUT",
  ) => {
    try {
      const combinedStaff = getCombinedStaff();
      const manager = combinedStaff.find(
        (s: any) =>
          s.pin === managerPin &&
          s.isActive !== false &&
          ["ADMIN", "SUPERADMIN", "MANAGER"].includes(s.role?.toUpperCase()),
      );
      if (!manager)
        throw new Error("PIN Otorisasi Refund Salah atau Bukan Admin!");

      const refundId = generateId();

      // 1. Eksekusi Pencatatan Arus Keuangan (Untuk sales.worker)
      await ledger.appendEvent("PAYMENT_REFUNDED", {
        refundId,
        invoiceId,
        operatorId: currentOperator?.id || "UNKNOWN",
        items,
        refundMethod,
        totalRefundAmount,
        reason: `${refundType === "SOLD_OUT" ? "[SOLD OUT] " : ""}${reason}`,
      });

      // [+] 2. Eksekusi Pencatatan Jurnal Operasional (Memenuhi Request Audit Anda)
      await ledger.appendEvent("ORDER_REFUNDED", {
        refundId,
        invoiceId,
        operatorId: currentOperator?.id || "UNKNOWN",
        items,
        reason: `${refundType === "SOLD_OUT" ? "[SOLD OUT] " : ""}${reason}`,
      });

      // 3. Eksekusi Otomatis Matikan Produk di Katalog jika Sold Out
      if (refundType === "SOLD_OUT") {
        for (const itm of items) {
          if (itm.sku) {
            await ledger.appendEvent("PRODUCT_TOGGLED", {
              sku: itm.sku,
              isActive: false,
            });
          }
        }
      }

      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal memproses refund: ${err.message}`);
      throw err;
    }
  };

  const moveTableOrderV2 = async (
    sourceTableLabel: string,
    targetTableLabel: string,
    orderId: string,
    items: any[],
    customerName?: string | null,
  ) => {
    try {
      const businessDate =
        localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
        new Date().toISOString().slice(0, 10);

      await ledger.appendEvent("ORDER_UPDATED", {
        orderId,
        tableLabel: targetTableLabel.trim().toUpperCase(), // <--- Kuncinya di sini, tembak label baru
        customerName: customerName || null,
        guestCount: 1,
        operatorId: currentOperator?.id || "SYS",
        businessDate,
        items: items.map((item: any) => ({
          id: sanitizeId(item.id),
          productId: item.productId || item.product_id || "UNKNOWN",
          skuSnapshot: item.skuSnapshot || item.sku || "",
          nameSnapshot: item.nameSnapshot || item.name || "",
          basePriceSnapshot: item.basePriceSnapshot || item.price || 0,
          qty: item.qty,
          voidedQty: item.voidedQty || 0,
          refundedQty: item.refundedQty || 0,
          status: item.status || "PENDING",
          voidReason: item.voidReason || null,
          notes: item.notes || item.note || null,
        })),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal pindah meja: ${err.message}`);
      throw err;
    }
  };

  // [FITUR BARU] Transfer Item ke Meja Lain secara Atomic (Bebas Bug Sync)
  const executeTransferToExistingTable = async (
    sourceOrderId: string,
    sourceTableLabel: string,
    remainingSourceItems: any[],
    targetOrderId: string | null,
    targetTableLabel: string,
    targetCustomerName: string | null,
    finalTargetItems: any[],
  ) => {
    try {
      const businessDate =
        localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
        new Date().toISOString().slice(0, 10);
      const labelUpperSource = sourceTableLabel.trim().toUpperCase();
      const labelUpperTarget = targetTableLabel.trim().toUpperCase();

      let sourceCustomerName = null;
      if (typeof window !== "undefined") {
        sourceCustomerName =
          sessionStorage.getItem(`asstro_tamu_meja_${labelUpperSource}`) ||
          null;
      }

      // FIX MEJA GANTUNG: Hancurkan otomatis meja asal jika stoknya sudah habis ditarik
      if (remainingSourceItems.length === 0) {
        await ledger.appendEvent("TABLE_CLEARED", {
          id: `MEJA-ID-${labelUpperSource}`,
          tableLabel: labelUpperSource,
          isVirtual: labelUpperSource.includes("-"),
        });
      } else {
        await ledger.appendEvent("ORDER_UPDATED", {
          orderId: sourceOrderId,
          tableLabel: labelUpperSource,
          customerName: sourceCustomerName,
          guestCount: 1,
          operatorId: currentOperator?.id || "SYS",
          businessDate,
          items: remainingSourceItems.map((item: any) => ({
            id: sanitizeId(item.id),
            productId: item.productId || item.product_id || "UNKNOWN",
            skuSnapshot: item.skuSnapshot || item.sku || "",
            nameSnapshot: item.nameSnapshot || item.name || "",
            basePriceSnapshot: item.basePriceSnapshot || item.price || 0,
            qty: item.qty,
            status: item.status || "PENDING",
          })),
        });
      }

      let finalTargetOrderId = targetOrderId;
      let eventTypeTarget = "ORDER_UPDATED";

      if (!finalTargetOrderId) {
        finalTargetOrderId = generateId();
        eventTypeTarget = "ORDER_CREATED";
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `asstro_order_id_${labelUpperTarget}`,
            finalTargetOrderId,
          );
        }
      }

      await ledger.appendEvent(eventTypeTarget as any, {
        orderId: finalTargetOrderId,
        tableLabel: labelUpperTarget,
        customerName: targetCustomerName || null,
        guestCount: 1,
        operatorId: currentOperator?.id || "SYS",
        businessDate,
        items: finalTargetItems.map((item: any) => ({
          // FIX DUPLIKASI: Jika ini item yg merge/nimpa, jangan ganti ID-nya!
          id: item.isNewItem ? generateId() : sanitizeId(item.id),
          productId: item.productId || item.product_id || "UNKNOWN",
          skuSnapshot: item.skuSnapshot || item.sku || "",
          nameSnapshot: item.nameSnapshot || item.name || "",
          basePriceSnapshot: item.basePriceSnapshot || item.price || 0,
          qty: item.qty,
          status: item.status || "PENDING",
        })),
      });

      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal transfer item: ${err.message}`);
      throw err;
    }
  };

  const executeSplitOrderV2 = async (
    sourceOrderId: string,
    sourceTableLabel: string,
    remainingItems: any[],
    splitTables: Array<{
      label: string;
      items: any[];
      customerName?: string;
    }>,
  ) => {
    try {
      const splitBusinessDate =
        localStorage.getItem("ASSTRO_BUSINESS_DATE") ||
        new Date().toISOString().slice(0, 10);
      const labelUpper = sourceTableLabel.trim().toUpperCase();

      let sourceCustomerName = null;
      if (typeof window !== "undefined") {
        sourceCustomerName =
          sessionStorage.getItem(`asstro_tamu_meja_${labelUpper}`) || null;
      }

      // FIX MEJA GANTUNG
      if (remainingItems.length === 0) {
        await ledger.appendEvent("TABLE_CLEARED", {
          id: `MEJA-ID-${labelUpper}`,
          tableLabel: labelUpper,
          isVirtual: labelUpper.includes("-"),
        });
      } else {
        await ledger.appendEvent("ORDER_UPDATED", {
          orderId: sourceOrderId,
          tableLabel: labelUpper,
          customerName: sourceCustomerName,
          guestCount: 1,
          operatorId: currentOperator?.id || "SYS",
          businessDate: splitBusinessDate,
          items: remainingItems.map((item: any) => ({
            id: sanitizeId(item.id),
            productId: item.productId || item.product_id || "UNKNOWN",
            skuSnapshot: item.skuSnapshot || item.sku || "",
            nameSnapshot: item.nameSnapshot || item.name || "",
            basePriceSnapshot: item.basePriceSnapshot || item.price || 0,
            qty: item.qty,
            voidedQty: item.voidedQty || 0,
            refundedQty: item.refundedQty || 0,
            status: item.status || "PENDING",
            voidReason: item.voidReason || null,
            notes: item.notes || item.note || null,
          })),
        });
      }

      for (const splitTable of splitTables) {
        const newOrderId = generateId();
        const virtualLabelUpper = splitTable.label.trim().toUpperCase();

        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `asstro_order_id_${virtualLabelUpper}`,
            newOrderId,
          );
        }

        await ledger.appendEvent("ORDER_CREATED", {
          orderId: newOrderId,
          tableLabel: virtualLabelUpper,
          customerName: splitTable.customerName || null,
          guestCount: 1,
          operatorId: currentOperator?.id || "SYS",
          businessDate: splitBusinessDate,
          items: splitTable.items.map((i: any) => ({
            id: generateId(),
            productId: i.productId || i.product_id || "UNKNOWN",
            skuSnapshot: i.skuSnapshot || i.sku,
            nameSnapshot: i.nameSnapshot || i.name,
            basePriceSnapshot: i.basePriceSnapshot || i.price,
            qty: i.qty,
            voidedQty: 0,
            refundedQty: 0,
            status: i.status || "PENDING",
            voidReason: null,
            notes: i.notes || i.note || null,
          })),
        });
      }
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal split bill: ${err.message}`);
      throw err;
    }
  };

  const updateKdsItemStatus = async (
    tableLabel: string,
    orderId: string,
    sku: string,
    newStatus: "PENDING" | "COOKING" | "SERVED",
  ) => {
    try {
      await ledger.appendEvent("KDS_STATUS_UPDATED", {
        orderId,
        tableLabel: tableLabel.trim().toUpperCase(),
        sku,
        status: newStatus,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal update status KDS: ${err.message}`);
    }
  };

  const issuePettyCash = async (data: {
    name: string;
    division: string;
    notes: string;
    amount: number;
  }) => {
    try {
      const now = Date.now();
      await ledger.appendEvent("PETTY_CASH_ISSUED", {
        petty_cash_id: `PC-${now}`,
        requester_name: data.name.trim().toUpperCase(),
        requester_division: data.division.trim().toUpperCase(),
        notes: data.notes.trim(),
        amount_requested: data.amount,
        cashier_id: currentOperator?.id || "SYS",
        cashier_name: currentOperator?.name || "KASIR SYSTEM",
        timestamp: now,
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal mencatat kas keluar: ${err.message}`);
      throw err;
    }
  };

  const resolvePettyCash = async (
    id: string,
    amountReturned: number,
    hasReceipt: boolean,
  ) => {
    try {
      await ledger.appendEvent("PETTY_CASH_RESOLVED", {
        petty_cash_id: id,
        amount_returned: amountReturned,
        has_receipt: hasReceipt,
        cashier_id: currentOperator?.id || "SYS",
        cashier_name: currentOperator?.name || "KASIR SYSTEM",
        timestamp: Date.now(),
      });
      eventBus.next();
    } catch (err: any) {
      errorBus.next(`Gagal menyelesaikan kasbon kasir: ${err.message}`);
      throw err;
    }
  };

  // Kompatibilitas Legacy yang mungkin tidak dipanggil di arsitektur 3 lapis, tapi disimpan untuk mencegah crash
  const refundTransaction = async () => {};

  return {
    updateSettings,
    initializeSystem,
    registerStaff,
    editStaff,
    toggleStaffStatus,
    addMasterTable,
    deleteMasterTable,
    toggleMasterTableStatus,
    addMasterCategory,
    deleteMasterCategory,
    addMasterProduct,
    editMasterProduct,
    deleteMasterProduct,
    toggleProductStatus,
    validatePinOnly,
    openShiftWithModal,
    logoutWithReconciliation,
    executeEndOfDay,
    executeSale,
    placeTableOrder,
    processTablePayment,
    clearTableStatus,
    voidTableOrder,
    refundTransaction,
    updateOrderItems,
    executePaymentRefund,
    moveTableOrderV2,
    executeSplitOrderV2,
    updateKdsItemStatus,
    issuePettyCash,
    resolvePettyCash,
    executeTransferToExistingTable,
  };
};
