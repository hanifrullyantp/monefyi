import { NextRequest } from "next/server";
import { handleProvisionPost } from "@/lib/crm/crmApiHandlers";

/**
 * API untuk memastikan akun Supabase Auth pelanggan tersedia & password sinkron.
 * Khusus admin terautentikasi.
 */
export async function POST(req: NextRequest) {
  return handleProvisionPost(req);
}
