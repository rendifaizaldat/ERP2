// Path: apps/pwa-pos/src/components/SidebarHistori.tsx
import React, { useState } from "react";
import {
  X,
  History,
  FileText,
  Undo2,
  Printer,
  Search,
  CloudLightning,
  ShieldAlert,
  Receipt,
  Download,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { RefundModal } from "../RefundModal";
import { useToast } from "../Toast";

export const SidebarHistori = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state, executePaymentRefund } = usePos();
  const { showToast } = useToast();

  const [activeMainTab, setActiveMainTab] = useState<"TRANSAKSI" | "AUDIT">(
    "TRANSAKSI",
  );
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [showRefundModal, setShowRefundModal] = useState(false);

  const [searchMode, setSearchMode] = useState<"LOCAL" | "CLOUD">("LOCAL");
  const [cloudSearchStatus, setCloudSearchStatus] = useState<"IDLE" | "SEARCHING" | "SUCCESS" | "EMPTY" | "ERROR">("IDLE");
  const [cloudResults, setCloudResults] = useState<any[]>([]);

  const [searchType, setSearchType] = useState<
    "invoice" | "nama" | "meja" | "date" | "range"
  >("invoice");
  const [searchValue, setSearchValue] = useState("");

  const performSearch = async (isManualSubmit: boolean = true) => {
    if (searchMode === "CLOUD" && searchType !== "invoice") {
      if (isManualSubmit) {
        showToast(
          "Pencarian server (Cloud) WAJIB menggunakan No. Invoice",
          "WARNING",
        );
      }
      return;
    }

    if (searchMode === "CLOUD") {
      setCloudSearchStatus("SEARCHING");
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (searchValue === "ERROR") reject(new Error("Simulasi Error Koneksi Cloud"));
            resolve(true);
          }, 1500);
        });

        const dummyResults = searchValue === "EMPTY" ? [] : [
          {
            invoice_id: searchValue || "INV-CLOUD-001",
            timestamp: Date.now(),
            grand_total: 120000,
            status: "PAID",
            payment_method: "QRIS",
            table_label: "MEJA-10",
            items: [
              { name: "Dummy Cloud Item", qty: 2, price: 60000 }
            ]
          }
        ];

        setCloudResults(dummyResults);

        if (dummyResults.length > 0) {
          setCloudSearchStatus("SUCCESS");
          if (isManualSubmit) showToast(`Ditemukan ${dummyResults.length} invoice dari Cloud.`, "SUCCESS");
        } else {
          setCloudSearchStatus("EMPTY");
          if (isManualSubmit) showToast(`Tidak ditemukan invoice di Cloud.`, "WARNING");
        }
      } catch (e: any) {
        setCloudSearchStatus("ERROR");
        if (isManualSubmit) showToast(`Gagal menghubungi server Cloud: ${e.message}`, "ERROR");
      }
    }
  };

  if (!isOpen) return null;

  const rawTransactions =
    searchMode === "LOCAL" ? state?.transactions || [] : cloudResults;

  const transactions = rawTransactions.filter((trx: any) => {
    if (searchMode !== "LOCAL") return true;
    if (!searchValue.trim()) return true;
    const query = searchValue.toLowerCase();

    if (searchType === "invoice")
      return (
        trx.invoice_id?.toLowerCase().includes(query) ||
        trx.id?.toLowerCase().includes(query)
      );
    if (searchType === "nama")
      return trx.customer_name?.toLowerCase().includes(query);
    if (searchType === "meja")
      return trx.table_label?.toLowerCase().includes(query);
    return true;
  });

  const auditLogs = state?.auditLogs || [];
  const filteredAuditLogs = auditLogs.filter(
    (log: any) =>
      log.eventType === "ORDER_VOIDED" ||
      log.eventType === "ORDER_CANCELLED" ||
      log.eventType === "PAYMENT_REFUNDED" ||
      log.eventType === "ORDER_REFUNDED",
  );

  const handleOpenRefund = (trx: any) => {
    const status = (trx.status || "").toLowerCase();
    if (status === "refunded") {
      showToast("Transaksi ini sudah pernah direfund sebelumnya!", "WARNING");
      return;
    }
    setSelectedTransaction(trx);
    setShowRefundModal(true);
  };

  const getStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed" || s === "lunas") return "LUNAS";
    if (s === "refunded") return "REFUNDED";
    if (s === "void") return "VOID";
    return status?.toUpperCase() || "PENDING";
  };

  const handleReprint = (trx: any) => {
    window.dispatchEvent(
      new CustomEvent("PRINT_RECEIPT", {
        detail: {
          ...trx,
          isReprint: true,
          watermark: "STRUK SUDAH DI BAYAR ini hanya salinan reprint",
        },
      }),
    );
    showToast("Mencetak salinan reprint...", "INFO");
  };

  const handleExportPdfAudit = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let html = `
      <html>
      <head>
        <title>Laporan Refund & Void</title>
        <style>
          body { font-family: monospace; padding: 20px; color: #333; }
          .header { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .log-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">LAPORAN REFUND & VOID<br><small>Dicetak: ${new Date().toLocaleString()}</small></div>
    `;

    filteredAuditLogs.forEach((log: any) => {
      const type = log.eventType?.includes("REFUND") ? "REFUND" : "VOID";
      const total = Number(
        log.totalAmount || log.amountRefunded || log.amount || 0,
      ).toLocaleString();
      const qty = log.items?.length || log.qtyRefunded || log.qty || 0;

      html += `
        <div class="log-item">
          <strong>[${log.invoiceId || log.orderId || "SYSTEM"}]</strong><br>
          [Meja ${log.tableLabel || "-"} | ${log.customerName || "-"} | ${type} | ${qty} Item | Rp ${total}]
        </div>
      `;
    });

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-200 flex flex-col animate-slide-in-right border-l border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-800" />
            <h2 className="font-black text-sm uppercase tracking-tight text-slate-800">
              Pusat Histori & Audit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setActiveMainTab("TRANSAKSI")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex justify-center items-center gap-1.5
              ${activeMainTab === "TRANSAKSI" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <Receipt size={14} /> Riwayat Transaksi
          </button>
          <button
            onClick={() => setActiveMainTab("AUDIT")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex justify-center items-center gap-1.5
              ${activeMainTab === "AUDIT" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <ShieldAlert size={14} /> Laporan Refund & Void
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
          {activeMainTab === "TRANSAKSI" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setSearchMode("LOCAL")}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1
                      ${searchMode === "LOCAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <FileText size={12} /> Shift Aktif Lokal
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode("CLOUD");
                      setSearchType("invoice");
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1
                      ${searchMode === "CLOUD" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-blue-600"}`}
                  >
                    <CloudLightning size={12} /> Server Enterprise
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    disabled={searchMode === "CLOUD"}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-2.5 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="invoice">No. Invoice</option>
                    <option value="nama">Nama Tamu</option>
                    <option value="meja">No. Meja</option>
                  </select>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") performSearch(true);
                      }}
                      placeholder={
                        searchMode === "CLOUD"
                          ? "Wajib No. Invoice (Lalu Enter)"
                          : "Ketik kata kunci..."
                      }
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-slate-400"
                    />
                    <Search
                      size={14}
                      className="absolute left-2.5 top-3 text-slate-400 cursor-pointer"
                      onClick={() => performSearch(true)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {searchMode === "CLOUD" && cloudSearchStatus === "SEARCHING" ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <CloudLightning
                      size={24}
                      className="animate-pulse mb-2 text-blue-500"
                    />
                    <span className="text-xs font-bold">
                      Mencari di Server Enterprise...
                    </span>
                  </div>
                ) : searchMode === "CLOUD" && cloudSearchStatus === "ERROR" ? (
                  <div className="flex flex-col items-center justify-center h-40 text-red-500">
                    <ShieldAlert size={24} className="mb-2" />
                    <span className="text-xs font-bold">
                      Gagal menghubungi server.
                    </span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <FileText size={24} className="mb-2 opacity-20" />
                    <span className="text-xs font-bold">
                      Tidak ada riwayat transaksi ditemukan.
                    </span>
                  </div>
                ) : (
                  transactions.map((trx: any, idx: number) => {
                    const statusLabel = getStatusLabel(trx.status);
                    return (
                      <div
                        key={trx.id || idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-slate-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">
                              {trx.invoice_id || trx.id}
                            </span>
                            {/* DATA MEJA DAN TAMU DIRENDER DI SINI */}
                            <span className="text-xs font-black text-slate-800 uppercase block mt-0.5">
                              {trx.table_label || "TA"}{" "}
                              <span className="text-slate-400 font-medium">
                                ({trx.customer_name || "TAMU"})
                              </span>
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider
                            ${
                              statusLabel === "LUNAS"
                                ? "bg-emerald-100 text-emerald-700"
                                : statusLabel === "REFUNDED"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-1">
                          <span className="text-sm font-black text-slate-900">
                            Rp{" "}
                            {Number(
                              trx.grand_total || trx.grandTotal || 0,
                            ).toLocaleString()}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReprint(trx)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors cursor-pointer"
                              title="Cetak Ulang Nota"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenRefund(trx)}
                              className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-md transition-colors cursor-pointer"
                              title="Refund Transaksi"
                            >
                              <Undo2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeMainTab === "AUDIT" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">
                  Daftar Laporan
                </span>
                <button
                  onClick={handleExportPdfAudit}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Download size={12} /> Export PDF
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {filteredAuditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <ShieldAlert size={24} className="mb-2 opacity-20" />
                    <span className="text-xs font-bold">
                      Tidak ada data Refund & Void.
                    </span>
                  </div>
                ) : (
                  filteredAuditLogs.map((log: any, idx: number) => {
                    const type = log.eventType?.includes("REFUND")
                      ? "REFUND"
                      : "VOID";
                    const totalAmount = Number(
                      log.totalAmount || log.amountRefunded || log.amount || 0,
                    ).toLocaleString();
                    const itemQty =
                      log.items?.length || log.qtyRefunded || log.qty || 0;

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col gap-1 hover:border-slate-300 transition-colors"
                      >
                        <div className="font-black text-xs text-slate-800 tracking-wide">
                          [{log.invoiceId || log.orderId || "SYSTEM"}]
                        </div>
                        {/* DATA MEJA DAN TAMU UNTUK LOG AUDIT DIRENDER DI SINI */}
                        <div className="text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          [{log.tableLabel || "-"} | {log.customerName || "-"} |{" "}
                          {type} | {itemQty} Item | Rp {totalAmount}]
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            OPR: {log.operatorId || "UNKNOWN"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRefundModal && selectedTransaction && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onConfirmRefund={async (
            invoiceId,
            itemsToRefund,
            refundMethod,
            totalRefundAmount,
            voidNote,
            managerPin,
            refundType,
          ) => {
            await executePaymentRefund(
              invoiceId,
              itemsToRefund,
              refundMethod,
              totalRefundAmount,
              voidNote,
              managerPin,
              refundType,
            );
          }}
        />
      )}
    </>
  );
};
