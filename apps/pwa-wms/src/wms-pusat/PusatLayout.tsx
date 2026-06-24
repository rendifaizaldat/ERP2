import React, { useState } from "react";
import { Header } from "../shared/components/Header";
import { Footer } from "../shared/components/Footer";
import { PusatSidebar } from "./components/PusatSidebar";

// Master Data
import { SharedMasterProduct } from "../shared/layouts/PusatMasterProduct";
import { PusatProductMergeCenter } from "./master/PusatProductMergeCenter";
import { PusatVendorManagement } from "./master/PusatVendorManagement";

// Transactions
import { OutletReceiving } from "../shared/layouts/OutletReceiving";
import { PusatPurchaseReturn } from "./transactions/PusatPurchaseReturn";
import { PusatPiutang } from "./transactions/PusatPiutang";
import PusatAccountPayable from "./transactions/PusatAccountPayable";
import { PusatReceiving } from "./transactions/PusatReceiving";

// Reports
import { PusatWmsReport } from "./reports/PusatWmsReport";

// Financial
import { EWallet } from "../shared/layouts/EWallet";

export const PusatLayout = () => {
  const [activeMenu, setActiveMenu] = useState<string>("po");

  const renderContent = () => {
    switch (activeMenu) {
      case "po":
        return <OutletReceiving />;
      case "return":
        return <PusatPurchaseReturn />;
      case "ar_outlet":
        return <PusatPiutang />;
      case "ap_vendor":
        return <PusatAccountPayable />;
      case "master_product":
        return <SharedMasterProduct />;
      case "master_vendor":
        return <PusatVendorManagement />;
      case "product_merge":
        return <PusatProductMergeCenter />;
      case "E_wallet":
        return <EWallet />;
      case "reports":
        return <PusatWmsReport />;
      case "receiving":
        return <PusatReceiving />;
      case "stock_opname":
      case "mail_hub":
      default:
        return (
          <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center bg-slate-100/50">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
              Pusat Modul: {activeMenu.replace(/_/g, " ")}
            </h2>
            <p className="text-slate-500">Modul sedang dalam pengembangan</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-row overflow-hidden">
        <PusatSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <main className="w-[75%] h-full bg-slate-50 overflow-y-auto custom-scrollbar p-6 relative">
          {renderContent()}
        </main>
      </div>
      <Footer />
    </div>
  );
};
