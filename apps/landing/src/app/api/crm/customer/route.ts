import { NextRequest } from "next/server";
import { handleCustomerGet, handleCustomerPatch } from "@/lib/crm/crmApiHandlers";

/**
 * GET /api/crm/customer?email=...&id=...
 * Mengambil statistik keaktifan user (khusus admin terautentikasi).
 */
export async function GET(req: NextRequest) {
  return handleCustomerGet(req);
}

/**
 * PATCH /api/crm/customer
 * Mengubah data pelanggan (password, email, nama, phone, planTier, status, notes)
 * dan menyinkronkannya ke Supabase Auth tanpa menyimpan password ke orders.raw_payload.
 */
export async function PATCH(req: NextRequest) {
  return handleCustomerPatch(req);
}
