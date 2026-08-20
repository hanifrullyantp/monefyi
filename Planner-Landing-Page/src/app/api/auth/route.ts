import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminPanel, findAccount } from "@/lib/accounts";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.trim()) {
    const account = findAccount(email, password);
    if (account && canAccessAdminPanel(account)) {
      return NextResponse.json({ success: true, email: account.email });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "monefyi2026";
  if (password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
