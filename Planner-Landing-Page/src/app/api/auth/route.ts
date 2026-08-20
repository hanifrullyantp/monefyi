import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "monefyi2026";

  if (password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
