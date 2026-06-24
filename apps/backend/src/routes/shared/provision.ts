import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { users, branches, devices, regions } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ulid } from "ulidx";
import crypto from "crypto";

const router = Router();

// POST /api/provision/login
router.post("/login", async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  try {
    // SECURITY PATCH: Pastikan akun aktif dan tidak di-soft-delete
    const userResult = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const user = userResult[0];

    if (
      !user ||
      user.passwordHash !== password ||
      !["manager", "superadmin"].includes(user.role)
    ) {
      return res.status(401).json({
        error: "Kredensial tidak valid, dinonaktifkan, atau hak akses ditolak.",
      });
    }

    // SECURITY PATCH: Hanya ambil Region dan Cabang yang aktif dan belum dihapus
    const activeRegions = await db
      .select()
      .from(regions)
      .where(and(eq(regions.isActive, true), isNull(regions.deletedAt)));

    const activeBranches = await db
      .select()
      .from(branches)
      .where(and(eq(branches.isActive, true), isNull(branches.deletedAt)));

    const groupedRegions = activeRegions
      .map((region) => ({
        id: region.id,
        name: region.name,
        branches: activeBranches
          .filter((branch) => branch.regionId === region.id)
          .map((branch) => ({
            id: branch.id,
            name: branch.name,
            code: branch.code,
          })),
      }))
      .filter((region) => region.branches.length > 0);

    return res.json({
      message: "Otorisasi sukses",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pin: user.pin,
      },
      regions: groupedRegions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

// GET /api/provision/branch-devices/:branchId (MENGAMBIL DAFTAR MESIN DI CABANG)
router.get(
  "/branch-devices/:branchId",
  async (req: Request, res: Response): Promise<any> => {
    const branchId = String(req.params.branchId);

    try {
      // SECURITY PATCH: Abaikan mesin yang sudah masuk tong sampah (deletedAt)
      const branchDevices = await db
        .select({
          id: devices.id,
          name: devices.name,
          status: devices.status,
        })
        .from(devices)
        .where(and(eq(devices.branchId, branchId), isNull(devices.deletedAt)));

      return res.json({ devices: branchDevices });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Gagal memuat daftar perangkat cabang." });
    }
  },
);

// POST /api/provision/device (DAFTAR BARU ATAU GANTI DEVICE)
router.post("/device", async (req: Request, res: Response): Promise<any> => {
  const { branchId, name, lat, lng, replaceDeviceId } = req.body;

  try {
    const deviceToken = crypto.randomBytes(32).toString("hex");
    let finalDeviceId = "";

    if (replaceDeviceId) {
      // MODE B: GANTI DEVICE RUSAK (DEVICE TAKEOVER)
      const existing = await db
        .select()
        .from(devices)
        .where(and(eq(devices.id, replaceDeviceId), isNull(devices.deletedAt)))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({
          error: "Perangkat yang akan diganti tidak valid atau sudah dihapus.",
        });
      }

      await db
        .update(devices)
        .set({
          deviceToken: deviceToken,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(devices.id, replaceDeviceId));

      finalDeviceId = replaceDeviceId;
      console.log(
        `[PROVISIONING] Device Takeover sukses. ID: ${finalDeviceId}`,
      );
    } else {
      // MODE A: KONFIGURASI DEVICE BARU
      finalDeviceId = ulid();
      await db.insert(devices).values({
        id: finalDeviceId,
        branchId,
        name: name.trim().toUpperCase(),
        deviceToken,
      });
      console.log(
        `[PROVISIONING] Mesin baru didaftarkan. ID: ${finalDeviceId}`,
      );
    }

    return res.json({
      message: "Perangkat berhasil diaktifkan.",
      deviceToken,
      deviceId: finalDeviceId,
      branchId,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Gagal meregistrasi perangkat keras." });
  }
});

// POST /api/provision/reauth (Otorisasi Ulang Tanpa Setup Wizard)
router.post("/reauth", async (req: Request, res: Response): Promise<any> => {
  const { email, password, branchId } = req.body;

  try {
    // 1. Validasi Akun Manager (SECURITY PATCH)
    const userResult = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    const user = userResult[0];

    if (
      !user ||
      user.passwordHash !== password ||
      !["manager", "superadmin"].includes(user.role)
    ) {
      return res.status(401).json({
        error: "Kredensial tidak valid, dinonaktifkan, atau hak akses ditolak.",
      });
    }

    // 2. KECERDASAN SISTEM: Jika branchId dari tablet hilang, gunakan branchId milik Manager
    const targetBranchId = branchId || user.branchId;

    if (!targetBranchId) {
      return res
        .status(400)
        .json({ error: "Gagal mengidentifikasi cabang asal." });
    }

    // 3. Terbitkan Token & Daftarkan Mesin Darurat
    const deviceId = ulid();
    const deviceToken = crypto.randomBytes(32).toString("hex");

    await db.insert(devices).values({
      id: deviceId,
      branchId: targetBranchId,
      name: `REAUTH-${new Date().getTime()}`,
      deviceToken,
    });

    return res.json({
      message: "Otorisasi ulang berhasil.",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        pin: user.pin,
      },
      deviceToken,
      branchId: targetBranchId,
    });
  } catch (error) {
    console.error("[ERROR REAUTH]:", error);
    return res.status(500).json({ error: "Gagal melakukan otorisasi ulang." });
  }
});

export default router;
