import React, { useState } from "react";
import { Header } from "../shared/components/Header";
import { Footer } from "../shared/components/Footer";
import { OutletSidebar } from "./components/OutletSidebar";
// Import Modul Outlet
import { OutletStockOpname } from "./transactions/OutletStockOpname";
// transaksi
import { OutletReceiving } from "../shared/layouts/OutletReceiving";
import { OutletMutasi } from "./transactions/OutletMutasi";
import { APOutlet } from "./transactions/AP_outlet";
import { SharedMasterProduct } from "../shared/layouts/PusatMasterProduct";
import { EWallet } from "../shared/layouts/EWallet";

export const OutletLayout = () => {
  // Default awal Outlet diarahkan ke Receiving (Penerimaan Barang)
  const [activeMenu, setActiveMenu] = useState<string>("receiving");

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-row overflow-hidden">
        <OutletSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

        <main className="w-[75%] h-full bg-slate-50 overflow-y-auto custom-scrollbar p-6 relative">
          {activeMenu === "receiving" ? (
            <OutletReceiving />
          ) : activeMenu === "stock_opname" ? (
            <OutletStockOpname />
          ) : activeMenu === "ar_outlet" ? (
            <APOutlet />
          ) : activeMenu === "E_wallet" ? (
            <EWallet />
          ) : activeMenu === "master_product" ? (
            <SharedMasterProduct />
          ) : (
            <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center bg-slate-100/50">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
                Outlet Modul: {activeMenu.replace("_", " ")}
              </h2>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};
