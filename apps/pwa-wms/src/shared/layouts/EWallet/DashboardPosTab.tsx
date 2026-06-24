import React, { useState, useEffect, useMemo } from "react";
import { useWms } from "@/core/WmsProvider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export const DashboardPosTab = () => {
  const { db, branches, regions } = useWms();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Filter States
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [chartType, setChartType] = useState<"COMPARE_OUTLETS" | "TREND_DATES">(
    "COMPARE_OUTLETS",
  );

  // Format Mata Uang
  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);

  // Format Tanggal Singkat (DD MMM)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  };

  // 1. Tarik Data Invoices dari RxDB
  useEffect(() => {
    if (!db || !db.wms_pos_invoices) {
      setIsFetching(false);
      return;
    }

    const subscription = db.wms_pos_invoices
      .find({
        selector: {
          status: { $in: ["paid", "partial", "refunded"] },
        },
      })
      .$.subscribe({
        next: (docs) => {
          setInvoices(docs.map((doc) => doc.toJSON()));
          setIsFetching(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [db]);

  // 2. Pemetaan Cabang & Filter Otoritas
  const branchMap = useMemo(() => {
    const map = new Map<string, any>();
    if (branches) {
      branches.forEach((b: any) => map.set(b.id, b));
    }
    return map;
  }, [branches]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const branchInfo = branchMap.get(inv.branchId);
      if (!branchInfo) return false;

      if (selectedRegion && branchInfo.regionId !== selectedRegion)
        return false;
      if (selectedBranch && inv.branchId !== selectedBranch) return false;

      return true;
    });
  }, [invoices, branchMap, selectedRegion, selectedBranch]);

  // 3. Olah Data untuk Grafik
  const chartData = useMemo(() => {
    if (chartType === "COMPARE_OUTLETS") {
      const agg: Record<
        string,
        { name: string; revenueIN: number; refundOUT: number }
      > = {};

      filteredInvoices.forEach((inv) => {
        const branchName =
          branchMap.get(inv.branchId)?.name || "Unknown Outlet";
        if (!agg[inv.branchId]) {
          agg[inv.branchId] = { name: branchName, revenueIN: 0, refundOUT: 0 };
        }

        if (inv.status === "paid" || inv.status === "partial") {
          agg[inv.branchId].revenueIN += inv.grandTotal;
        } else if (inv.status === "refunded") {
          agg[inv.branchId].refundOUT += inv.grandTotal;
        }
      });
      return Object.values(agg).sort((a, b) => b.revenueIN - a.revenueIN);
    } else {
      const agg: Record<
        string,
        { name: string; revenueIN: number; refundOUT: number }
      > = {};

      filteredInvoices.forEach((inv) => {
        const dStr = formatDate(inv.createdAt);
        if (!agg[dStr]) {
          agg[dStr] = { name: dStr, revenueIN: 0, refundOUT: 0 };
        }

        if (inv.status === "paid" || inv.status === "partial") {
          agg[dStr].revenueIN += inv.grandTotal;
        } else if (inv.status === "refunded") {
          agg[dStr].refundOUT += inv.grandTotal;
        }
      });

      const sortedKeys = Object.keys(agg).sort((a, b) => {
        const invA = filteredInvoices.find(
          (i) => formatDate(i.createdAt) === a,
        );
        const invB = filteredInvoices.find(
          (i) => formatDate(i.createdAt) === b,
        );
        if (!invA || !invB) return 0;
        return (
          new Date(invA.createdAt).getTime() -
          new Date(invB.createdAt).getTime()
        );
      });

      return sortedKeys.map((key) => agg[key]);
    }
  }, [filteredInvoices, chartType, branchMap]);

  // 4. Olah Data untuk List Kanan
  const listDataGrouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredInvoices.forEach((inv) => {
      const branchName = branchMap.get(inv.branchId)?.name || "Unknown Outlet";
      if (!groups[branchName]) groups[branchName] = [];
      groups[branchName].push(inv);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });

    return groups;
  }, [filteredInvoices, branchMap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-black text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs font-bold"
              style={{ color: entry.color }}
            >
              {entry.name === "revenueIN"
                ? "IN (Paid/Partial)"
                : "OUT (Refunded)"}
              : {formatIDR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Layout utama: dua kolom (kiri fixed, kanan scroll) */}
      <div className="flex flex-1 min-h-0 gap-6 overflow-hidden">
        {/* PANEL KIRI - Filter + Grafik (fixed, tidak ikut scroll) */}
        <div className="w-2/3 flex flex-col min-h-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Bagian Filter (digabung dalam card grafik) */}
            <div className="p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Filter Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedBranch("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="">-- SEMUA REGION --</option>
                    {regions?.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-56">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Filter Outlet
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="">-- SEMUA OUTLET --</option>
                    {branches
                      ?.filter(
                        (b: any) =>
                          !selectedRegion || b.regionId === selectedRegion,
                      )
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-full sm:w-64">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Mode Grafik
                  </label>
                  <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => setChartType("COMPARE_OUTLETS")}
                      className={`flex-1 text-[10px] font-black py-1 rounded transition-all ${
                        chartType === "COMPARE_OUTLETS"
                          ? "bg-white shadow-sm text-indigo-700"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      📊 BANDINGKAN OUTLET
                    </button>
                    <button
                      onClick={() => setChartType("TREND_DATES")}
                      className={`flex-1 text-[10px] font-black py-1 rounded transition-all ${
                        chartType === "TREND_DATES"
                          ? "bg-white shadow-sm text-indigo-700"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      📈 TREN WAKTU (HARI)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Area Grafik */}
            <div className="flex-1 min-h-0 p-4 pt-2">
              <div className="h-full w-full relative">
                {isFetching ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs">
                    Memuat Data Grafik...
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs">
                    Belum ada data transaksi untuk filter ini.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "COMPARE_OUTLETS" ? (
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: "#64748b",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `Rp ${val / 1000000}M`}
                          tick={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: "#64748b",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "10px", fontWeight: 800 }}
                        />
                        <Bar
                          dataKey="revenueIN"
                          name="Pendapatan (IN)"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        />
                        <Bar
                          dataKey="refundOUT"
                          name="Pengembalian Dana (OUT)"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        />
                      </BarChart>
                    ) : (
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: "#64748b",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `Rp ${val / 1000000}M`}
                          tick={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: "#64748b",
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: "10px", fontWeight: 800 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenueIN"
                          name="Pendapatan (IN)"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="refundOUT"
                          name="Pengembalian Dana (OUT)"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL KANAN - List Transaksi (scrollable) */}
        <div className="w-1/3 flex flex-col min-h-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-black uppercase text-slate-800">
                Log Transaksi Real-Time
              </h3>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                Riwayat detail invoice POS per outlet.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
              {Object.keys(listDataGrouped).length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 font-bold text-xs text-center px-4">
                  Data log kosong. Pastikan filter outlet benar dan transaksi
                  POS sudah tersinkronisasi.
                </div>
              ) : (
                Object.keys(listDataGrouped).map((branchName) => (
                  <div key={branchName} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <h4 className="text-xs font-black uppercase text-slate-700">
                        {branchName}
                      </h4>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md ml-auto">
                        {listDataGrouped[branchName].length} Tx
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {listDataGrouped[branchName].map((inv: any) => {
                        const isOut = inv.status === "refunded";
                        return (
                          <div
                            key={inv.id}
                            className="p-3 hover:bg-white transition-colors flex justify-between items-center group"
                          >
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                {inv.invoiceNumber}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400">
                                  {new Date(inv.createdAt).toLocaleTimeString(
                                    "id-ID",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                                <span
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    isOut
                                      ? "bg-red-100 text-red-600"
                                      : "bg-emerald-100 text-emerald-600"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`font-mono font-black text-xs ${
                                  isOut ? "text-red-600" : "text-emerald-600"
                                }`}
                              >
                                {isOut ? "-" : "+"} {formatIDR(inv.grandTotal)}
                              </span>
                              <button
                                onClick={() =>
                                  alert(
                                    `Membuka Detail Invoice:\n\nID: ${inv.id}\nNo: ${inv.invoiceNumber}\nStatus: ${inv.status.toUpperCase()}\nTotal: ${formatIDR(inv.grandTotal)}\n\n(Modal/Drawer Detail sedang dalam tahap pengembangan)`,
                                  )
                                }
                                className="p-1.5 bg-slate-100 text-slate-400 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-50 group-hover:opacity-100"
                                title="Lihat Detail Invoice"
                              >
                                👁️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
