import { API_BASE_URL, STORAGE_KEYS } from "./constants";
import { mapPiutangData, mapHutangData } from "./utils";
import type {
  GlobalCategory,
  GlobalProduct,
  RegionalItem,
  Region,
  Branch,
  Vendor,
  PiutangPusatData,
  AccountPayableData,
  OutletBalance,
} from "./WmsProvider";

interface KatalogResponse {
  categories: GlobalCategory[];
  globalProducts: GlobalProduct[];
  regionalItems: RegionalItem[];
  regions: Region[];
  branches: Branch[];
  vendors: Vendor[];
  metadata?: {
    uomOptions: string[];
  };
}

export const fetchKatalog = async (): Promise<KatalogResponse> => {
  const res = await fetch(`${API_BASE_URL}/katalog`);
  if (!res.ok) throw new Error(`HTTP_FETCH_ERROR: ${res.status}`);
  return res.json();
};

export const getCachedKatalog = (): KatalogResponse | null => {
  const cached = localStorage.getItem(STORAGE_KEYS.CACHE_KATALOG);
  return cached ? JSON.parse(cached) : null;
};

export const saveKatalogCache = (data: KatalogResponse) => {
  localStorage.setItem(STORAGE_KEYS.CACHE_KATALOG, JSON.stringify(data));
};

export const executeMutation = async (
  url: string,
  method: string,
  body?: any,
): Promise<any> => {
  console.log(`[MUTATION] Executing: ${method} ${url}`, body);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const rawText = await res.text();
      let errorText = rawText;
      try {
        const parsed = JSON.parse(rawText);
        errorText = JSON.stringify(parsed);
      } catch {}
      console.error(
        `[MUTATION_ERROR] ${method} ${url} -> Status ${res.status}, Response: ${errorText}`,
      );
      throw new Error(`SERVER_ERROR: ${res.status} - ${errorText}`);
    }

    const rawResponse = await res.text();
    let parsedResponse = {};
    try {
      if (rawResponse) parsedResponse = JSON.parse(rawResponse);
    } catch {}

    console.log(`[MUTATION_SUCCESS] ${method} ${url} -> OK`);
    return parsedResponse;
  } catch (error) {
    console.warn(
      `[NETWORK_ERROR] Request ke ${url} gagal. Menunggu Sync Worker untuk retry. Error:`,
      error,
    );
    throw error;
  }
};

export const fetchPiutangData = async (
  regionId: string,
): Promise<PiutangPusatData[]> => {
  const res = await fetch(`${API_BASE_URL}/piutang/${regionId}`);
  if (!res.ok) throw new Error(`Failed to fetch piutang: ${res.status}`);
  const rawData = await res.json();
  return mapPiutangData(rawData);
};

export const fetchHutangData = async (
  regionId: string,
): Promise<AccountPayableData[]> => {
  const res = await fetch(`${API_BASE_URL}/hutang/${regionId}`);
  if (!res.ok) throw new Error(`Failed to fetch hutang: ${res.status}`);
  const rawData = await res.json();
  return mapHutangData(rawData);
};

export const fetchOutletBalancesData = async (): Promise<OutletBalance[]> => {
  const res = await fetch(`${API_BASE_URL}/piutang/ledger/balances`);
  if (!res.ok) throw new Error(`Failed to fetch balances: ${res.status}`);
  const rawData = await res.json();
  return rawData.map((d: any) => ({
    outletId: d.outletId,
    balance: Number(d.balance || 0),
  }));
};

// --- E-WALLET API SERVICES ---
// Diubah menjadi flat object sesuai standar response master produk
export interface EWalletSyncResponse {
  accounts: any[];
  configs: any[];
  ledgers: any[];
}

export const fetchEWalletSync = async (
  deviceToken?: string | null,
): Promise<EWalletSyncResponse> => {
  const headers: HeadersInit = {};
  if (deviceToken) headers["Authorization"] = `Bearer ${deviceToken}`;
  const targetUrl = API_BASE_URL.includes("/write")
    ? API_BASE_URL.replace("/write", "/ewallet/sync")
    : `${API_BASE_URL}/ewallet/sync`;

  const res = await fetch(targetUrl, { headers });
  if (!res.ok) throw new Error(`HTTP_FETCH_ERROR: ${res.status}`);
  return res.json();
};

export const getCachedEWallet = (): EWalletSyncResponse | null => {
  const cached = localStorage.getItem("CACHE_EWALLET_DATA");
  return cached ? JSON.parse(cached) : null;
};

export const saveEWalletCache = (data: EWalletSyncResponse) => {
  localStorage.setItem("CACHE_EWALLET_DATA", JSON.stringify(data));
};
