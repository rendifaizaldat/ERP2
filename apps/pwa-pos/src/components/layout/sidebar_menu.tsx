import React, { useState } from "react";
import {
  X,
  Tag,
  Trash2,
  Settings,
  Pencil,
  Search,
  ArchiveRestore,
  Import,
  Download,
} from "lucide-react";
import { useToast } from "../Toast";
import { SmartInput } from "../shared/keyboard/SmartInput";

// Import Modals
import { DeleteCategoryModal } from "../modals/DeleteCategoryModal";
import { ArchiveProductModal } from "../modals/ArchiveProductModal";
import { ExportMenuModal } from "../modals/ExportMenuModal";
import { ImportMenuModal } from "../modals/ImportMenuModal";

interface SidebarMenuProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  catName: string;
  setCatName: (name: string) => void;
  catError: string | null;
  handleAddCategorySubmit: (e: React.FormEvent) => Promise<void>;
  masterCategories: Array<{ id: string; name: string }>;
  deleteMasterCategory: (id: string) => void;
  masterProducts: Array<{
    sku: string;
    name: string;
    price: number;
    categoryId: string;
    isActive?: boolean;
    isArchived?: boolean;
  }>;
  deleteMasterProduct: (sku: string) => void;
  toggleProductStatus: (sku: string, isActive: boolean) => void;
  editMasterProduct: (data: {
    sku: string;
    name: string;
    price: number;
    categoryId: string;
  }) => Promise<void>;
  restoreMasterProduct: (data: {
    sku: string;
    name: string;
    price: number;
    categoryId: string;
  }) => Promise<void>;
  triggerManagerPinVerification: (
    callback: (authorized: boolean) => void,
  ) => void;
  prodSku: string;
  setProdSku: (sku: string) => void;
  prodName: string;
  setProdName: (name: string) => void;
  prodPrice: string;
  setProdPrice: (price: string) => void;
  prodCatId: string;
  setProdCatId: (id: string) => void;
  prodError: string | null;
  handleAddProductSubmit: (e: React.FormEvent) => Promise<void>;
  addMasterCategory?: (name: string) => Promise<void>;
  addMasterProduct?: (data: any) => Promise<void>;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isMenuOpen,
  setIsMenuOpen,
  catName,
  setCatName,
  catError,
  handleAddCategorySubmit,
  masterCategories,
  deleteMasterCategory,
  masterProducts,
  deleteMasterProduct,
  toggleProductStatus,
  editMasterProduct,
  restoreMasterProduct,
  triggerManagerPinVerification,
  prodSku,
  setProdSku,
  prodName,
  setProdName,
  prodPrice,
  setProdPrice,
  prodCatId,
  setProdCatId,
  prodError,
  handleAddProductSubmit,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  // Modal States
  const [productToArchive, setProductToArchive] = useState<any>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await editMasterProduct({
        sku: prodSku,
        name: prodName,
        price: Number(prodPrice),
        categoryId: prodCatId,
      });
      showToast("Perubahan menu berhasil disimpan!", "SUCCESS");
      resetForm();
    } else {
      await handleAddProductSubmit(e);
    }
  };

  const resetForm = () => {
    setProdSku("");
    setProdName("");
    setProdPrice("");
    setProdCatId("");
    setIsEditing(false);
  };

  const handleEditClick = (p: any) => {
    triggerManagerPinVerification((isAuthorized) => {
      if (isAuthorized) {
        setProdSku(p.sku);
        setProdName(p.name);
        setProdPrice(p.price.toString());
        setProdCatId(p.categoryId);
        setIsEditing(true);
        showToast("Mode Edit Diaktifkan.", "SUCCESS");
      } else {
        showToast("Otorisasi PIN gagal. Akses edit ditolak.", "ERROR");
      }
    });
  };

  const handleRestoreClick = (p: any) => {
    triggerManagerPinVerification(async (isAuthorized) => {
      if (isAuthorized) {
        await restoreMasterProduct({
          sku: p.sku,
          name: p.name,
          price: p.price,
          categoryId: p.categoryId,
        });
        showToast(
          `Produk ${p.name} berhasil dipulihkan dari arsip!`,
          "SUCCESS",
        );
      } else {
        showToast("Otorisasi PIN gagal.", "ERROR");
      }
    });
  };

  const filteredProducts = masterProducts.filter((p) => {
    const isArchivedProduct = p.isArchived === true;
    const matchesTab =
      activeTab === "ARCHIVED" ? isArchivedProduct : !isArchivedProduct;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/60 z-70 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-80 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center bg-linear-to-r from-orange-50 to-slate-50 text-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 p-2 rounded-xl">
              <Settings className="text-white" size={16} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider">
              Menu & Category Setup Center
            </h3>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-4 items-start">
              <form
                onSubmit={handleAddCategorySubmit}
                className="bg-linear-to-br from-slate-50 to-white border-2 border-slate-100 p-4 rounded-2xl space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-2 border-b-2 border-orange-200 pb-1.5">
                  <Tag className="text-orange-600" size={14} />
                  <span className="font-black text-[11px] uppercase tracking-wider text-orange-600">
                    A. Input Kategori Baru
                  </span>
                </div>
                {catError && (
                  <div className="p-2 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg font-bold text-[10px] uppercase">
                    ⚠️ {catError}
                  </div>
                )}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                    Nama Kategori
                  </label>
                  <SmartInput
                    type="text"
                    value={catName}
                    onChange={(val) => setCatName(val)}
                    placeholder="Contoh: MAKANAN, MINUMAN"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  + Simpan
                </button>
              </form>

              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-1.5">
                  <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                  <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">
                    Daftar Kategori ({masterCategories.length})
                  </span>
                </div>
                <div className="border-2 border-slate-100 rounded-xl bg-white divide-y max-h-36 overflow-y-auto shadow-sm">
                  {masterCategories.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Belum ada kategori.
                    </div>
                  ) : (
                    masterCategories.map((cat: any) => (
                      <div
                        key={cat.id}
                        className="px-4 py-1 flex justify-between items-center text-xs hover:bg-slate-50 transition-colors group"
                      >
                        <span className="font-black uppercase text-slate-700">
                          {cat.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Hapus Kategori"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t-2 border-slate-100 pt-5">
              <div className="flex items-center justify-between border-b-2 border-orange-200 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`${isEditing ? "bg-blue-100" : "bg-orange-100"} p-1 rounded-lg`}
                  >
                    {isEditing ? (
                      <Pencil className="text-blue-600" size={12} />
                    ) : (
                      <Tag className="text-orange-600" size={12} />
                    )}
                  </div>
                  <span
                    className={`font-black text-[11px] uppercase tracking-wider ${isEditing ? "text-blue-600" : "text-orange-600"}`}
                  >
                    {isEditing
                      ? "B. Edit Menu Produk"
                      : "B. Input Menu Produk Baru"}
                  </span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[9px] font-black text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-md uppercase transition-all cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleFormSubmit}
                className={`bg-linear-to-br border-2 p-4 rounded-2xl grid grid-cols-2 gap-3 shadow-sm transition-all ${isEditing ? "from-blue-50 to-white border-blue-200" : "from-slate-50 to-white border-slate-100"}`}
              >
                {prodError && (
                  <div className="col-span-2 p-2 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg font-bold text-[10px] uppercase">
                    ⚠️ {prodError}
                  </div>
                )}
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    SKU Produk *
                  </label>
                  <SmartInput
                    type="text"
                    required
                    disabled={isEditing}
                    value={prodSku}
                    onChange={(val) => setProdSku(val.toUpperCase())}
                    placeholder="SKU-001"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Kategori *
                  </label>
                  <select
                    required
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400 transition-all"
                  >
                    <option value="">-- PILIH KATEGORI --</option>
                    {masterCategories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Nama Menu *
                  </label>
                  <SmartInput
                    type="text"
                    required
                    value={prodName}
                    onChange={(val) => setProdName(val.toUpperCase())}
                    placeholder="NASI GORENG SPECIAL"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-orange-400 transition-all"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Harga (Rp) *
                  </label>
                  <SmartInput
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(val) => setProdPrice(val.replace(/\D/g, ""))}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-orange-400 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className={`col-span-2 py-3 mt-1 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md text-white ${isEditing ? "bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600" : "bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"}`}
                >
                  {isEditing ? "Simpan Perubahan Menu" : "+ Simpan Menu Baru"}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 border-b-2 border-slate-200 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
                    <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">
                      Database Menu Ruko
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTab("ACTIVE")}
                        className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${activeTab === "ACTIVE" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Menu Aktif
                      </button>
                      <button
                        onClick={() => setActiveTab("ARCHIVED")}
                        className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase transition-all cursor-pointer ${activeTab === "ARCHIVED" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Arsip
                      </button>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer text-slate-600"
                        title="Import Menu"
                      >
                        <Import size={14} />
                      </button>
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer text-slate-600"
                        title="Export Menu"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <SmartInput
                    type="text"
                    placeholder="Cari berdasarkan nama atau SKU menu..."
                    value={searchTerm}
                    onChange={(val) => setSearchTerm(val)}
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-400 transition-all"
                  />
                </div>
              </div>

              <div className="border-2 border-slate-100 rounded-2xl bg-white divide-y shadow-sm max-h-100 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm">
                    <div className="mb-1">🍽️</div>
                    Tidak ada menu yang sesuai di kategori ini.
                  </div>
                ) : (
                  filteredProducts.map((p: any) => {
                    const catObj = masterCategories.find(
                      (c: any) => c.id === p.categoryId,
                    );
                    const isAvailable = p.isActive !== false;
                    return (
                      <div
                        key={p.sku}
                        className={`px-4 py-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs transition-all hover:bg-slate-50 group gap-2 ${!isAvailable ? "bg-slate-50/50" : ""}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black uppercase text-sm ${p.isArchived ? "text-slate-400 line-through" : "text-slate-900"}`}
                            >
                              {p.name}
                            </span>
                            {!isAvailable && !p.isArchived && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[8px] font-black">
                                OFFLINE
                              </span>
                            )}
                            {p.isArchived && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-md text-[8px] font-black">
                                <ArchiveRestore size={8} /> ARSIP
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            SKU: {p.sku} • KAT: {catObj?.name || "UNKNOWN"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black whitespace-nowrap ${p.isArchived ? "text-slate-400" : "text-emerald-600"}`}
                          >
                            Rp {p.price.toLocaleString()}
                          </span>
                          {activeTab === "ACTIVE" ? (
                            <>
                              <button
                                onClick={() =>
                                  toggleProductStatus(p.sku, !isAvailable)
                                }
                                className={`px-2 py-1 rounded-md font-black text-[9px] uppercase transition-all cursor-pointer min-w-15 ${isAvailable ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
                              >
                                {isAvailable ? "ACTIVE" : "INACTIVE"}
                              </button>
                              <button
                                onClick={() => handleEditClick(p)}
                                className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setProductToArchive(p)}
                                className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestoreClick(p)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md font-black text-[9px] uppercase transition-all cursor-pointer"
                            >
                              <ArchiveRestore size={10} /> Pulihkan Data
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 pb-6 text-center">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                ⚡ Perubahan akan langsung tersimpan ke sistem ledger
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImportMenuModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        masterCategories={masterCategories}
        masterProducts={masterProducts}
      />

      <ExportMenuModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        masterProducts={masterProducts}
        masterCategories={masterCategories}
      />

      <ArchiveProductModal
        product={productToArchive}
        onClose={() => setProductToArchive(null)}
        onConfirm={(sku) => {
          deleteMasterProduct(sku);
          showToast(
            `Produk ${productToArchive?.name} berhasil diarsipkan.`,
            "SUCCESS",
          );
          setProductToArchive(null);
        }}
      />

      <DeleteCategoryModal
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={(id) => {
          deleteMasterCategory(id);
          setCategoryToDelete(null);
        }}
      />
    </>
  );
};
