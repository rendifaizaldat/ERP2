import { useState, useEffect } from "react";
import { fetchKatalog, getCachedKatalog, saveKatalogCache } from "../service";
import type { WmsDatabase } from "../database/rx-db";

export interface GlobalCategory {
  id: string;
  name: string;
  status?: "ACTIVE" | "ARCHIVED";
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalProduct {
  id: string;
  categoryId: string;
  name: string;
  baseUom: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface Region {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  companyId: string;
  regionId: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

export interface RegionalItem {
  id: string;
  regionId: string;
  branchId: string | null;
  globalId: string | null;
  localName: string;
  localCategory?: string;
  uom: string;
  purchasePrice: number;
  margin: number;
  sellingPrice: number;
  mergeStatus: "UNMERGED" | "MERGED";
  status: "ACTIVE" | "ARCHIVED";
}

export interface Vendor {
  id: string;
  regionId: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  certifications: string[];
  contractFileUrl: string;
  isActive: boolean;
}

export function useKatalog(db: WmsDatabase | null, isInitialized: boolean) {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [masterProducts, setMasterProducts] = useState<GlobalProduct[]>([]);
  const [outletProducts, setOutletProducts] = useState<RegionalItem[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [uomOptions, setUomOptions] = useState<string[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    if (!db) return;
    const subs: any[] = [];

    if (db.wms_vendors) {
      subs.push(
        db.wms_vendors.find().$.subscribe((docs) => {
          setVendors(docs.map((d) => d.toJSON() as Vendor));
        }),
      );
    }
    if (db.wms_global_products) {
      subs.push(
        db.wms_global_products.find().$.subscribe((docs) => {
          setMasterProducts(docs.map((d) => d.toJSON() as GlobalProduct));
        }),
      );
    }
    if (db.wms_regional_items) {
      subs.push(
        db.wms_regional_items.find().$.subscribe((docs) => {
          setOutletProducts(docs.map((d) => d.toJSON() as RegionalItem));
        }),
      );
    }
    if (db.wms_categories) {
      subs.push(
        db.wms_categories.find().$.subscribe((docs) => {
          setCategories(docs.map((d) => d.toJSON() as GlobalCategory));
        }),
      );
    }

    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [db]);

  useEffect(() => {
    if (!isInitialized || !db) return;

    const loadKatalog = async () => {
      try {
        const data = await fetchKatalog();

        saveKatalogCache(data);

        if (data.vendors && data.vendors.length) {
          for (let i = 0; i < data.vendors.length; i++) {
            const vendor = data.vendors[i];
            try {
              await db.wms_vendors.upsert(vendor);
            } catch (err) {}
          }
        }

        if (data.globalProducts && data.globalProducts.length) {
          for (let i = 0; i < data.globalProducts.length; i++) {
            const prod = data.globalProducts[i];
            try {
              await db.wms_global_products.upsert(prod);
            } catch (err) {}
          }
        }

        if (data.regionalItems && data.regionalItems.length) {
          for (let i = 0; i < data.regionalItems.length; i++) {
            const item = data.regionalItems[i];
            try {
              await db.wms_regional_items.upsert(item);
            } catch (err) {}
          }
        }

        if (data.categories && data.categories.length) {
          for (let i = 0; i < data.categories.length; i++) {
            const cat = data.categories[i];
            try {
              await db.wms_categories.upsert(cat);
            } catch (err) {}
          }
        }

        setRegions(data.regions || []);
        setBranches(data.branches || []);
        setUomOptions(data.metadata?.uomOptions || []);
      } catch (error) {
        const cached = getCachedKatalog();
        if (cached) {
          setRegions(cached.regions || []);
          setBranches(cached.branches || []);
          setUomOptions(cached.metadata?.uomOptions || []);
        }
      }
    };
    loadKatalog();
  }, [isInitialized, db]);

  return {
    categories,
    masterProducts,
    outletProducts,
    regions,
    branches,
    uomOptions,
    vendors,
  };
}
