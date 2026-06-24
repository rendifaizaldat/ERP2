import { Router } from "express";
import { searchTransactions } from "../../controllers/pos/transactions.controller";

const router = Router();

// GET /api/transactions/search
// URL PWA akan mengirimkan: /api/transactions/search?searchType=nama&keyword=budi&date=2026-06-04
router.get("/search", searchTransactions);

export default router;
