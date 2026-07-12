import { db, isDbConfigured } from "./index";
import { getSupabaseAdmin } from "./supabase-admin";
import { materials, workers, appConfig } from "./schema";
import { eq, sql } from "drizzle-orm";
import { APP_DATA } from "@/lib/mock-data";

export type MaterialInput = {
  id?: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  lastPrice?: number;
  trend?: string;
  stock?: number;
  icon?: string;
  vendor?: string;
};

export type WorkerInput = {
  id?: number;
  name: string;
  level: string;
  rate: number;
  contact?: string;
  rating?: number;
};

async function getRppClient() {
  if (isDbConfigured() && db) return { kind: "postgres" as const, db };
  const client = getSupabaseAdmin();
  if (client) return { kind: "supabase" as const, client };
  throw new Error("No rpp store configured");
}

export async function addMaterial(data: MaterialInput) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    const [row] = await store.db
      .insert(materials)
      .values({
        name: data.name,
        category: data.category,
        unit: data.unit,
        price: data.price,
        lastPrice: data.lastPrice ?? data.price,
        trend: data.trend || "stable",
        stock: String(data.stock ?? 0),
        usedIn: 0,
        icon: data.icon || "package",
        vendor: data.vendor || "",
      })
      .returning();
    return row;
  }

  const { data: row, error } = await store.client
    .from("rpp_materials")
    .insert({
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: data.price,
      last_price: data.lastPrice ?? data.price,
      trend: data.trend || "stable",
      stock: data.stock ?? 0,
      used_in: 0,
      icon: data.icon || "package",
      vendor: data.vendor || "",
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateMaterial(data: MaterialInput & { id: number }) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    await store.db
      .update(materials)
      .set({
        name: data.name,
        category: data.category,
        unit: data.unit,
        price: data.price,
        lastPrice: data.lastPrice ?? data.price,
        trend: data.trend,
        stock: data.stock != null ? String(data.stock) : undefined,
        icon: data.icon,
        vendor: data.vendor,
      })
      .where(eq(materials.id, data.id));
    return;
  }

  const { error } = await store.client
    .from("rpp_materials")
    .update({
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: data.price,
      last_price: data.lastPrice ?? data.price,
      trend: data.trend,
      stock: data.stock,
      icon: data.icon,
      vendor: data.vendor,
    })
    .eq("id", data.id);
  if (error) throw error;
}

export async function deleteMaterial(id: number) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    await store.db.delete(materials).where(eq(materials.id, id));
    return;
  }

  const { error } = await store.client.from("rpp_materials").delete().eq("id", id);
  if (error) throw error;
}

export async function addWorker(data: WorkerInput) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    const [row] = await store.db
      .insert(workers)
      .values({
        name: data.name,
        level: data.level,
        rate: data.rate,
        contact: data.contact || "",
        rating: data.rating ?? 5,
      })
      .returning();
    return row;
  }

  const { data: row, error } = await store.client
    .from("rpp_workers")
    .insert({
      name: data.name,
      level: data.level,
      rate: data.rate,
      contact: data.contact || "",
      rating: data.rating ?? 5,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateWorker(data: WorkerInput & { id: number }) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    await store.db
      .update(workers)
      .set({
        name: data.name,
        level: data.level,
        rate: data.rate,
        contact: data.contact,
        rating: data.rating,
      })
      .where(eq(workers.id, data.id));
    return;
  }

  const { error } = await store.client
    .from("rpp_workers")
    .update({
      name: data.name,
      level: data.level,
      rate: data.rate,
      contact: data.contact,
      rating: data.rating,
    })
    .eq("id", data.id);
  if (error) throw error;
}

export async function deleteWorker(id: number) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    await store.db.delete(workers).where(eq(workers.id, id));
    return;
  }

  const { error } = await store.client.from("rpp_workers").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertJobTemplates(
  templates: typeof APP_DATA.database.templates
) {
  const store = await getRppClient();

  if (store.kind === "postgres") {
    await store.db
      .insert(appConfig)
      .values({ key: "job_templates", payload: templates })
      .onConflictDoUpdate({ target: appConfig.key, set: { payload: templates } });
    return;
  }

  const { error } = await store.client
    .from("rpp_app_config")
    .upsert({ key: "job_templates", payload: templates }, { onConflict: "key" });
  if (error) throw error;
}

export async function upsertMaterialFromRapLine(input: {
  name: string;
  unit: string;
  unitPrice: number;
  category?: string;
  vendor?: string;
}) {
  const store = await getRppClient();
  const category = input.category || "Umum";

  if (store.kind === "postgres") {
    const existing = await store.db
      .select()
      .from(materials)
      .where(eq(materials.name, input.name))
      .limit(1);

    if (existing.length > 0) {
      await store.db
        .update(materials)
        .set({
          price: input.unitPrice,
          lastPrice: input.unitPrice,
          usedIn: sql`${materials.usedIn} + 1`,
          unit: input.unit,
        })
        .where(eq(materials.id, existing[0].id));
      return existing[0].id;
    }

    const [row] = await store.db
      .insert(materials)
      .values({
        name: input.name,
        category,
        unit: input.unit,
        price: input.unitPrice,
        lastPrice: input.unitPrice,
        usedIn: 1,
        icon: "package",
        vendor: input.vendor || "",
      })
      .returning({ id: materials.id });
    return row.id;
  }

  const { data: existing } = await store.client
    .from("rpp_materials")
    .select("id, used_in")
    .eq("name", input.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await store.client
      .from("rpp_materials")
      .update({
        price: input.unitPrice,
        last_price: input.unitPrice,
        used_in: (Number(existing.used_in) || 0) + 1,
        unit: input.unit,
      })
      .eq("id", existing.id);
    return existing.id as number;
  }

  const { data: row, error } = await store.client
    .from("rpp_materials")
    .insert({
      name: input.name,
      category,
      unit: input.unit,
      price: input.unitPrice,
      last_price: input.unitPrice,
      used_in: 1,
      icon: "package",
      vendor: input.vendor || "",
    })
    .select("id")
    .single();
  if (error) throw error;
  return row.id as number;
}

export async function upsertWorkerFromRapLine(input: {
  name: string;
  rate: number;
  level?: string;
}) {
  const store = await getRppClient();
  const level = input.level || "Menengah";

  if (store.kind === "postgres") {
    const existing = await store.db
      .select()
      .from(workers)
      .where(eq(workers.name, input.name))
      .limit(1);

    if (existing.length > 0) {
      await store.db
        .update(workers)
        .set({ rate: input.rate })
        .where(eq(workers.id, existing[0].id));
      return existing[0].id;
    }

    const [row] = await store.db
      .insert(workers)
      .values({ name: input.name, level, rate: input.rate, rating: 5 })
      .returning({ id: workers.id });
    return row.id;
  }

  const { data: existing } = await store.client
    .from("rpp_workers")
    .select("id")
    .eq("name", input.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await store.client.from("rpp_workers").update({ rate: input.rate }).eq("id", existing.id);
    return existing.id as number;
  }

  const { data: row, error } = await store.client
    .from("rpp_workers")
    .insert({ name: input.name, level, rate: input.rate, rating: 5 })
    .select("id")
    .single();
  if (error) throw error;
  return row.id as number;
}
