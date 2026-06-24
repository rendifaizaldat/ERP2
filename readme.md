# 📜 Asstro ERP 2 - System Architecture Document & Handover Rules

> **Untuk:** Google Jules (Lead AI Developer)  
> **Status Proyek:** Setengah Jalan (Modul PWA-POS & PWA-WMS stabil, bebas bug).  
> **Sifat Dokumen:** Aturan Hukum Mutlak (Golden Rules). Pelanggaran terhadap prinsip dokumen ini akan merusak integritas data ERP hulu-ke-hilir.

---

## 1. Aturan Pengembangan & Prinsip Kerja

Sebagai AI yang memegang kendali penyempurnaan sistem ini, kamu **WAJIB** mematuhi 4 hukum arsitektur berikut:

1. **Event Immutability (Sejarah Tidak Boleh Dihapus):** _Event Ledger_ adalah realitas mutlak masa lalu. Jika ada kesalahan logika bisnis atau perhitungan dari lapangan, kamu **DILARANG KERAS** menghapus, mengedit, atau memanipulasi baris data di dalam `Ledger/Event Store`. Kesalahan diselesaikan dengan _Event Upcasting_ (evolusi skema) atau _Compensating Event_ (transaksi penyeimbang/koreksi).
2. **Projector is Malleable (Proyektor adalah Wadah Fleksibel):** Jika terjadi ambiguitas data di sisi server (seperti kasus _partial refund_), kesalahan mutlak berada pada cara Proyektor membaca data, bukan pada Event-nya. Solusinya adalah memperkaya kosa kata proyektor (misal: memperluas tipe `Enum` SQL dari `paid` menjadi `partially_refunded`) atau memecah datanya ke dalam tabel jurnal keuangan sekunder (`Finance_Journals`).
3. **PWA Independence (Kemandirian Modul):** Setiap modul PWA (POS, WMS, Dashboard, dsb.) harus bersifat **otonom dan mandiri**. Modul POS tidak boleh bergantung langsung pada API WMS untuk berjalan. Komunikasi antar-device bersifat _Publish/Subscribe_ yang berjalan asinkron melalui **NATS Hint berbasis `deviceId`** (Bukan broadcast universal yang menguras bandwidth).
4. **Interactive Schema Proposal:** Sebelum melakukan migrasi _database_ (Drizzle) atau menulis _Worker Projector_ baru, kamu wajib menjabarkan implikasi logika dan perubahan skema enum/tabel kepada User untuk divalidasi.

---

## 2. Struktur Data & Batasan Multi-Tenancy (The Golden Constraints) 🔒

Setiap transaksi, event, dan entitas database di seluruh ekosistem Asstro ERP 2 **WAJIB** diisolasi menggunakan data spasial hirarkis:

- `regionId` : Identitas wilayah operasi pusat.
- `branchId` : Identitas cabang/outlet spesifik.

### Implementasi Wajib:

- **Di Sisi Frontend (RxDB):** Filter ini ditanamkan pada level replikasi lokal agar perangkat di Cabang A _tidak akan pernah_ mengunduh atau menyimpan cache data milik Cabang B.
- **Di Sisi Server (Drizzle ORM):** Filter ini wajib diikat menggunakan _Row-Level Security_ (RLS) PostgreSQL atau klausa `WHERE` otomatis pada setiap query demi mencegah kebocoran data antar-cabang.

---

## 3. Hirarki Aliran Data (Data Flow Hierarchy)

Semua kode baru yang kamu tulis untuk modul lanjutan wajib mengikuti pipa arsitektur berikut secara linear:

### A. Aliran Menulis (Write Flow - Event Sourcing)

UI tidak diizinkan mengubah tabel _state_ relasional secara langsung. UI hanya bertugas mencatat "niat" (peristiwa).

[ UI Component ]
↓ (Memicu aksi, misal: CREATE_SALES)
[ RxDB (pending_event / outbox) ] ── (Simpan offline dalam bentuk event payload)
↓ (Koneksi Internet Pulih)
[ Sync Engine (BackgroundSync) ] ── (Pekerja latar belakang mendeteksi & kirim event)
↓
[ Idempotency Check ] ── (Backend memvalidasi Event ID; cegah duplikasi data)
↓
[ Event Streaming (NATS JetStream) ] ── (Event masuk ke stream pos.events / wms.events)
↓
[ Projector Worker ] ── (Membaca stream, menghitung logika bisnis, mengurai Enum)
↓
[ Primary Database (Drizzle ORM) ] ── (Mutasi final INSERT/UPDATE ke PostgreSQL Utama)

### B. Aliran Membaca (Read Flow - CQRS)

Proses pembacaan data didesain instan dengan memisahkan jalur database utama demi performa tinggi.

[ Replica 1 (Read-Only DB) ] ── (Drizzle mengarahkan semua query SELECT ke database replika)
↓
[ Backend API / WebSocket ] ── (Mengirimkan pembaruan state terfilter regionId & branchId)
↓
[ RxDB Read Cache ] ── (Frontend mengonsumsi data langsung ke storage lokal perangkat)
↓
[ UI Component ] ── (Re-render komponen secara reaktif & real-time lewat Observable)

### C. Aliran Penanganan Kegagalan (Failover Flow - High Availability)

Menjamin sistem tidak memiliki _Single Point of Failure_ (SPOF) pada lapisan penyimpanan data.

[ Primary Database Mati ] ── (PostgreSQL Utama mengalami downtime)
↓
[ Replica 2 Promoted ] ── (Orchestrator seperti Patroni otomatis menaikkan status Replica 2)
↓
[ New Primary Online ] ── (Layanan Backend otomatis mengalihkan route WRITE ke Primary baru)
↓
[ Sync Event Dilanjutkan ] ── (NATS JetStream menjaga event log tetap aman; proyektor lanjut memproses data tanpa loss)
