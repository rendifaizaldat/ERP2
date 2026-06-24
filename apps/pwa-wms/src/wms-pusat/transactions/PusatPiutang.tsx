import React, { useState, useMemo, useEffect } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Search,
  Filter,
  Receipt,
  FileText,
  Download,
  Printer,
  Edit,
  Trash2,
  Calendar,
  Store,
  History,
  ArchiveRestore,
  Undo2,
  AlertTriangle,
  WalletCards,
} from "lucide-react";
import {
  generateInvoiceHTML,
  printHTML,
} from "../../shared/utils/pdfGenerator";
import { PusatPiutangEditModal } from "./components/PusatPiutangEditModal";
import { PusatPiutangPaymentModal } from "./components/PusatPiutangPaymentModal";
import { PusatPiutangExportModal } from "./components/PusatPiutangExportModal";
import { PusatPiutangDepositModal } from "./components/PusatPiutangDepositModal";

const StatusBadge = ({ status }: { status: string }) => {
  let color = "bg-slate-100 text-slate-500 border-slate-200";
  if (status === "PAID")
    color = "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (status === "UNPAID") color = "bg-red-50 text-red-600 border-red-200";
  if (status === "PARTIAL")
    color = "bg-amber-50 text-amber-600 border-amber-200";
  return (
    <span
      className={`px-3 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-widest border ${color}`}
    >
      {status}
    </span>
  );
};

export const PusatPiutang: React.FC = () => {
  const {
    wmsState,
    piutangPusat, // <--- Ini sekarang akan reaktif otomatis jika RxDB diupdate di WmsProvider
    fetchPiutangPusat,
    outletBalances,
    fetchOutletBalances,
    processBulkPayment,
    mutateOutletBalance,
    archiveReceiving,
    restoreReceiving,
    voidLastPayment,
  } = useWms();
  const { showToast } = useToast();

  useEffect(() => {
    // Fungsi ini mungkin sekarang hanya trigger background sync di WmsProvider
    fetchPiutangPusat();
    fetchOutletBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wmsState?.regionId]);

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [activeTab, setActiveTab] = useState<"COMPLETED" | "CANCELLED">(
    "COMPLETED",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterOutlet, setFilterOutlet] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [paymentModalData, setPaymentModalData] = useState<any>(null);
  const [depositModalData, setDepositModalData] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);

  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    type: "SINGLE" | "GROUP" | "ALL";
    data: any;
    title: string;
  }>({ isOpen: false, type: "ALL", data: null, title: "" });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "ARCHIVE" | "RESTORE" | "VOID";
    data: any;
  }>({ isOpen: false, type: "ARCHIVE", data: null });

  // ==========================================
  // DATA PROCESSING (REFACTOR: Hilangkan localMutations)
  // ==========================================
  const outletList = Array.from(new Set(piutangPusat.map((i) => i.outlet)));

  // Sekarang effectiveData langsung bersumber dari RxDB yang selalu up-to-date
  const effectiveData = useMemo(() => {
    return piutangPusat.map((item: any) => ({
      ...item,
      docStatus: item.docStatus === "CANCELLED" ? "CANCELLED" : "COMPLETED",
      payments: item.payments || [],
    }));
  }, [piutangPusat]);

  const activeCount = effectiveData.filter(
    (i) => i.docStatus === "COMPLETED",
  ).length;
  const archivedCount = effectiveData.filter(
    (i) => i.docStatus === "CANCELLED",
  ).length;

  const filteredData = useMemo(() => {
    return effectiveData.filter((item: any) => {
      const matchTab = item.docStatus === activeTab;
      const matchSearch = `${item.id} ${item.outlet}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchStatus =
        filterStatus === "ALL" || item.status === filterStatus;
      const matchOutlet =
        filterOutlet === "ALL" || item.outlet === filterOutlet;
      const matchStartDate = !startDate || item.tanggal >= startDate;
      const matchEndDate = !endDate || item.tanggal <= endDate;
      return (
        matchTab &&
        matchSearch &&
        matchStatus &&
        matchOutlet &&
        matchStartDate &&
        matchEndDate
      );
    });
  }, [
    effectiveData,
    activeTab,
    searchQuery,
    filterStatus,
    filterOutlet,
    startDate,
    endDate,
  ]);

  const groupedData = useMemo(() => {
    return filteredData.reduce((acc: any, item: any) => {
      const outlet = item.outlet || "Tanpa Nama";
      if (!acc[outlet])
        acc[outlet] = { items: [], total: 0, totalLunas: 0, totalBelum: 0 };
      acc[outlet].items.push(item);
      acc[outlet].total += item.total;
      if (item.status === "PAID") acc[outlet].totalLunas += item.total;
      else acc[outlet].totalBelum += item.sisa;
      return acc;
    }, {});
  }, [filteredData]);

  // ==========================================
  // ACTIONS (REFACTOR: Percayakan sepenuhnya pada useWms)
  // ==========================================
  const handleProcessBulkPayment = async (payload: any) => {
    await processBulkPayment(payload);
    setPaymentModalData(null);
  };

  const handleMutateBalance = async (payload: any) => {
    await mutateOutletBalance(payload);
  };

  const executeConfirmAction = async () => {
    const { type, data } = confirmModal;

    try {
      // Tidak perlu lagi setLocalMutations.
      // archiveReceiving dkk harus melakukan update langsung ke RxDB lokal.
      if (type === "ARCHIVE") {
        await archiveReceiving(data.id);
        showToast("Invoice dipindahkan ke Arsip.", "WARNING");
      } else if (type === "RESTORE") {
        await restoreReceiving(data.id);
        showToast("Invoice dikembalikan ke Daftar Aktif.", "SUCCESS");
      } else if (type === "VOID") {
        const currentPayments = [...(data.payments || [])];
        const lastPayment = currentPayments.pop();

        if (!lastPayment) {
          showToast("Tidak ada riwayat pembayaran untuk di-VOID.", "ERROR");
          setConfirmModal({ isOpen: false, type: "ARCHIVE", data: null });
          return;
        }

        await voidLastPayment(data.id, lastPayment.id);
        showToast("Pembayaran terakhir berhasil di-VOID.", "SUCCESS");
      }
    } catch (error) {
      console.error("[ACTION_ERROR]", error);
      showToast("Gagal memproses aksi.", "ERROR");
    }

    setConfirmModal({ isOpen: false, type: "ARCHIVE", data: null });
  };

  // ==========================================
  // EXPORT LOGIC
  // ==========================================
  const triggerExportExcel = () => {
    const { type, data } = exportModal;
    let exportData: any[] = [];

    if (type === "SINGLE") exportData = [data];
    else if (type === "GROUP") exportData = data.items;
    else exportData = filteredData;

    const formattedData: any[] = [];

    exportData.forEach((item) => {
      if (item.items && item.items.length > 0) {
        item.items.forEach((detail: any, index: number) => {
          formattedData.push({
            "NO INVOICE": index === 0 ? item.id : "",
            TANGGAL: index === 0 ? item.tanggal : "",
            OUTLET: index === 0 ? item.outlet : "",
            "NAMA BARANG": detail.itemName,
            QTY: detail.qty,
            UOM: detail.uom,
            "HARGA SATUAN": detail.price,
            SUBTOTAL: detail.subtotal,
            STATUS: index === 0 ? item.status : "",
            "TAGIHAN INVOICE": index === 0 ? item.total : "",
          });
        });
      } else {
        formattedData.push({
          "NO INVOICE": item.id,
          TANGGAL: item.tanggal,
          OUTLET: item.outlet,
          "NAMA BARANG": "-",
          QTY: "-",
          UOM: "-",
          "HARGA SATUAN": "-",
          SUBTOTAL: "-",
          STATUS: item.status,
          "TAGIHAN INVOICE": item.total,
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap_Piutang_Detail");
    XLSX.writeFile(wb, `${exportModal.title}_${new Date().getTime()}.xlsx`);
    setExportModal({ isOpen: false, type: "ALL", data: null, title: "" });
  };

  const triggerExportPDF = () => {
    const { type, data } = exportModal;

    if (type === "SINGLE") {
      const html = generateInvoiceHTML(data);
      printHTML(html);
      setExportModal({ isOpen: false, type: "ALL", data: null, title: "" });
      return;
    }

    let exportData: any[] = type === "GROUP" ? data.items : filteredData;

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(exportModal.title.replace(/_/g, " "), 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Periode: ${startDate || "Semua"} s/d ${endDate || "Semua"}`,
      14,
      22,
    );
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 28);

    const tableColumn = [
      "Invoice",
      "Tanggal",
      "Outlet",
      "Detail Pembelian",
      "Tagihan",
      "Status",
    ];
    const tableRows: any[] = [];
    let sumTotal = 0;

    exportData.forEach((item) => {
      sumTotal += item.total;
      const detailString =
        item.items && item.items.length > 0
          ? item.items
              .map(
                (d: any) => `${d.qty} | ${d.itemName} | ${d.uom} | ${d.price}`,
              )
              .join("\n")
          : "-";

      tableRows.push([
        item.id,
        item.tanggal,
        item.outlet,
        detailString,
        item.total.toLocaleString("id-ID"),
        item.status,
      ]);
    });

    tableRows.push([
      "",
      "",
      "",
      "TOTAL KESELURUHAN:",
      sumTotal.toLocaleString("id-ID"),
      "",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [2, 132, 199] },
      columnStyles: { 3: { cellWidth: 60 } },
    });

    doc.save(`${exportModal.title}_${new Date().getTime()}.pdf`);
    setExportModal({ isOpen: false, type: "ALL", data: null, title: "" });
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="space-y-3 pb-10 animate-fade relative">
      {/* HEADER UTAMA & TOOLBAR FILTER DIGABUNG */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-5">
        <div className="flex justify-between items-start md:items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                Piutang Pusat
              </h2>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">
                Data Transaksi Pembelian Outlet
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              setExportModal({
                isOpen: true,
                type: "ALL",
                data: null,
                title: "Rekap_Piutang_Semua_Outlet",
              })
            }
            className="flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 rounded-xl font-black text-[0.625rem] uppercase tracking-widest transition-colors shrink-0"
          >
            <Printer size={14} /> Print Semua Data
          </button>
        </div>

        {/* Tab Aktif/Arsip dan Semua Filter Toolbar */}
        <div className="flex flex-col xl:flex-row gap-3 items-center w-full">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full xl:w-auto gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`relative flex-1 xl:flex-none px-5 py-1.5 rounded-lg font-black text-[0.625rem] uppercase tracking-widest transition-all ${
                activeTab === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              Aktif
              {activeTab === "COMPLETED" && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[0.625rem] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {activeCount}
                </div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("CANCELLED")}
              className={`relative flex-1 xl:flex-none px-5 py-1.5 rounded-lg font-black text-[0.625rem] uppercase tracking-widest transition-all ${
                activeTab === "CANCELLED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              Arsip
              {activeTab === "CANCELLED" && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[0.625rem] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {archivedCount}
                </div>
              )}
            </button>
          </div>

          <div className="relative flex-1 w-full min-w-[200px]">
            <input
              type="text"
              placeholder="Cari No Invoice / Outlet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-sky-500 transition-colors uppercase placeholder:normal-case"
            />
            <Search
              size={15}
              className="absolute left-3 top-3 text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto bg-slate-50 border border-slate-200 rounded-xl p-1 px-2 shrink-0">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none text-slate-600 w-full"
            />
            <span className="text-slate-300 font-black">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none text-slate-600 w-full"
            />
          </div>

          <div className="flex w-full xl:w-auto gap-2 shrink-0">
            <div className="relative flex-1">
              <Store
                size={13}
                className="absolute left-3 top-3 text-slate-400"
              />
              <select
                value={filterOutlet}
                onChange={(e) => setFilterOutlet(e.target.value)}
                className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 uppercase cursor-pointer appearance-none"
              >
                <option value="ALL">SEMUA OUTLET</option>
                {outletList.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Filter
                size={13}
                className="absolute left-3 top-3 text-slate-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 uppercase cursor-pointer appearance-none"
              >
                <option value="ALL">SEMUA STATUS</option>
                <option value="UNPAID">BELUM LUNAS</option>
                <option value="PARTIAL">CICILAN</option>
                <option value="PAID">LUNAS</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER KONTEN TABEL */}
      {Object.keys(groupedData).length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 shadow-sm">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-xs uppercase tracking-widest">
            Tidak ada data piutang ditemukan.
          </p>
        </div>
      ) : (
        Object.entries(groupedData).map(([outlet, group]: [string, any]) => {
          const outletBalanceData = outletBalances.find(
            (b) => b.outletId === outlet,
          );
          const currentBalance = outletBalanceData
            ? outletBalanceData.balance
            : 0;

          return (
            <div
              key={outlet}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 animate-slide-up"
            >
              {/* HEADER GROUP */}
              <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                {/* KIRI: NAMA OUTLET & BADGE SALDO DOMPET */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Store size={18} className="text-sky-600" />
                    <span className="font-black text-slate-800 text-base uppercase tracking-tight whitespace-nowrap">
                      {outlet}
                    </span>
                  </div>
                  {/* BADGE SALDO LEDGER */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${currentBalance > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-100 border-slate-200 text-slate-500"}`}
                  >
                    <WalletCards size={14} />
                    <div className="flex flex-col">
                      <span className="text-[0.5rem] font-black uppercase tracking-widest leading-none">
                        Saldo / Deposit
                      </span>
                      <span className="text-xs font-bold leading-tight">
                        Rp {currentBalance.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TENGAH: Badge Keuangan Piutang */}
                <div className="flex items-center justify-center gap-2 md:gap-3 flex-nowrap">
                  <div className="flex flex-col items-center px-2 py-1 min-w-[70px] bg-green-50 rounded-lg border border-green-200">
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-green-600">
                      Lunas
                    </span>
                    <span className="text-xs font-bold text-green-700 tabular-nums">
                      Rp {group.totalLunas.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex flex-col items-center px-2 py-1 min-w-[80px] bg-red-50 rounded-lg border border-red-200">
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-red-600">
                      Belum Lunas
                    </span>
                    <span className="text-xs font-bold text-red-700 tabular-nums">
                      Rp {group.totalBelum.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex flex-col items-center px-2 py-1 min-w-[80px] bg-slate-800 rounded-lg shadow-md">
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-white/80">
                      Total
                    </span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      Rp {group.total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* KANAN: ACTION BUTTONS HEADER */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setExportModal({
                        isOpen: true,
                        type: "GROUP",
                        data: group,
                        title: `Rekap_Piutang_Outlet_${outlet}`,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 font-black text-[0.625rem] uppercase tracking-widest transition-colors whitespace-nowrap"
                  >
                    <Download size={13} /> Cetak
                  </button>
                  <button
                    onClick={() =>
                      setDepositModalData({ outlet, currentBalance })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 font-black text-[0.625rem] uppercase tracking-widest transition-colors whitespace-nowrap"
                  >
                    <WalletCards size={13} /> Kelola Saldo
                  </button>
                  <button
                    onClick={() =>
                      setPaymentModalData({
                        outlet,
                        items: group.items,
                        total: group.total,
                        totalBelum: group.totalBelum,
                        dibayar: group.total - group.totalBelum,
                        sisa: group.totalBelum,
                        currentBalance, // Pass balance ke modal pembayaran bulk
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-black text-[0.625rem] uppercase tracking-widest shadow-md transition-colors whitespace-nowrap"
                  >
                    <History size={13} /> Hub Pembayaran
                  </button>
                </div>
              </div>

              {/* TABEL INVOICE */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-[0.625rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-3 py-3">Tanggal</th>
                      <th className="px-3 py-3 text-right">Total Tagihan</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.items.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-sky-50/30 transition-colors"
                      >
                        <td className="px-5 py-3 font-black text-slate-700 text-xs">
                          {item.id}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-500 text-xs">
                          {item.tanggal}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-slate-800 tabular-nums">
                          Rp {item.total.toLocaleString("id-ID")}
                          <p className="text-[10px] text-slate-400">
                            Dibayar: Rp {item.dibayar.toLocaleString("id-ID")}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            {activeTab === "COMPLETED" ? (
                              <>
                                {item.status === "UNPAID" && (
                                  <button
                                    onClick={() => setEditData(item)}
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Koreksi Transaksi"
                                  >
                                    <Edit size={15} />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setExportModal({
                                      isOpen: true,
                                      type: "SINGLE",
                                      data: item,
                                      title: `Invoice_${item.id}`,
                                    })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                  title="Cetak Invoice"
                                >
                                  <Printer size={15} />
                                </button>
                                {item.status === "UNPAID" ? (
                                  <button
                                    onClick={() =>
                                      setConfirmModal({
                                        isOpen: true,
                                        type: "ARCHIVE",
                                        data: item,
                                      })
                                    }
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Arsipkan Transaksi"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setConfirmModal({
                                        isOpen: true,
                                        type: "VOID",
                                        data: item,
                                      })
                                    }
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Void Pembayaran Terakhir"
                                  >
                                    <Undo2 size={15} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "RESTORE",
                                    data: item,
                                  })
                                }
                                className="flex items-center gap-1 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-black text-[0.625rem] uppercase tracking-widest"
                                title="Kembalikan ke Aktif"
                              >
                                <ArchiveRestore size={13} /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* EXTERNAL COMPONENTS (MODALS) */}
      <PusatPiutangPaymentModal
        data={paymentModalData}
        onClose={() => setPaymentModalData(null)}
        onSubmit={handleProcessBulkPayment}
      />
      <PusatPiutangDepositModal
        data={depositModalData}
        onClose={() => setDepositModalData(null)}
        onSubmit={handleMutateBalance}
      />
      <PusatPiutangExportModal
        isOpen={exportModal.isOpen}
        onClose={() =>
          setExportModal({ isOpen: false, type: "ALL", data: null, title: "" })
        }
        onExportExcel={triggerExportExcel}
        onExportPDF={triggerExportPDF}
      />
      <PusatPiutangEditModal
        isOpen={!!editData}
        onClose={() => setEditData(null)}
        data={editData}
      />

      {/* MODAL KONFIRMASI (ARCHIVE, VOID, RESTORE) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 text-center animate-in zoom-in-95 border border-slate-200">
            {confirmModal.type === "ARCHIVE" && (
              <Trash2 size={44} className="mx-auto text-red-500 mb-3" />
            )}
            {confirmModal.type === "RESTORE" && (
              <ArchiveRestore
                size={44}
                className="mx-auto text-emerald-500 mb-3"
              />
            )}
            {confirmModal.type === "VOID" && (
              <AlertTriangle
                size={44}
                className="mx-auto text-amber-500 mb-3"
              />
            )}

            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-2">
              {confirmModal.type === "ARCHIVE"
                ? "Arsipkan Invoice?"
                : confirmModal.type === "RESTORE"
                  ? "Restore Invoice?"
                  : "Void Pembayaran Terakhir?"}
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-5">
              {confirmModal.type === "ARCHIVE" &&
                "Invoice belum dibayar akan dipindahkan ke tab Arsip dan tidak muncul di laporan aktif."}
              {confirmModal.type === "RESTORE" &&
                "Invoice akan dikembalikan ke tab Daftar Aktif."}
              {confirmModal.type === "VOID" &&
                "Pembayaran terakhir akan dibatalkan (Soft Delete). Jika pembayaran tersebut menggunakan saldo/deposit, maka dana akan dikembalikan otomatis ke Dompet Outlet."}
            </p>

            <div className="flex gap-2 w-full">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    type: "ARCHIVE",
                    data: null,
                  })
                }
                className="flex-1 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeConfirmAction}
                className={`flex-1 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg ${
                  confirmModal.type === "ARCHIVE"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                    : confirmModal.type === "RESTORE"
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                      : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
