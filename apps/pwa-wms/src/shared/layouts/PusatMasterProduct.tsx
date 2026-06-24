import React, { useState, useMemo, useRef } from "react";
import { useWms } from "../../core/WmsProvider";
import { useToast } from "../components/Toast";
import { publishEvent, publishEventsBulk } from "../../core/event-publisher";
import { generateDeterministicId } from "../../core/utils";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Tag,
  Trash2,
  Pencil,
  Search,
  ArchiveRestore,
  Import,
  Download,
  Box,
  Save,
  PackageCheck,
  XCircle,
  TrendingUp,
  AlertTriangle,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  X,
  LineChart,
  History,
  Store,
} from "lucide-react";

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num || 0);

export const SharedMasterProduct: React.FC = () => {
  const {
    wmsState,
    categories,
    masterProducts,
    outletProducts,
    uomOptions,
    receivings,
  } = useWms();

  const { showToast } = useToast();

  const isPusat = wmsState?.wmsType === "PUSAT";
  const resolvedBranchId = isPusat ? null : wmsState?.branchId || null;

  // ========== STATE ASLI (KATEGORI & PRODUK) ==========
  const [catName, setCatName] = useState("");
  const [activeCatTab, setActiveCatTab] = useState<"ACTIVE" | "ARCHIVED">(
    "ACTIVE",
  );

  const [isEditing, setIsEditing] = useState(false);
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodUnit, setProdUnit] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodMargin, setProdMargin] = useState<string>("0");
  const [prodSellingPrice, setProdSellingPrice] = useState<string>("0");

  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, "ACTIVE" | "ARCHIVED">
  >({});

  const [itemToDelete, setItemToDelete] = useState<{
    type: "CATEGORY" | "PRODUCT";
    data: any;
  } | null>(null);

  // ========== STATE UNTUK IMPORT/EXPORT (TAMBAHAN) ==========
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAction, setImportAction] = useState<"SKIP" | "OVERWRITE">(
    "SKIP",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========== STATE ANALYTICS ==========
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(
    null,
  );

  // ========== FUNGSI ASLI (TIDAK DIUBAH) ==========
  const activeCategories = useMemo(
    () => categories.filter((c: any) => c.status !== "ARCHIVED"),
    [categories],
  );
  const archivedCategories = useMemo(
    () => categories.filter((c: any) => c.status === "ARCHIVED"),
    [categories],
  );
  const displayCategories =
    activeCatTab === "ACTIVE" ? activeCategories : archivedCategories;

  const handlePriceChange = (val: string) => {
    setProdPrice(val);
    const basePrice = Number(val) || 0;
    const margin = Number(prodMargin) || 0;
    setProdSellingPrice((basePrice + (basePrice * margin) / 100).toString());
  };

  const handleMarginChange = (val: string) => {
    setProdMargin(val);
    const basePrice = Number(prodPrice) || 0;
    const margin = Number(val) || 0;
    setProdSellingPrice((basePrice + (basePrice * margin) / 100).toString());
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim())
      return showToast("Nama kategori tidak boleh kosong!", "ERROR");
    const newCatId = generateDeterministicId("CAT", catName);
    const newCat = {
      id: newCatId,
      name: catName.toUpperCase(),
      status: "ACTIVE",
    };
    try {
      await publishEvent("CATEGORY_CREATED", newCatId, newCat);
      setCatName("");
      showToast("Perintah tambah kategori masuk antrean!", "SUCCESS");
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal (RxDB).", "ERROR");
    }
  };

  const resetForm = () => {
    setProdSku("");
    setProdName("");
    setProdUnit("");
    setProdPrice("");
    setProdCatId("");
    setProdMargin("0");
    setProdSellingPrice("0");
    setIsEditing(false);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const currentItem = outletProducts.find((o) => o.id === prodSku);
        await publishEvent("OUTLET_PRODUCT_UPDATED", prodSku, {
          id: prodSku,
          localName: prodName.toUpperCase(),
          purchasePrice: Number(prodPrice),
          margin: Number(prodMargin),
          sellingPrice: Number(prodSellingPrice),
          status: currentItem?.status || "ACTIVE",
          branchId: currentItem?.branchId,
        });
        showToast("Perintah ubah harga lokal masuk antrean!", "SUCCESS");
        resetForm();
        return;
      }

      if (!prodName || !prodUnit || !prodPrice || !prodCatId) {
        return showToast("Semua field master produk wajib diisi!", "ERROR");
      }
      const masterId = generateDeterministicId("PROD", prodName);
      await publishEvent("MASTER_PRODUCT_ADDED", masterId, {
        name: prodName.toUpperCase(),
        baseUom: prodUnit.toUpperCase(),
        categoryId: prodCatId,
        price: Number(prodPrice),
        margin: Number(prodMargin),
        sellingPrice: Number(prodSellingPrice),
        branchId: resolvedBranchId,
      });

      showToast(
        isPusat
          ? "Master produk berhasil ditambahkan!"
          : "Produk lokal berhasil ditambahkan!",
        "SUCCESS",
      );
      resetForm();
    } catch (error) {
      showToast("Gagal menyimpan perintah ke database lokal.", "ERROR");
    }
  };

  const handleEditClick = (p: any) => {
    setProdSku(p.sku);
    setProdName(p.localName);
    setProdUnit(p.unit);
    setProdPrice((p.price || 0).toString());
    setProdCatId(p.categoryId || "");
    setProdMargin(p.margin ? p.margin.toString() : "0");
    setProdSellingPrice(
      p.sellingPrice ? p.sellingPrice.toString() : (p.price || 0).toString(),
    );
    setIsEditing(true);
    showToast("Mode Edit Harga Lokal Diaktifkan.", "INFO");
  };

  const allProductsWithStatus = useMemo(() => {
    return outletProducts
      .filter((o) => {
        if (o.regionId !== wmsState?.regionId) return false;
        if (isPusat) {
          return o.branchId === null;
        } else {
          return o.branchId === null || o.branchId === wmsState?.branchId;
        }
      })
      .map((o) => ({
        ...o,
        effectiveStatus: statusOverrides[o.id] || o.status,
      }));
  }, [outletProducts, statusOverrides, wmsState, isPusat]);

  const activeCount = allProductsWithStatus.filter(
    (p) => p.effectiveStatus === "ACTIVE",
  ).length;
  const archivedCount = allProductsWithStatus.filter(
    (p) => p.effectiveStatus === "ARCHIVED",
  ).length;

  const displayProducts = useMemo(() => {
    const baseData = allProductsWithStatus.map((o) => {
      let displayName = o.localName;
      let displayUom = o.uom;
      let displayCat = o.localCategory || "";
      let isVerified = o.mergeStatus === "MERGED";

      if (isVerified && o.globalId) {
        const globalMaster = masterProducts.find((m) => m.id === o.globalId);
        if (globalMaster) {
          displayName = globalMaster.name;
          displayUom = globalMaster.baseUom;
          displayCat = globalMaster.categoryId;
        }
      }

      return {
        sku: o.id,
        globalId: o.globalId,
        localName: o.localName,
        name: displayName,
        unit: displayUom,
        categoryId: displayCat,
        price: o.purchasePrice,
        margin: o.margin,
        sellingPrice: o.sellingPrice,
        isVerified,
        isActive: o.effectiveStatus === "ACTIVE",
        isArchived: o.effectiveStatus === "ARCHIVED",
        branchId: o.branchId,
      };
    });

    return baseData.filter((p) => {
      const matchesTab =
        activeTab === "ARCHIVED" ? p.isArchived : !p.isArchived;
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.localName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allProductsWithStatus, masterProducts, activeTab, searchTerm]);

  const actualPriceHistory = useMemo(() => {
    if (!selectedHistoryItem || !receivings) return [];
    const history: any[] = [];
    receivings.forEach((r) => {
      if (r.status === "CANCELLED") return;
      const matchedItem = r.items?.find(
        (i: any) => i.regionalItemId === selectedHistoryItem.sku,
      );
      if (matchedItem) {
        history.push({
          date: r.receivedAt,
          source: r.sourceEntity,
          price: matchedItem.price,
          qty: matchedItem.qty,
          uom: matchedItem.uom,
          type: r.transactionType,
        });
      }
    });
    return history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedHistoryItem, receivings]);

  // ========== FUNGSI DOWNLOAD TEMPLATE (PINTAR DENGAN DROPDOWN) ==========
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");
      const lookupSheet = workbook.addWorksheet("Lookup");

      // Data lookup
      const activeCats = categories.filter((c: any) => c.status !== "ARCHIVED");
      const catNames = activeCats.map((c: any) => c.name);
      const uomList = uomOptions;

      // Isi sheet Lookup
      lookupSheet.addRow(["Kategori"]);
      catNames.forEach((name) => lookupSheet.addRow([name]));
      lookupSheet.addRow([]); // separator
      lookupSheet.addRow(["UOM"]);
      uomList.forEach((uom) => lookupSheet.addRow([uom]));

      // Tentukan range dinamis
      const catStartRow = 2;
      const catEndRow = catStartRow + catNames.length - 1;
      const uomStartRow = catStartRow + catNames.length + 2; // setelah separator dan header UOM
      const uomEndRow = uomStartRow + uomList.length - 1;

      // Sembunyikan sheet Lookup (tidak veryHidden, cukup hidden agar referensi tetap valid)
      lookupSheet.state = "hidden";

      // Kolom berdasarkan tipe pusat/outlet
      const isPusatMode = wmsState?.wmsType === "PUSAT";
      const columns = isPusatMode
        ? [
            { header: "SKU (kosong untuk baru)", key: "sku", width: 25 },
            { header: "Nama Produk *", key: "name", width: 30 },
            { header: "Kategori *", key: "category", width: 20 },
            { header: "UOM *", key: "uom", width: 10 },
            { header: "Harga Standard (Rp) *", key: "price", width: 20 },
            { header: "Margin (%)", key: "margin", width: 15 },
          ]
        : [
            { header: "SKU (kosong untuk baru)", key: "sku", width: 25 },
            { header: "Nama Produk *", key: "name", width: 30 },
            { header: "Kategori *", key: "category", width: 20 },
            { header: "UOM *", key: "uom", width: 10 },
            { header: "Harga Standard (Rp) *", key: "price", width: 20 },
          ];

      worksheet.columns = columns;

      // Baris contoh
      const exampleRow: any = {
        sku: "",
        name: "CONTOH PRODUK",
        category: catNames[0] || "Sayuran",
        uom: uomList[0] || "KG",
        price: 10000,
      };
      if (isPusatMode) exampleRow.margin = 10;
      worksheet.addRow(exampleRow);

      // Referensi range
      const catRange = `Lookup!$A$${catStartRow}:$A$${catEndRow}`;
      const uomRange = `Lookup!$A$${uomStartRow}:$A$${uomEndRow}`;

      // Terapkan data validation untuk baris 2..100
      for (let i = 2; i <= 100; i++) {
        // Kategori (kolom C)
        worksheet.getCell(i, 3).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [catRange],
          showErrorMessage: true,
          errorTitle: "Kategori tidak valid",
          error: "Pilih kategori dari daftar.",
        };
        // UOM (kolom D)
        worksheet.getCell(i, 4).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [uomRange],
          showErrorMessage: true,
          errorTitle: "UOM tidak valid",
          error: "Pilih UOM dari daftar.",
        };
      }

      // Styling header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `template_produk_${wmsState?.wmsType?.toLowerCase() || "outlet"}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Template berhasil diunduh", "SUCCESS");
    } catch (error) {
      console.error(error);
      showToast("Gagal membuat template", "ERROR");
    }
  };

  // ========== FUNGSI IMPORT DENGAN BULK EVENT ==========
  const handleImport = async () => {
    if (!importFile) {
      showToast("Pilih file Excel terlebih dahulu", "ERROR");
      return;
    }

    try {
      const buffer = await importFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet("Data");
      if (!worksheet) throw new Error("Sheet 'Data' tidak ditemukan");

      const events: any[] = [];
      const errors: { row: number; message: string }[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const sku = row.getCell(1).value?.toString()?.trim() || "";
        const name = row.getCell(2).value?.toString()?.trim();
        const categoryName = row.getCell(3).value?.toString()?.trim();
        const uom = row.getCell(4).value?.toString()?.trim();
        const price = Number(row.getCell(5).value);
        let margin = 0;
        if (wmsState?.wmsType === "PUSAT") {
          margin = Number(row.getCell(6).value) || 0;
        }

        if (!name || !categoryName || !uom || isNaN(price) || price <= 0) {
          errors.push({
            row: rowNumber,
            message: "Data tidak lengkap atau harga invalid",
          });
          return;
        }

        const cat = categories.find(
          (c: any) => c.name === categoryName && c.status !== "ARCHIVED",
        );
        if (!cat) {
          errors.push({
            row: rowNumber,
            message: `Kategori "${categoryName}" tidak ditemukan`,
          });
          return;
        }
        if (!uomOptions.includes(uom)) {
          errors.push({
            row: rowNumber,
            message: `UOM "${uom}" tidak dikenal`,
          });
          return;
        }

        // Cek existing product berdasarkan SKU
        let existing = null;
        if (sku) {
          existing = outletProducts.find((p: any) => p.id === sku);
          if (existing) {
            const isMyProduct = isPusat
              ? existing.branchId === null
              : existing.branchId === wmsState?.branchId ||
                existing.branchId === null;
            if (!isMyProduct) {
              errors.push({
                row: rowNumber,
                message: "SKU milik cabang lain, tidak bisa diupdate",
              });
              return;
            }
          }
        }

        const sellingPrice =
          wmsState?.wmsType === "PUSAT"
            ? Math.round(price + (price * margin) / 100)
            : price;

        if (existing && importAction === "OVERWRITE") {
          events.push({
            type: "OUTLET_PRODUCT_UPDATED",
            aggregateId: sku,
            payload: {
              id: sku,
              localName: name.toUpperCase(),
              purchasePrice: price,
              margin:
                wmsState?.wmsType === "PUSAT" ? margin : existing.margin || 0,
              sellingPrice: sellingPrice,
              status: existing.status || "ACTIVE",
              branchId: existing.branchId,
            },
          });
        } else if (!existing) {
          const newId = crypto.randomUUID();
          events.push({
            type: "MASTER_PRODUCT_ADDED",
            aggregateId: newId,
            payload: {
              name: name.toUpperCase(),
              baseUom: uom.toUpperCase(),
              categoryId: cat.id,
              price: price,
              margin: wmsState?.wmsType === "PUSAT" ? margin : 0,
              sellingPrice: sellingPrice,
              branchId: isPusat ? null : wmsState?.branchId,
            },
          });
        }
        // Jika existing dan SKIP -> tidak ditambahkan
      });

      if (errors.length > 0) {
        showToast(
          `Terdapat ${errors.length} error pada baris: ${errors.map((e) => e.row).join(", ")}`,
          "ERROR",
        );
        return;
      }

      if (events.length === 0) {
        showToast(
          "Tidak ada data yang perlu diimport (semua sudah ada dan dipilih SKIP)",
          "INFO",
        );
        return;
      }

      await publishEventsBulk(events);
      showToast(
        `Berhasil mengantrikan ${events.length} produk untuk diimport`,
        "SUCCESS",
      );
      setIsImportModalOpen(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      showToast(`Import gagal: ${error.message}`, "ERROR");
    }
  };

  // ========== FUNGSI EXPORT KE EXCEL ==========
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Master Produk");
      const isPusatMode = wmsState?.wmsType === "PUSAT";

      const columns = isPusatMode
        ? [
            { header: "SKU", key: "sku", width: 25 },
            { header: "Nama Produk", key: "name", width: 35 },
            { header: "Kategori", key: "category", width: 20 },
            { header: "UOM", key: "uom", width: 10 },
            { header: "Harga Standard (Rp)", key: "price", width: 20 },
            { header: "Margin (%)", key: "margin", width: 15 },
            { header: "Harga Jual (Rp)", key: "sellingPrice", width: 20 },
            { header: "Status", key: "status", width: 12 },
          ]
        : [
            { header: "SKU", key: "sku", width: 25 },
            { header: "Nama Produk", key: "name", width: 35 },
            { header: "Kategori", key: "category", width: 20 },
            { header: "UOM", key: "uom", width: 10 },
            { header: "Harga (HPP) (Rp)", key: "price", width: 20 },
            { header: "Status", key: "status", width: 12 },
          ];

      worksheet.columns = columns;

      const dataToExport = displayProducts.map((p) => {
        const catObj = categories.find((c: any) => c.id === p.categoryId);
        const base = {
          sku: p.sku,
          name: p.name,
          category: catObj?.name || "",
          uom: p.unit,
          price: p.price,
          status: p.isArchived ? "ARCHIVED" : "ACTIVE",
        };
        if (isPusatMode) {
          return {
            ...base,
            margin: p.margin || 0,
            sellingPrice: p.sellingPrice || p.price,
          };
        }
        return base;
      });

      dataToExport.forEach((row) => worksheet.addRow(row));

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F81BD" },
      };
      headerRow.eachCell((cell) => {
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      });

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `master_produk_${new Date().toISOString().slice(0, 19)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Export Excel berhasil", "SUCCESS");
      setIsExportModalOpen(false);
    } catch (error) {
      showToast("Gagal export Excel", "ERROR");
    }
  };

  // ========== FUNGSI EXPORT KE PDF ==========
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const isPusatMode = wmsState?.wmsType === "PUSAT";

      const headers = isPusatMode
        ? [
            "SKU",
            "Nama Produk",
            "Kategori",
            "UOM",
            "Harga (Rp)",
            "Margin (%)",
            "Harga Jual (Rp)",
            "Status",
          ]
        : ["SKU", "Nama Produk", "Kategori", "UOM", "Harga (Rp)", "Status"];

      const data = displayProducts.map((p) => {
        const catObj = categories.find((c: any) => c.id === p.categoryId);
        const row = [
          p.sku,
          p.name,
          catObj?.name || "",
          p.unit,
          formatRupiah(p.price),
          p.isArchived ? "Arsip" : "Aktif",
        ];
        if (isPusatMode) {
          row.splice(
            5,
            0,
            (p.margin || 0).toString(),
            formatRupiah(p.sellingPrice || p.price),
          );
        }
        return row;
      });

      doc.text("DAFTAR MASTER PRODUK", 14, 15);
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 25,
        theme: "striped",
        headStyles: { fillColor: [79, 129, 189], textColor: [255, 255, 255] },
        margin: { top: 20 },
      });
      doc.save(`master_produk_${new Date().toISOString().slice(0, 19)}.pdf`);
      showToast("Export PDF berhasil", "SUCCESS");
      setIsExportModalOpen(false);
    } catch (error) {
      showToast("Gagal export PDF", "ERROR");
    }
  };

  // ========== MODAL IMPORT ==========
  const ImportModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-sky-600 p-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <UploadCloud size={20} />
            <h3 className="font-black text-sm uppercase tracking-widest">
              Import Produk
            </h3>
          </div>
          <button
            onClick={() => setIsImportModalOpen(false)}
            className="p-2 hover:bg-white/20 rounded-full"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">Format file: .xlsx</p>
            <button
              onClick={downloadTemplate}
              className="text-sky-600 text-xs font-bold underline flex items-center gap-1 mx-auto"
            >
              <FileSpreadsheet size={14} /> Download Template Excel
            </button>
          </div>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-sky-300 transition-colors">
            <input
              type="file"
              accept=".xlsx"
              ref={fileInputRef}
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <UploadCloud size={32} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600">
                {importFile ? importFile.name : "Klik atau tarik file Excel"}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">
              Jika SKU sudah ada:
            </span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="SKIP"
                checked={importAction === "SKIP"}
                onChange={() => setImportAction("SKIP")}
              />
              <span className="text-xs">Lewati</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="OVERWRITE"
                checked={importAction === "OVERWRITE"}
                onChange={() => setImportAction("OVERWRITE")}
              />
              <span className="text-xs">Timpa</span>
            </label>
          </div>
          <button
            onClick={handleImport}
            disabled={!importFile}
            className="w-full py-3 bg-sky-600 disabled:bg-slate-300 text-white rounded-xl font-black text-xs uppercase tracking-widest"
          >
            Import Sekarang
          </button>
        </div>
      </div>
    </div>
  );

  // ========== MODAL EXPORT ==========
  const ExportModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 p-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Download size={20} />
            <h3 className="font-black text-sm uppercase tracking-widest">
              Export Data
            </h3>
          </div>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="p-2 hover:bg-white/20 rounded-full"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 text-center">
            Export data yang sedang ditampilkan ({displayProducts.length}{" "}
            produk)
          </p>
          <button
            onClick={exportToExcel}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={16} /> Export ke Excel
          </button>
          <button
            onClick={exportToPDF}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FileText size={16} /> Export ke PDF
          </button>
        </div>
      </div>
    </div>
  );

  // ========== RENDER JSX ==========
  return (
    <div className="space-y-6 pb-10 animate-fade relative">
      {/* HEADER dengan tombol import/export */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Box className="text-sky-600" />
              Master Produk & Kategori {isPusat ? "(Pusat)" : "(Outlet)"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isPusat
                ? "Pusat pengaturan database baku, harga sentral, dan persentase harga jual."
                : "Katalog produk yang tersedia. Tambahkan produk lokal jika belum ada di database sentral."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl transition-colors"
              title="Import Data"
            >
              <UploadCloud size={18} />
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors"
              title="Export Data"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA (KATEGORI & PRODUK) - TIDAK BERUBAH DARI KODE ASLI */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Sisi Kiri: Kategori & Form Produk */}
        <div className="xl:col-span-1 space-y-6">
          {/* A. SETUP KATEGORI */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 border-b-2 border-sky-100 pb-2 mb-4">
              <Tag className="text-sky-600" size={16} />
              <span className="font-black text-xs uppercase tracking-widest text-sky-600">
                A. Setup Kategori
              </span>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Contoh: SAYURAN..."
                className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-black text-xs uppercase transition-all"
              >
                + Add
              </button>
            </form>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
              <button
                onClick={() => setActiveCatTab("ACTIVE")}
                className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeCatTab === "ACTIVE" ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Aktif ({activeCategories.length})
              </button>
              <button
                onClick={() => setActiveCatTab("ARCHIVED")}
                className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeCatTab === "ARCHIVED" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Arsip ({archivedCategories.length})
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl bg-slate-50 divide-y max-h-40 overflow-y-auto custom-scrollbar">
              {displayCategories.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-[10px] font-bold uppercase">
                  Tidak ada kategori di tab ini
                </div>
              ) : (
                displayCategories.map((cat: any) => (
                  <div
                    key={cat.id}
                    className="px-3 py-2 flex justify-between items-center group hover:bg-white transition-colors"
                  >
                    <span
                      className={`font-black text-xs uppercase ${cat.status === "ARCHIVED" ? "text-slate-400 line-through" : "text-slate-700"}`}
                    >
                      {cat.name}
                    </span>
                    {activeCatTab === "ACTIVE" ? (
                      <button
                        onClick={() =>
                          setItemToDelete({ type: "CATEGORY", data: cat })
                        }
                        className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await publishEvent("CATEGORY_UPDATED", cat.id, {
                            ...cat,
                            status: "ACTIVE",
                          });
                          showToast(
                            "Perintah restore masuk antrean.",
                            "SUCCESS",
                          );
                        }}
                        className="text-slate-300 hover:text-emerald-500 p-1 hover:bg-emerald-50 rounded-lg"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* B. TAMBAH MASTER BARU */}
          <div
            className={`bg-white border-2 p-5 rounded-2xl shadow-sm transition-all ${isEditing ? "border-amber-400" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Pencil
                  className={isEditing ? "text-amber-500" : "text-sky-600"}
                  size={16}
                />
                <span
                  className={`font-black text-xs uppercase tracking-widest ${isEditing ? "text-amber-600" : "text-sky-600"}`}
                >
                  {isEditing ? "Mode Edit Barang" : "B. Tambah Produk"}
                </span>
              </div>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Nama Barang *
                </label>
                <input
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="BAWANG PUTIH..."
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Kategori *
                  </label>
                  <select
                    required
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- PILIH --</option>
                    {activeCategories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    UOM Lokal *
                  </label>
                  <select
                    required
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                  >
                    <option value="" disabled>
                      -- UOM --
                    </option>
                    {uomOptions.map((uom) => (
                      <option key={uom} value={uom}>
                        {uom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Harga Standard / HPP (Rp) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={prodPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              {isPusat && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl mt-4 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-sky-200 pb-2">
                    <TrendingUp size={14} className="text-sky-600" />
                    <span className="font-black text-[10px] uppercase tracking-widest text-sky-700">
                      Kalkulasi Harga Jual
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-sky-600 uppercase tracking-widest block mb-1">
                        Up Margin (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prodMargin}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs font-black text-sky-700 outline-none focus:border-sky-500"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[0, 5, 7, 10, 15].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMarginChange(m.toString())}
                            className="px-1.5 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded text-[9px] font-black transition-colors cursor-pointer"
                          >
                            {m}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-sky-600 uppercase tracking-widest block mb-1">
                        Harga Jual (Rp)
                      </label>
                      <input
                        disabled
                        type="text"
                        value={formatRupiah(Number(prodSellingPrice))}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 mt-4 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-sky-600 hover:bg-sky-700"}`}
              >
                <Save size={16} />{" "}
                {isEditing ? "Update Data" : "Simpan & Gunakan"}
              </button>
            </form>
          </div>
        </div>

        {/* SISI KANAN: TABEL PRODUK */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[600px]">
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="text-sky-600" size={20} />
                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">
                  Katalog Produk Tersedia
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex bg-slate-100 p-1.5 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "ACTIVE" ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Aktif ({activeCount})
                </button>
                <button
                  onClick={() => setActiveTab("ARCHIVED")}
                  className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "ARCHIVED" ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Arsip ({archivedCount})
                </button>
              </div>

              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Cari nama baku / SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Item (Display Standar)</th>
                  <th className="px-5 py-4">Kategori & UOM</th>
                  <th className="px-5 py-4 text-right">Harga Sentral</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <Box size={40} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tidak ada data ditemukan.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayProducts.map((p) => {
                    const catObj = categories.find(
                      (c) => c.id === p.categoryId,
                    );
                    const isMyOwnProduct = isPusat
                      ? p.branchId === null
                      : p.branchId === wmsState?.branchId;

                    return (
                      <tr
                        key={p.sku}
                        className={`hover:bg-slate-50/50 transition-colors ${!p.isActive && !p.isArchived ? "bg-slate-50 opacity-80" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {p.branchId !== null && (
                              <span
                                className="bg-emerald-100 text-emerald-700 p-1 rounded"
                                title="Produk Lokal Cabang"
                              >
                                <Store size={12} />
                              </span>
                            )}
                            <div>
                              <p
                                className={`font-black uppercase text-xs ${p.isArchived ? "text-slate-400 line-through" : "text-slate-800"}`}
                              >
                                {p.name}
                              </p>
                              {isPusat &&
                                (p.isVerified ? (
                                  <p className="text-[9px] font-bold text-sky-500 uppercase mt-0.5">
                                    Global ID: {p.globalId}
                                  </p>
                                ) : (
                                  <p className="text-[9px] font-bold text-orange-500 uppercase mt-0.5 flex items-center gap-1">
                                    <AlertTriangle size={10} /> Pending Audit
                                  </p>
                                ))}
                              <p className="text-[8px] font-bold text-slate-400 font-mono mt-0.5">
                                ULID: {p.sku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">
                            Satuan: {p.unit}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            Kat: {catObj?.name || "N/A"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right relative group">
                          <div className="flex items-center justify-end gap-3">
                            <div>
                              <p className="font-black text-slate-700 text-sm">
                                {formatRupiah(p.price)}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                Jual: {formatRupiah(p.sellingPrice || p.price)}{" "}
                                ({p.margin || 0}%)
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedHistoryItem(p)}
                              className="p-2 bg-slate-100 hover:bg-sky-100 text-slate-400 hover:text-sky-600 rounded-full transition-colors"
                              title="Lihat Riwayat Harga Aktual"
                            >
                              <LineChart size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {activeTab === "ACTIVE" ? (
                            <div className="flex justify-center gap-1">
                              {isMyOwnProduct ? (
                                <>
                                  <button
                                    onClick={() => handleEditClick(p)}
                                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                    title="Edit Data"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setItemToDelete({
                                        type: "PRODUCT",
                                        data: p,
                                      })
                                    }
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Arsipkan"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                                  Read Only
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                setStatusOverrides((prev) => ({
                                  ...prev,
                                  [p.sku]: "ACTIVE",
                                }));
                                await publishEvent(
                                  "OUTLET_PRODUCT_UPDATED",
                                  p.sku,
                                  {
                                    id: p.sku,
                                    localName: p.localName,
                                    purchasePrice: p.price,
                                    margin: p.margin,
                                    sellingPrice: p.sellingPrice,
                                    status: "ACTIVE",
                                    branchId: p.branchId,
                                  },
                                );
                                showToast(
                                  "Perintah restore masuk antrean",
                                  "SUCCESS",
                                );
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all mx-auto"
                            >
                              <ArchiveRestore size={12} /> Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL ANALYTICS: RIWAYAT HARGA AKTUAL */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="bg-sky-600 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <LineChart size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest leading-none">
                    Riwayat Harga Aktual
                  </h3>
                  <p className="text-[10px] font-bold text-sky-100 mt-1 uppercase">
                    {selectedHistoryItem.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Harga Standard / HPP
                  </p>
                  <p className="text-xl font-black text-slate-800 tabular-nums">
                    {formatRupiah(selectedHistoryItem.price)}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    Pembelian Terakhir
                  </p>
                  <p className="text-xl font-black text-emerald-700 tabular-nums">
                    {actualPriceHistory.length > 0
                      ? formatRupiah(actualPriceHistory[0].price)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Tgl Transaksi</th>
                      <th className="px-4 py-3">Vendor / Sumber</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Harga Aktual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actualPriceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center">
                          <History
                            className="mx-auto text-slate-200 mb-2"
                            size={32}
                          />
                          <p className="text-xs font-bold text-slate-400">
                            Belum ada riwayat transaksi
                          </p>
                        </td>
                      </tr>
                    ) : (
                      actualPriceHistory.map((h, i) => {
                        const isHigher = h.price > selectedHistoryItem.price;
                        const isLower = h.price < selectedHistoryItem.price;
                        return (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-bold text-xs text-slate-700">
                              {new Date(h.date).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-black text-[10px] uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                {h.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-xs text-slate-600">
                              {h.qty} {h.uom}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p
                                className={`font-black text-sm ${isHigher ? "text-rose-600" : isLower ? "text-emerald-600" : "text-slate-700"}`}
                              >
                                {formatRupiah(h.price)}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI ARSIP */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-slide-up border border-slate-200">
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-2">
              Arsipkan Data?
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-6">
              Data ini akan dipindahkan ke tab Arsip dan tidak muncul di
              keranjang transaksi.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    if (itemToDelete.type === "CATEGORY") {
                      await publishEvent(
                        "CATEGORY_DELETED",
                        itemToDelete.data.id,
                        {
                          id: itemToDelete.data.id,
                        },
                      );
                    } else {
                      setStatusOverrides((prev) => ({
                        ...prev,
                        [itemToDelete.data.sku]: "ARCHIVED",
                      }));
                      await publishEvent(
                        "OUTLET_PRODUCT_UPDATED",
                        itemToDelete.data.sku,
                        {
                          ...itemToDelete.data,
                          status: "ARCHIVED",
                          branchId: itemToDelete.data.branchId,
                        },
                      );
                    }
                    setItemToDelete(null);
                    showToast("Data berhasil diarsipkan", "WARNING");
                  } catch (error) {
                    showToast("Gagal memproses arsip.", "ERROR");
                  }
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors"
              >
                Ya, Arsipkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT DAN EXPORT */}
      {isImportModalOpen && <ImportModal />}
      {isExportModalOpen && <ExportModal />}
    </div>
  );
};
