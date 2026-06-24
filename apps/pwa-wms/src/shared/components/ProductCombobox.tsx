import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

// Menyesuaikan dengan struktur data dari WmsProvider (RegionalItem)
export interface ComboboxItem {
  id: string;
  nama: string;
  kode_produk?: string;
  unit: string;
  sisa_stok?: number;
  harga_jual: number;
}

interface Props {
  products: ComboboxItem[];
  onSelect: (product: ComboboxItem) => void;
  disabled?: boolean;
}

export const ProductCombobox = forwardRef<{ focus: () => void }, Props>(
  ({ products, onSelect, disabled }, ref) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [filtered, setFiltered] = useState<ComboboxItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    useEffect(() => {
      if (query.length < 2) {
        setFiltered([]);
        setIsOpen(false);
        return;
      }
      const lowerQuery = query.toLowerCase();
      const result = products
        .filter(
          (p) =>
            p.nama.toLowerCase().includes(lowerQuery) ||
            (p.kode_produk && p.kode_produk.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, 10); // Batasi hasil untuk performa

      setFiltered(result);
      setIsOpen(true);
      setActiveIndex(0);
    }, [query, products]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : prev,
        );
        scrollActiveIntoView(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        scrollActiveIntoView(activeIndex - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const scrollActiveIntoView = (index: number) => {
      if (listRef.current) {
        const item = listRef.current.children[index] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: "nearest" });
        }
      }
    };

    const handleSelect = (product: ComboboxItem) => {
      onSelect(product);
      setQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
    };

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Shortcut Ctrl+K
    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      };
      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

    return (
      <div ref={wrapperRef} className="relative w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik nama produk..."
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:border-sky-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 placeholder:font-normal"
            autoComplete="off"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">
            🔍
          </span>

          {!query && (
            <span className="absolute right-3 top-2.5 text-[9px] text-slate-400 border border-slate-200 px-1.5 rounded bg-slate-50 font-black">
              Ctrl K
            </span>
          )}
        </div>

        {isOpen && filtered.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95"
          >
            {filtered.map((product, idx) => (
              <li
                key={product.id}
                onClick={() => handleSelect(product)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-none transition-colors ${
                  idx === activeIndex ? "bg-sky-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p
                      className={`font-black text-xs ${
                        idx === activeIndex ? "text-sky-600" : "text-slate-800"
                      }`}
                    >
                      {product.nama}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {product.kode_produk
                        ? `Kode: ${product.kode_produk} | `
                        : ""}
                      Unit: {product.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-slate-800">
                      Rp {product.harga_jual.toLocaleString("id-ID")}
                    </span>
                    {product.sisa_stok !== undefined && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1 inline-block ${
                          product.sisa_stok > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        Stok: {product.sisa_stok}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

ProductCombobox.displayName = "ProductCombobox";
