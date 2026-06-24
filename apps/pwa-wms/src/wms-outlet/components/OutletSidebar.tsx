import React from "react";
import {
  ShoppingCart,
  PackagePlus,
  ArrowLeftRight,
  CreditCard,
  Box,
  Truck,
  ClipboardCheck,
  Calculator,
  Landmark,
  BarChart3,
} from "lucide-react";

interface MenuProps {
  activeMenu: string;
  setActiveMenu: (menuId: string) => void;
}

export const OutletSidebar: React.FC<MenuProps> = ({
  activeMenu,
  setActiveMenu,
}) => {
  const menus = [
    {
      id: "receiving",
      label: "Receiving",
      icon: PackagePlus,
      group: "Transaksi",
    },
    {
      id: "return",
      label: "Retur Barang",
      icon: ArrowLeftRight,
      group: "Transaksi",
    },
    {
      id: "ar_outlet",
      label: "Mutasi & Pinjaman",
      icon: ArrowLeftRight,
      group: "Keuangan",
    },
    {
      id: "E_wallet",
      label: "E-Wallet",
      icon: CreditCard,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "ap_vendor",
      label: "Hutang Vendor",
      icon: CreditCard,
      group: "Keuangan",
    },
    {
      id: "master_product",
      label: "Master Produk",
      icon: Box,
      group: "Master Data",
    },
    {
      id: "master_vendor",
      label: "Manajemen Vendor",
      icon: Truck,
      group: "Master Data",
    },
    {
      id: "stock_opname",
      label: "Stok Opname",
      icon: ClipboardCheck,
      group: "Inventory",
    },
    {
      id: "cogs_bom",
      label: "COGS & BOM",
      icon: Calculator,
      group: "Manufaktur",
    },
    {
      id: "coa",
      label: "Chart of Accounts",
      icon: Landmark,
      group: "Akuntansi",
    },
    {
      id: "reports",
      label: "Laporan & Analisis",
      icon: BarChart3,
      group: "Analisis",
    },
  ];

  const menuGroups = Array.from(new Set(menus.map((m) => m.group)));

  return (
    <div className="w-[25%] bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
      {menuGroups.map((groupName) => (
        <div key={groupName}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3">
            {groupName}
          </h3>
          <div className="flex flex-col gap-1">
            {menus
              .filter((m) => m.group === groupName)
              .map((menu) => {
                const Icon = menu.icon;
                const isActive = activeMenu === menu.id;

                return (
                  <button
                    key={menu.id}
                    onClick={() => setActiveMenu(menu.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all ${
                      isActive
                        ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-sky-600 border border-transparent"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-sky-600" : "text-slate-400"}
                    />
                    <span className="text-left flex-1">{menu.label}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};
