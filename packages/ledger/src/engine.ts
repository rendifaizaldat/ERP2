import { addRxPlugin, createRxDatabase, RxCollection, RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import {
  replicateCouchDB,
  RxCouchDBReplicationState,
} from "rxdb/plugins/replication-couchdb";
import CryptoJS from "crypto-js";
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, decodeUTF8 } from "tweetnacl-util";
import { EventSchema } from "./schema";
// ======================================================
// TYPES
// ======================================================
export interface LedgerEvent {
  id: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  hash: string;
  prev_hash: string;
  ts: number;
  logical: number;
  node: string;
  hlc: string;
  sig: string;
  pubkey: string;
  _rev?: string;
}
interface AsstroDatabaseCollections {
  events: RxCollection<LedgerEvent>;
}
// ======================================================
// GLOBAL WINDOW CACHE
// ======================================================
declare global {
  interface Window {
    __ASSTRO_LEDGER_DB__?: RxDatabase<AsstroDatabaseCollections>;
    __ASSTRO_LEDGER_INIT__?: Promise<RxDatabase<AsstroDatabaseCollections>>;
    __ASSTRO_LEDGER_ENGINE__?: LedgerEngine;
  }
}
// ======================================================
// GLOBAL FLAGS
// ======================================================
let devPluginLoaded = false;
// ======================================================
// HELPERS
// ======================================================
function isDevelopment(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === "development";
  }
  return false;
}
// ------------------------------------------------------
// Stable JSON Stringify
// Deterministic serialization for hashing/signing
// ------------------------------------------------------
function stableStringify(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}
function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortRecursively((value as Record<string, unknown>)[key]);
          return acc;
        },
        {} as Record<string, unknown>,
      );
  }
  return value;
}
// ------------------------------------------------------
// Safe Browser UUID
// ------------------------------------------------------
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}
// ======================================================
// LEDGER ENGINE
// ======================================================
export class LedgerEngine {
  // ====================================================
  // INTERNAL STATE
  // ====================================================
  private db!: RxDatabase<AsstroDatabaseCollections>;
  private initialized = false;
  private appendQueue: Promise<unknown> = Promise.resolve();
  private replicationState: RxCouchDBReplicationState<LedgerEvent> | null =
    null;
  // ====================================================
  // IDENTITY
  // ====================================================
  private keyPair!: nacl.SignKeyPair;
  private nodeId!: string;
  // ====================================================
  // HLC STATE
  // ====================================================
  private lastTs = 0;
  private logical = 0;
  // ====================================================
  // INIT
  // ====================================================
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    // -----------------------------------------------
    // Browser Runtime Check
    // -----------------------------------------------
    if (typeof window === "undefined") {
      throw new Error("LedgerEngine requires browser runtime");
    }
    // -----------------------------------------------
    // Identity
    // -----------------------------------------------
    await this.loadOrCreateIdentity();
    // -----------------------------------------------
    // Dev Plugin
    // -----------------------------------------------
    if (isDevelopment() && !devPluginLoaded) {
      addRxPlugin(RxDBDevModePlugin);
      devPluginLoaded = true;
    }
    // -----------------------------------------------
    // Existing DB
    // -----------------------------------------------
    if (window.__ASSTRO_LEDGER_DB__ && !window.__ASSTRO_LEDGER_DB__.closed) {
      this.db = window.__ASSTRO_LEDGER_DB__;
      this.initialized = true;
      return;
    }
    // -----------------------------------------------
    // Existing Init Promise
    // -----------------------------------------------
    if (window.__ASSTRO_LEDGER_INIT__) {
      this.db = await window.__ASSTRO_LEDGER_INIT__;
      window.__ASSTRO_LEDGER_ENGINE__ = this;
      this.initialized = true;
      return;
    }
    // -----------------------------------------------
    // Create DB Lock
    // -----------------------------------------------
    window.__ASSTRO_LEDGER_INIT__ = (async () => {
      try {
        const db = await createRxDatabase<AsstroDatabaseCollections>({
          name: "asstro_ledger",
          storage: getRxStorageDexie(),
          multiInstance: false,
        });
        await db.addCollections({
          events: {
            schema: EventSchema,
          },
        });
        window.__ASSTRO_LEDGER_DB__ = db;
        return db;
      } catch (err) {
        delete window.__ASSTRO_LEDGER_INIT__;
        throw err;
      }
    })();
    this.db = await window.__ASSTRO_LEDGER_INIT__;
    this.initialized = true;
  }
  // ====================================================
  // IDENTITY MANAGEMENT
  // ====================================================
  private async loadOrCreateIdentity(): Promise<void> {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    const STORAGE_KEY = "__asstro_ledger_identity__";

    const NODE_KEY = "__asstro_ledger_node__";

    // -----------------------------------------------
    // Node ID
    // -----------------------------------------------

    let nodeId = localStorage.getItem(NODE_KEY);

    if (!nodeId) {
      nodeId = generateId();
      localStorage.setItem(NODE_KEY, nodeId);
    }

    this.nodeId = nodeId;

    // -----------------------------------------------
    // Signing Key
    // -----------------------------------------------

    let secretKeyBase64 = localStorage.getItem(STORAGE_KEY);

    if (!secretKeyBase64) {
      const pair = nacl.sign.keyPair();

      secretKeyBase64 = encodeBase64(pair.secretKey);

      localStorage.setItem(STORAGE_KEY, secretKeyBase64);

      this.keyPair = pair;
    } else {
      this.keyPair = nacl.sign.keyPair.fromSecretKey(
        decodeBase64(secretKeyBase64),
      );
    }
  }

  async getPublicKey(): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }

    return encodeBase64(this.keyPair.publicKey);
  }

  // ====================================================
  // HLC
  // ====================================================

  private generateHLC(): {
    ts: number;
    logical: number;
    hlc: string;
  } {
    const now = Date.now();

    if (now > this.lastTs) {
      this.lastTs = now;
      this.logical = 0;
    } else {
      this.logical++;
    }

    return {
      ts: this.lastTs,

      logical: this.logical,

      hlc: `${this.lastTs}:${this.logical}:${this.nodeId}`,
    };
  }

  // ====================================================
  // HASH
  // ====================================================

  private generateHash(data: {
    seq: number;
    prev_hash: string;
    type: string;
    payload: Record<string, unknown>;
    metadata: Record<string, unknown>;
    hlc: string;
  }): string {
    const canonical = stableStringify({
      seq: data.seq,
      prev_hash: data.prev_hash,
      type: data.type,
      payload: data.payload,
      metadata: data.metadata,
      hlc: data.hlc,
    });
    return CryptoJS.SHA256(canonical).toString(CryptoJS.enc.Hex);
  }
  // ====================================================
  // APPEND EVENT
  // ====================================================
  async appendEvent(
    type: string,
    payload: Record<string, unknown>,
    metadata: Record<string, unknown> = {},
  ): Promise<LedgerEvent> {
    return (this.appendQueue = this.appendQueue.then(async () => {
      if (!this.initialized) {
        await this.init();
      }

      const lastEvent = await this.getLastEvent();

      const nextSeq = lastEvent ? lastEvent.seq + 1 : 1;

      const prevHash = lastEvent ? lastEvent.hash : "0";

      // -----------------------------------------
      // HLC
      // -----------------------------------------

      const { ts, logical, hlc } = this.generateHLC();

      // -----------------------------------------
      // Hash
      // -----------------------------------------

      const hash = this.generateHash({
        seq: nextSeq,

        prev_hash: prevHash,

        type,

        payload,

        metadata,

        hlc,
      });

      // -----------------------------------------
      // Signature
      // -----------------------------------------

      const signature = nacl.sign.detached(
        decodeUTF8(hash),
        this.keyPair.secretKey,
      );

      const sig = encodeBase64(signature);

      const pubkey = encodeBase64(this.keyPair.publicKey);

      // -----------------------------------------
      // Event
      // -----------------------------------------

      const eventEntry: LedgerEvent = {
        id: generateId(),

        seq: nextSeq,

        type,

        payload,

        metadata,

        hash,

        prev_hash: prevHash,

        ts,

        logical,

        node: this.nodeId,

        hlc,

        sig,

        pubkey,
      };

      // -----------------------------------------
      // Persist
      // -----------------------------------------

      await this.db.collections.events.insert(eventEntry);

      return eventEntry;
    })) as Promise<LedgerEvent>;
  }

  // ====================================================
  // LAST EVENT
  // ====================================================

  async getLastEvent(): Promise<LedgerEvent | null> {
    if (!this.initialized) {
      await this.init();
    }

    const doc = await this.db.collections.events
      .findOne({
        sort: [
          {
            seq: "desc",
          },
        ],
      })
      .exec();

    return doc ? (doc.toMutableJSON() as LedgerEvent) : null;
  }

  // ====================================================
  // REPLAY
  // ====================================================

  async replay(
    handler: (event: LedgerEvent) => void | Promise<void>,
  ): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const docs = await this.db.collections.events
      .find({
        sort: [
          {
            seq: "asc",
          },
        ],
      })
      .exec();

    for (const doc of docs) {
      await handler(doc.toMutableJSON() as LedgerEvent);
    }
  }

  // ====================================================
  // INTEGRITY VALIDATION
  // ====================================================

  async validateIntegrity(): Promise<{
    valid: boolean;

    checked: number;

    error?: string;
  }> {
    let previousHash = "0";

    let previousSeq = 0;

    let checked = 0;

    try {
      await this.replay((event) => {
        checked++;

        // ---------------------------------------
        // Sequence
        // ---------------------------------------

        if (event.seq !== previousSeq + 1) {
          throw new Error(`Sequence gap at ${event.seq}`);
        }

        // ---------------------------------------
        // Chain
        // ---------------------------------------

        if (event.prev_hash !== previousHash) {
          throw new Error(`Broken chain at ${event.seq}`);
        }

        // ---------------------------------------
        // Hash
        // ---------------------------------------

        const recalculatedHash = this.generateHash({
          seq: event.seq,

          prev_hash: event.prev_hash,

          type: event.type,

          payload: event.payload,

          metadata: event.metadata,

          hlc: event.hlc,
        });

        if (recalculatedHash !== event.hash) {
          throw new Error(`Hash mismatch at ${event.seq}`);
        }

        // ---------------------------------------
        // Signature
        // ---------------------------------------

        const validSignature = nacl.sign.detached.verify(
          decodeUTF8(event.hash),

          decodeBase64(event.sig),

          decodeBase64(event.pubkey),
        );

        if (!validSignature) {
          throw new Error(`Invalid signature at ${event.seq}`);
        }

        previousSeq = event.seq;

        previousHash = event.hash;
      });

      return {
        valid: true,
        checked,
      };
    } catch (err) {
      return {
        valid: false,

        checked,

        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  // ====================================================
  // START SYNC (TAMBAHAN BARU)
  // ====================================================
  async startSync() {
    if (!this.initialized) {
      await this.init();
    }

    // Pastikan URL diakhiri dengan '/' agar RxDB tidak salah melakukan resolusi path
    const COUCHDB_URL = "http://localhost:5984/asstro_ledger/";

    console.log("📡 Connecting to Central Command at:", COUCHDB_URL);

    // Hentikan state replikasi yang lama jika masih berjalan
    if (this.replicationState) {
      await this.replicationState.cancel();
    }

    this.replicationState = replicateCouchDB({
      // Identifier unik agar checkpoint sinkronisasi tidak tertukar antar device
      replicationIdentifier: `asstro-pos-sync-${this.nodeId}`,
      collection: this.db.collections.events,
      url: COUCHDB_URL,
      live: true,

      // Inject Basic Auth secara eksplisit ke setiap request fetch
      fetch: async (input: RequestInfo | URL, options: RequestInit = {}) => {
        const headers = new Headers(options.headers || {});

        // Inject Basic Auth
        headers.set("Authorization", "Basic " + btoa("admin:password"));

        // Teruskan input (bisa berupa string, Request, atau URL) secara transparan
        return window.fetch(input, {
          ...options,
          headers,
        });
      },

      pull: {
        batchSize: 60,
      },

      push: {
        batchSize: 60,
      },
    });

    // Logging untuk mempermudah debugging saat integrasi 19 cabang
    this.replicationState.error$.subscribe((err: any) => {
      console.error("❌ Sync Error Detail:", err);
      // Jika error 401/403 tetap muncul, cek kembali kredensial di btoa()
    });

    this.replicationState.active$.subscribe((active: boolean) => {
      console.log(
        active ? "⬆️ Syncing Data..." : "✅ Local & Central Synchronized",
      );
    });

    return this.replicationState;
  }

  // ====================================================
  // STOP SYNC (opsional, untuk membersihkan)
  // ====================================================
  async stopSync() {
    if (
      this.replicationState &&
      typeof this.replicationState.cancel === "function"
    ) {
      await this.replicationState.cancel();
      this.replicationState = null;
      console.log("🛑 Synchronization stopped");
    }
  }
  // ====================================================
  // CLOSE (perbarui agar menghentikan sync)
  // ====================================================
  async close(): Promise<void> {
    await this.stopSync();
    if (this.db && !this.db.closed) {
      await this.db.close();
    }
    if (typeof window !== "undefined") {
      delete window.__ASSTRO_LEDGER_DB__;
      delete window.__ASSTRO_LEDGER_INIT__;
    }
    this.initialized = false;
  }

  // ====================================================
  // CLEAR DATABASE
  // ====================================================

  async clearAllData(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    const db = this.db;

    await this.close();

    await db.remove();
  }

  // ====================================================
  // EXPORT
  // ====================================================

  get database(): RxDatabase<AsstroDatabaseCollections> {
    return this.db;
  }
}
