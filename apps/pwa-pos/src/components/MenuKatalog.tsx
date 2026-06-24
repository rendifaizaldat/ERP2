import React, { useState } from "react";
import {
  Search,
  ArrowLeft,
  Plus,
  Minus,
  ShoppingBag,
  Lock,
} from "lucide-react";

interface MenuKatalogProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  filteredProducts: any[];
  dbCategories: any[];
  productQuantities: Record<string, number>;
  selectedTable: string | null;
  onBack: () => void;
  handleAddToCartDirect: (product: any, requestedQty: number) => void;
  handleProductCardIncrement: (sku: string, e: React.MouseEvent) => void;
  handleProductCardDecrement: (sku: string, e: React.MouseEvent) => void;
}

export const MenuKatalog: React.FC<MenuKatalogProps> = ({
  searchQuery,
  setSearchQuery,
  categories,
  activeCategory,
  setActiveCategory,
  filteredProducts,
  selectedTable,
  onBack,
  handleAddToCartDirect,
}) => {
  const [localQuantities, setLocalQuantities] = useState<
    Record<string, number>
  >({});

  const handleLocalIncrement = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalQuantities((prev) => ({
      ...prev,
      [sku]: (prev[sku] || 0) + 1,
    }));
  };

  const handleLocalDecrement = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalQuantities((prev) => ({
      ...prev,
      [sku]: Math.max(0, (prev[sku] || 0) - 1),
    }));
  };

  const handlePushToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const qtyToOrder = localQuantities[product.sku] || 0;
    if (qtyToOrder <= 0) return;

    handleAddToCartDirect(product, qtyToOrder);

    setLocalQuantities((prev) => ({
      ...prev,
      [product.sku]: 0,
    }));
  };

  const displayProducts = filteredProducts.filter((p) => !p.isArchived);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Baris tunggal: tombol back, search, kategori */}
      <div className="flex items-center gap-2 p-3 bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari menu untuk ${selectedTable || "Take Away"}...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-tight focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        {/* Kategori scroll horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none max-w-[70%]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all border cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid katalog */}
      <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5 content-start">
        {displayProducts.length === 0 ? (
          <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-400">
            <ShoppingBag size={32} className="mb-2 opacity-50" />
            <p className="font-black text-xs uppercase tracking-widest">
              Katalog Kosong
            </p>
          </div>
        ) : (
          displayProducts.map((p) => {
            const currentLocalQty = localQuantities[p.sku] || 0;
            const isAvailable = p.isActive !== false;

            return (
              <div
                key={p.sku}
                className={`bg-white border-2 rounded-2xl p-3 flex flex-col justify-between h-32 transition-all duration-150 shadow-sm relative select-none ${
                  isAvailable
                    ? "border-slate-200/80 hover:border-slate-400 group"
                    : "border-slate-100 opacity-80"
                }`}
              >
                {!isAvailable && (
                  <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl pointer-events-none">
                    <div className="bg-slate-800/90 text-white px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md flex items-center gap-1">
                      <Lock size={10} />
                      Offline
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="font-black text-xs md:text-sm uppercase tracking-tight text-slate-900 wrap-break-word line-clamp-2 leading-tight">
                    {p.name}
                  </h4>
                  <span className="font-black text-[11px] md:text-xs text-emerald-600">
                    Rp {p.price.toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Baris bawah: kontrol + tombol order dengan lebar 50% masing-masing */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 shrink-0 w-full relative z-0">
                  {/* Grup kontrol (- / Qty / +) */}
                  <div
                    className={`flex-1 flex items-center border rounded-lg overflow-hidden h-9 shadow-xs ${
                      isAvailable
                        ? "bg-slate-50 border-slate-200"
                        : "bg-slate-100 border-slate-100 opacity-50"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={(e) => handleLocalDecrement(p.sku, e)}
                      className="px-3 h-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="flex-1 font-black text-base text-center text-slate-900">
                      {currentLocalQty}
                    </span>
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={(e) => handleLocalIncrement(p.sku, e)}
                      className="px-3 h-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Tombol Order */}
                  <button
                    type="button"
                    onClick={(e) => handlePushToCart(p, e)}
                    disabled={currentLocalQty <= 0 || !isAvailable}
                    className="flex-1 h-9 flex items-center justify-center gap-1 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all bg-slate-900 text-white hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    title="Tambahkan ke keranjang"
                  >
                    <ShoppingBag size={14} className="shrink-0" />
                    <span>Order</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
