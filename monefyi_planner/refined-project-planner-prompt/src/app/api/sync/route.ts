import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, transactions, materials, workers, businessAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allProjects = await db.select().from(projects);
    const allTransactions = await db.select().from(transactions);
    const allMaterials = await db.select().from(materials);
    const allWorkers = await db.select().from(workers);
    const allAccounts = await db.select().from(businessAccounts);

    return NextResponse.json({
      projects: allProjects,
      transactions: allTransactions,
      database: {
        materials: allMaterials,
        workers: allWorkers,
      },
      business: {
        accounts: allAccounts,
      }
    });
  } catch (error) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // Logika simpan data berdasarkan type
    if (type === "SAVE_PROJECT") {
      const { id, ...projData } = data;
      if (id && typeof id === 'number') {
        await db.update(projects).set(projData).where(eq(projects.id, id));
      } else {
        await db.insert(projects).values(projData);
      }
    }

    if (type === "ADD_TRANSACTION") {
      await db.insert(transactions).values(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
