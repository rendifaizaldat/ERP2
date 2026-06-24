import React from "react";

interface TabLogProps {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const TabLog = ({ settings, setSettings }: TabLogProps) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col h-125">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-black uppercase text-slate-800">
          Security & Audit Trails
        </h3>
        <select className="border-2 border-slate-200 rounded-xl p-2 text-xs font-bold uppercase bg-slate-50 outline-none">
          <option>Tampilkan Semua Jejak</option>
          <option>Hanya Transaksi Void/Hapus</option>
          <option>Hanya Login/Logout</option>
        </select>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto scrollbar-thin bg-slate-50">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-200 text-slate-700 sticky top-0 z-10 text-xs uppercase tracking-wider font-black">
            <tr>
              <th className="p-3">Waktu (HLC)</th>
              <th className="p-3">Operator ID</th>
              <th className="p-3">Tipe Event</th>
              <th className="p-3">Detail Hash Payload</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-3 font-mono text-xs text-slate-500">
                171630123:0:ND1
              </td>
              <td className="p-3 font-bold text-slate-800">
                OP-001 (Kasir Utama)
              </td>
              <td className="p-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold text-[10px] uppercase tracking-wider">
                  SALE_CREATED
                </span>
              </td>
              <td className="p-3 text-xs font-medium text-slate-600 truncate max-w-50">
                INV-171630123 (Rp 150.000)
              </td>
            </tr>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-3 font-mono text-xs text-slate-500">
                171620000:1:ND1
              </td>
              <td className="p-3 font-bold text-slate-800">
                SPV-AUTH (Manajer)
              </td>
              <td className="p-3">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-[10px] uppercase tracking-wider">
                  ORDER_VOIDED
                </span>
              </td>
              <td className="p-3 text-xs font-medium text-slate-600 truncate max-w-50">
                Meja 2 - Nasi Goreng Spesial (Salah Input)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
