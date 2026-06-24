import React, { useState, useMemo } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../../shared/components/Toast";
import {
  Search,
  Filter,
  ArrowRightLeft,
  X,
  FileText,
  CheckCircle,
  Clock,
  Download,
  Calendar,
} from "lucide-react";

// DUMMY DATA MUTASI OUTLET
const DUMMY_MUTASI_OUTLET = [
  {
    id: "MUT-2026-101",
    tanggal: "2026-06-02",
    jenis: "PINJAMAN",
    tujuan: "Asstro Highland",
    totalItem: 45,
    status: "PENDING",
    keterangan: "Pinjam stok Indomie & Kopi",
  },
  {
    id: "MUT-2026-102",
    tanggal: "2026-06-04",
    jenis: "KEMBALIKAN",
    tujuan: "Asstro Lembang",
    totalItem: 20,
    status: "SELESAI",
    keterangan: "Pengembalian pinjaman bulan lalu",
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  let color = "bg-slate-100 text-slate-500 border-slate-200";
  if (status === "SELESAI")
    color = "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (status === "PENDING") color = "bg-red-50 text-red-600 border-red-200";
  if (status === "DIKIRIM")
    color = "bg-amber-50 text-amber-600 border-amber-200";
  return (
    <span
      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${color}`}
    >
      {status}
    </span>
  );
};

export const OutletMutasi: React.FC = () => {
  const { wmsState } = useWms();
  const { showToast } = useToast();

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State Modal
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Filter Data
  const filteredData = useMemo(() => {
    return DUMMY_MUTASI_OUTLET.filter((item: any) => {
      const searchStr = `${item.id} ${item.tujuan}`;
      const matchSearch = searchStr
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchStatus =
        filterStatus === "ALL" || item.status === filterStatus;
      const matchStartDate = !startDate || item.tanggal >= startDate;
      const matchEndDate = !endDate || item.tanggal <= endDate;
      return matchSearch && matchStatus && matchStartDate && matchEndDate;
    });
  }, [searchQuery, filterStatus, startDate, endDate]);

  // Handlers
  const handleExportPdf = () => showToast("Mengekspor Laporan PDF...", "INFO");
  const handleExportExcel = () =>
    showToast("Mengekspor Laporan Excel...", "INFO");
  const handleConfirm = () => {
    showToast("Mutasi berhasil dikonfirmasi!", "SUCCESS");
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              Mutasi & Pinjaman
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Riwayat tagihan dan transfer stok Anda
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleExportPdf}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-bold active:scale-95 transition-all text-xs uppercase tracking-widest border border-rose-200 hover:border-rose-600"
          >
            <FileText size={16} /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl font-bold active:scale-95 transition-all text-xs uppercase tracking-widest border border-emerald-200 hover:border-emerald-600"
          >
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full min-w-[200px]">
          <input
            type="text"
            placeholder="Cari Dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-sky-500 transition-colors uppercase placeholder:normal-case"
          />
          <Search
            size={16}
            className="absolute left-3 top-3.5 text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 w-full xl:w-auto bg-slate-50 border border-slate-200 rounded-xl p-1 px-3">
          <Calendar size={16} className="text-slate-400 shrink-0" />
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
        <div className="flex w-full xl:w-auto gap-2">
          <div className="relative flex-1">
            <Filter
              size={14}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-sky-500 uppercase cursor-pointer appearance-none"
            >
              <option value="ALL">SEMUA STATUS</option>
              <option value="PENDING">MENUNGGU</option>
              <option value="DIKIRIM">DIKIRIM</option>
              <option value="SELESAI">SELESAI</option>
            </select>
          </div>
        </div>
      </div>

      {/* FLAT TABLE MUTASI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left">No Dokumen</th>
                <th className="px-6 py-4 text-left">Tujuan / Asal</th>
                <th className="px-6 py-4 text-left">Jenis Transaksi</th>
                <th className="px-6 py-4 text-center">Total Item</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-xs uppercase tracking-widest">
                      Tidak ada data ditemukan
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-800 uppercase text-xs">
                        {item.id}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {item.tanggal}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs">
                      {item.tujuan}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase tracking-widest">
                        {item.jenis}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">
                      {item.totalItem} Pcs
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-[10px] font-black bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white px-4 py-2 rounded-lg uppercase tracking-widest transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL MUTASI */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">
                  Rincian Dokumen
                </p>
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {selectedItem.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Jenis
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedItem.jenis}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Tujuan
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedItem.tujuan}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Total Item
                    </span>
                    <span className="font-black text-slate-800">
                      {selectedItem.totalItem} Pcs
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Status
                    </span>
                    <StatusBadge status={selectedItem.status} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Keterangan
                  </span>
                  <p className="font-bold text-slate-700">
                    {selectedItem.keterangan}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
              >
                Tutup
              </button>
              {selectedItem.status === "PENDING" && (
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700"
                >
                  <CheckCircle size={16} /> Konfirmasi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
