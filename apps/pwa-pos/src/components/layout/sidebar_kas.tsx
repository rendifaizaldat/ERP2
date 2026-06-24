import React, { useState } from "react";
import {
  X,
  Wallet,
  ArrowUpRight,
  CheckSquare,
  Clock,
  FileCheck,
  Printer,
  Unlock,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { useToast } from "../../components/Toast";
import { SmartInput } from "../../components/shared/keyboard/SmartInput";

export const SidebarKas = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { state, issuePettyCash, resolvePettyCash } = usePos();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"INPUT" | "LAPORAN">("INPUT");

  const [reqName, setReqName] = useState("");
  const [reqDivision, setReqDivision] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqAmount, setReqAmount] = useState("");

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [returnedAmount, setReturnedAmount] = useState("");
  const [hasReceipt, setHasReceipt] = useState(false);

  // FUNGSI HARDWARE: POP CASH DRAWER (RJ11)
  const handlePopDrawer = () => {
    // Memancarkan event untuk ditangkap oleh Wrapper (Electron / RN WebView)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("TRIGGER_CASH_DRAWER", {
          detail: {
            reason: "MANUAL_POP",
            operator: state?.activeOperator?.name,
          },
        }),
      );
    }
    showToast(
      "Sinyal RJ11 dikirim ke Printer untuk membuka laci kasir!",
      "INFO",
    );
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reqName.trim() ||
      !reqDivision.trim() ||
      !reqNotes.trim() ||
      !reqAmount.trim()
    ) {
      showToast("Semua baris isian formulir wajib diisi lengkap!", "ERROR");
      return;
    }
    const nominalKeluar = Number(reqAmount) || 0;
    if (nominalKeluar <= 0) {
      showToast("Nominal dana yang diminta tidak valid!", "ERROR");
      return;
    }
    try {
      await issuePettyCash({
        name: reqName,
        division: reqDivision,
        notes: reqNotes,
        amount: nominalKeluar,
      });
      // Otomatis membuka laci setelah kas keluar dicatat
      handlePopDrawer();
      showToast(
        `KAS KELUAR TERCATAT: Rp ${nominalKeluar.toLocaleString()} berhasil dipotong dari laci.`,
        "SUCCESS",
      );
      setReqName("");
      setReqDivision("");
      setReqNotes("");
      setReqAmount("");
      setActiveTab("LAPORAN");
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat kas keluar", "ERROR");
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId) return;
    try {
      const returned = Number(returnedAmount) || 0;
      await resolvePettyCash(resolvingId, returned, hasReceipt);
      handlePopDrawer(); // Otomatis membuka laci untuk memasukkan kembalian
      showToast(
        "Penyelesaian kasbon kasir berhasil dikunci permanen!",
        "SUCCESS",
      );
      setResolvingId(null);
      setReturnedAmount("");
      setHasReceipt(false);
    } catch (err: any) {
      showToast(err.message || "Gagal memproses penyelesaian", "ERROR");
    }
  };

  const handlePrintPDF = () => {
    const listKas = state?.pettyCashTransactions || [];
    if (listKas.length === 0) {
      showToast("Tidak ada data riwayat kas untuk dicetak.", "ERROR");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blokir! Izinkan popup untuk mencetak.", "ERROR");
      return;
    }

    const rows = listKas.map((kas: any) => {
      const waktu = new Date(kas.timestamp_issued).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const peminta = `${kas.requester_name}<br><span style="font-size:9px; color:#666;">${kas.requester_division}</span>`;
      const kasirPemberi = kas.cashier_issued_name;
      const danaAwal = `Rp ${kas.amount_requested.toLocaleString("id-ID")}`;
      const kembalian = kas.amount_returned
        ? `Rp ${kas.amount_returned.toLocaleString("id-ID")}`
        : "-";
      const nota = kas.has_receipt ? "✓ Ada" : "✗ Tanpa";
      const keperluan = kas.notes || "-";
      const status =
        kas.status === "ON_PROCESS"
          ? '<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:999px;">ON PROCESS</span>'
          : '<span style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:999px;">COMPLETED</span>';
      return `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${waktu}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${peminta}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${kasirPemberi}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">${danaAwal}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">${kembalian}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center;">${nota}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${keperluan}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center;">${status}</td></tr>`;
    });

    const htmlContent = `
      <!DOCTYPE html><html><head><title>Laporan Riwayat Kas - Asstro POS</title><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 2rem; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #1e293b; color: white; padding: 10px 8px; text-align: left; }
      </style></head><body>
        <h2 style="text-align:center; margin-bottom:20px;">LAPORAN KAS KELUAR/MASUK</h2>
        <table><thead><tr><th>Waktu</th><th>Peminta</th><th>Kasir</th><th>Awal</th><th>Sisa</th><th>Nota</th><th>Notes</th><th>Status</th></tr></thead><tbody>${rows.join("")}</tbody></table>
        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);};</script>
      </body></html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  const listKas = state?.pettyCashTransactions || [];

  return (
    <div className="fixed inset-0 z-200 bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full md:w-full md:max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* HEADER */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-slate-800" />
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">
              Sistem Operasional Kas Kasir
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePopDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-md cursor-pointer text-xs font-black uppercase tracking-wider"
              title="Buka Laci Secara Manual"
            >
              <Unlock size={14} /> Buka Laci Fisik
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          <button
            onClick={() => {
              setActiveTab("INPUT");
              setResolvingId(null);
            }}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all ${activeTab === "INPUT" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            Form Input Permintaan Dana
          </button>
          <button
            onClick={() => setActiveTab("LAPORAN")}
            className={`flex-1 py-3 text-center text-xs uppercase font-black tracking-tight border-b-2 cursor-pointer transition-all ${activeTab === "LAPORAN" ? "border-orange-600 text-slate-900 bg-orange-50/30" : "border-transparent text-slate-400 hover:text-slate-800"}`}
          >
            Laporan & Riwayat Kas ({listKas.length})
          </button>
        </div>

        {/* AREA KONTEN (Input & Laporan) */}
        <div className="flex-1 overflow-auto p-5 bg-slate-100 scrollbar-thin">
          {activeTab === "INPUT" && !resolvingId && (
            <div className="max-w-xl mx-auto space-y-4">
              <form
                onSubmit={handleAddSubmit}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs font-bold text-slate-700"
              >
                <h3 className="font-black text-slate-900 text-center uppercase tracking-wide border-b pb-2 text-[11px]">
                  Form Kas Keluar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Nama Peminta
                    </label>
                    <SmartInput
                      type="text"
                      value={reqName}
                      onChange={(val) => setReqName(val)}
                      placeholder="Contoh: Chef Jaka"
                      className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Divisi / Departemen
                    </label>
                    <SmartInput
                      type="text"
                      value={reqDivision}
                      onChange={(val) => setReqDivision(val)}
                      placeholder="Contoh: DAPUR / SERVICE"
                      className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Keperluan Anggaran (Catatan)
                  </label>
                  <SmartInput
                    type="text"
                    value={reqNotes}
                    onChange={(val) => setReqNotes(val)}
                    placeholder="Detail keperluan pengeluaran dana laci..."
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Jumlah Uang Yang Diambil (Rp)
                  </label>
                  <SmartInput
                    type="number"
                    value={reqAmount}
                    onChange={(val) => setReqAmount(val.replace(/\D/g, ""))}
                    placeholder="0"
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-orange-500 font-black text-sm text-red-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full p-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <ArrowUpRight size={16} /> Konfirmasi Kas Keluar (Potong Laci)
                </button>
              </form>
            </div>
          )}

          {resolvingId && (
            <div className="max-w-xl mx-auto space-y-4">
              <form
                onSubmit={handleResolveSubmit}
                className="bg-white p-6 rounded-2xl border-2 border-green-200 shadow-sm space-y-4 text-xs font-bold text-slate-700"
              >
                <h3 className="font-black text-green-700 text-center uppercase tracking-wide border-b pb-2 text-[11px]">
                  Form Penyelesaian Nota & Kembalian
                </h3>
                <div>
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Jumlah Uang Kembalian (Rp)
                  </label>
                  <SmartInput
                    type="number"
                    value={returnedAmount}
                    onChange={(val) =>
                      setReturnedAmount(val.replace(/\D/g, ""))
                    }
                    placeholder="Input 0 jika habis tanpa sisa"
                    className="w-full bg-slate-50 border rounded-xl p-3 outline-none focus:border-green-600 font-black text-sm text-green-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    Uang kembalian ini otomatis menambah kembali isi kas laci
                    fisik toko.
                  </span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 border rounded-xl">
                  <input
                    type="checkbox"
                    id="receipt_check"
                    checked={hasReceipt}
                    onChange={(e) => setHasReceipt(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-green-600"
                  />
                  <label
                    htmlFor="receipt_check"
                    className="cursor-pointer font-black text-[10px] uppercase text-slate-700"
                  >
                    Saya Mengonfirmasi Nota / Struk Pembelian Fisik Telah
                    Diserahkan
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResolvingId(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-black uppercase rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-xl cursor-pointer flex justify-center items-center gap-1 shadow-sm"
                  >
                    <CheckSquare size={14} /> Kunci Transaksi
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "LAPORAN" && (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Printer size={14} /> Cetak PDF
                </button>
              </div>
              {listKas.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Wallet size={40} className="mb-2 opacity-20" />
                  <p className="font-black uppercase tracking-wider text-[10px]">
                    Belum ada data pengeluaran kas kecil shift ini.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    {/* ... (Tabel tetap persis sama seperti yang Anda buat) ... */}
                    <thead className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-wider">
                      <tr>
                        <th className="p-3">Waktu Pinjam</th>
                        <th className="p-3">Peminta / Divisi</th>
                        <th className="p-3">Kasir Pemberi</th>
                        <th className="p-3">Dana Awal</th>
                        <th className="p-3">Kembalian / Nota</th>
                        <th className="p-3">Keperluan (Notes)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-slate-700">
                      {listKas.map((kas: any, idx: number) => {
                        const dateStr = new Date(
                          kas.timestamp_issued,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isOnProcess = kas.status === "ON_PROCESS";
                        return (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3 text-slate-400">{dateStr}</td>
                            <td className="p-3">
                              <span className="font-black text-slate-900 block uppercase">
                                {kas.requester_name}
                              </span>
                              <span className="text-[9px] text-slate-400 block tracking-tight">
                                {kas.requester_division}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="uppercase text-slate-800">
                                {kas.cashier_issued_name}
                              </span>
                              {kas.cashier_resolved_name && (
                                <span className="text-[8px] text-slate-400 block">
                                  Selesai: {kas.cashier_resolved_name}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-red-600 font-black">
                              Rp {kas.amount_requested.toLocaleString()}
                            </td>
                            <td className="p-3">
                              {isOnProcess ? (
                                <span className="text-slate-400 italic font-medium">
                                  Menunggu nota...
                                </span>
                              ) : (
                                <div>
                                  <span className="text-green-600 font-black">
                                    Rp {kas.amount_returned.toLocaleString()}
                                  </span>
                                  <span className="text-[8px] text-slate-400 block uppercase">
                                    {kas.has_receipt
                                      ? "✓ Nota Ada"
                                      : "✗ Tanpa Nota"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td
                              className="p-3 max-w-xs truncate text-slate-500"
                              title={kas.notes}
                            >
                              {kas.notes}
                            </td>
                            <td className="p-3 text-center">
                              {isOnProcess ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black tracking-tight inline-flex items-center gap-0.5">
                                  <Clock size={10} /> ON PROCESS
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[8px] font-black tracking-tight inline-flex items-center gap-0.5">
                                  <FileCheck size={10} /> COMPLETED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {isOnProcess ? (
                                <button
                                  onClick={() => setResolvingId(kas.id)}
                                  className="w-full py-1 bg-white hover:bg-green-50 border border-green-200 text-green-600 rounded-lg text-[9px] font-black uppercase cursor-pointer tracking-tighter"
                                >
                                  Update Nota
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400 uppercase font-black">
                                  Locked
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
