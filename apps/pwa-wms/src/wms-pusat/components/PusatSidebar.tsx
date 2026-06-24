import React from "react";
import { useWms } from "../../core/WmsProvider";
import {
  ShoppingCart,
  PackagePlus,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Box,
  Truck,
  ClipboardCheck,
  BarChart3,
  GitMerge,
  Mail,
} from "lucide-react";

interface MenuProps {
  activeMenu: string;
  setActiveMenu: (menuId: string) => void;
}

export const PusatSidebar: React.FC<MenuProps> = ({
  activeMenu,
  setActiveMenu,
}) => {
  const { currentOperator } = useWms();
  const userRole = currentOperator?.role?.toUpperCase() || "STAFF";
  const isManagerOrAdmin = userRole === "SUPERADMIN" || userRole === "MANAGER";

  const menus = [
    {
      id: "po",
      label: "Purchase Order",
      icon: ShoppingCart,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "receiving",
      label: "Barang Masuk",
      icon: PackagePlus,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "return",
      label: "Retur Barang",
      icon: ArrowLeftRight,
      group: "Transaksi",
      visible: true,
    },
    {
      id: "ar_outlet",
      label: "Piutang Outlet",
      icon: Receipt,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "ap_vendor",
      label: "Hutang Vendor",
      icon: CreditCard,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "E_wallet",
      label: "E-Wallet",
      icon: CreditCard,
      group: "Keuangan",
      visible: true,
    },
    {
      id: "master_product",
      label: "Master Produk",
      icon: Box,
      group: "Master Data",
      visible: true,
    },
    {
      id: "master_vendor",
      label: "Manajemen Vendor",
      icon: Truck,
      group: "Master Data",
      visible: true,
    },
    {
      id: "stock_opname",
      label: "Stok Opname",
      icon: ClipboardCheck,
      group: "Inventory",
      visible: true,
    },
    {
      id: "product_merge",
      label: "Merge Item Naming",
      icon: GitMerge,
      group: "Administrator",
      visible: isManagerOrAdmin,
    },
    {
      id: "mail_hub",
      label: "Mail & Komunikasi",
      icon: Mail,
      group: "Administrator",
      visible: true,
    },
    {
      id: "reports",
      label: "Laporan & Analisis",
      icon: BarChart3,
      group: "Analisis",
      visible: isManagerOrAdmin,
    },
  ];

  // Filter menu berdasarkan visibility
  const visibleMenus = menus.filter((m) => m.visible);
  const menuGroups = Array.from(new Set(visibleMenus.map((m) => m.group)));

  return (
    <div className="w-[25%] bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
      {menuGroups.map((groupName) => (
        <div key={groupName}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3">
            {groupName}
          </h3>
          <div className="flex flex-col gap-1">
            {visibleMenus
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
                        ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-purple-600 border border-transparent"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        isActive ? "text-purple-600" : "text-slate-400"
                      }
                    />
                    <span className="text-left flex-1">{menu.label}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
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
