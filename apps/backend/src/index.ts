import express, { type Request, type Response } from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import "./db/index";
import { initNATS } from "./services/nats";
import { initWebSocket } from "./services/websocket";

// --- POS WORKERS ---
import { startCatalogWorker } from "./workers/pos/catalog.worker";
import { startSalesWorker } from "./workers/pos/sales.worker";
import { startInventoryWorker } from "./workers/pos/inventory.worker";
import { startPosProjector } from "./workers/pos/pos-projector";
import { startShiftWorker } from "./workers/pos/shift.worker";

// --- WMS WORKERS ---
import { startWmsProjector } from "./workers/wms/wms-projector";
import { startEWalletWorker } from "./workers/wms/ewallet.worker";

// --- SHARED ROUTES ---
import provisionRoutes from "./routes/shared/provision";

// --- POS ROUTES ---
import syncRoutes from "./routes/pos/sync";
import productRoutes from "./routes/pos/products";
import transactionRoutes from "./routes/pos/transactions.routes";

// --- WMS ROUTES ---
import { wmsProductsRouter } from "./routes/wms/wms-products.route";
import piutangRoutes from "./routes/wms/piutang.routes";
import receivingsRouter from "./routes/wms/receivings.routes";
import wmsEventsRouter from "./routes/wms/events.routes";
import { wmsEwalletRoutes } from "./routes/wms/ewallet.routes";
import { posDataRoutes } from "./routes/wms/pos-data.routes";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// --- POS & SHARED ROUTES ---
app.use("/api/provision", provisionRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);

// --- WMS ROUTES ---
app.use("/api/wms/events", wmsEventsRouter);
app.use("/api/wms/write", wmsProductsRouter);
app.use("/api/wms/write/piutang", piutangRoutes);
app.use("/api/wms/receivings", receivingsRouter);
app.use("/api/wms/ewallet", wmsEwalletRoutes);
app.use("/api/wms/pos-data", posDataRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Asstro ERP Backend is running smoothly!",
  });
});

// STARTUP SEQUENCE YANG BENAR
const bootstrap = async () => {
  try {
    // 1. Inisialisasi Koneksi ke NATS JetStream
    await initNATS();

    // 2. Inisialisasi WebSocket Gateway
    await initWebSocket(httpServer); // <-- BARU

    // 3. Jalankan Server HTTP (Express + WebSocket)
    httpServer.listen(port, () => {
      console.log(`\n======================================`);
      console.log(`🟢 ASSTRO ERP SERVER TERHUBUNG (MICROSERVICES SAGA + WS)`);
      console.log(`📡 Port     : ${port}`);
      console.log(`======================================\n`);
    });

    // 4. Nyalakan Pekerja Background secara Paralel
    console.log("[BOOTSTRAP] Memulai Event Workers...");

    startCatalogWorker().catch((err) =>
      console.error("Catalog Worker Error:", err),
    );
    startSalesWorker().catch((err) =>
      console.error("Sales Worker Error:", err),
    );
    startInventoryWorker().catch((err) =>
      console.error("Inventory Worker Error:", err),
    );
    startShiftWorker().catch((err) =>
      console.error("Shift Worker Error:", err),
    );

    // Worker POS Projector
    startPosProjector().catch((err) =>
      console.error("POS Projector Error:", err),
    );

    // Worker WMS Projector
    startWmsProjector().catch((err) =>
      console.error("WMS Projector Error:", err),
    );
    startEWalletWorker().catch((err) =>
      console.error("E-Wallet Worker Error:", err),
    );
  } catch (err) {
    console.error("Gagal melakukan proses bootstrap:", err);
    process.exit(1);
  }
};

bootstrap();
