// =====================================================
// Autosuggest — materials/workers/clients from master data
// =====================================================

import { fuzzyMatch } from "../utils";
import type { APP_DATA } from "../mock-data";

type MaterialRow = (typeof APP_DATA.database.materials)[number];
type WorkerRow = (typeof APP_DATA.database.workers)[number];
type ClientRow = (typeof APP_DATA.database.clients)[number];

export type AutosuggestItem = {
  name: string;
  unit: string;
  price: number;
  icon?: string;
  stock?: number;
  usedIn?: number;
  meta?: string;
};

export type AutosuggestContext = {
  materials: MaterialRow[];
  workers: WorkerRow[];
  clients?: ClientRow[];
};

export function searchMaterials(
  query: string,
  ctx: AutosuggestContext,
  limit = 8
): AutosuggestItem[] {
  return ctx.materials
    .filter((m) => fuzzyMatch(query, m.name))
    .sort((a, b) => (b.usedIn || 0) - (a.usedIn || 0))
    .slice(0, limit)
    .map((m) => ({
      name: m.name,
      unit: m.unit,
      price: m.price,
      icon: m.icon,
      stock: m.stock,
      usedIn: m.usedIn,
      meta: `${m.category} • ${m.vendor || ""}`,
    }));
}

export function searchWorkers(
  query: string,
  ctx: AutosuggestContext,
  limit = 8
): AutosuggestItem[] {
  return ctx.workers
    .filter((w) => fuzzyMatch(query, w.name))
    .slice(0, limit)
    .map((w) => ({
      name: w.name,
      unit: "Hari",
      price: w.rate,
      icon: "hard-hat",
      meta: `${w.level} • ${w.contact || ""}`,
    }));
}

export function searchClients(query: string, ctx: AutosuggestContext, limit = 8): ClientRow[] {
  const clients = ctx.clients || [];
  return clients
    .filter((c) => fuzzyMatch(query, c.name))
    .slice(0, limit);
}

export function renderAutosuggestHtml(
  items: AutosuggestItem[],
  query: string,
  dropdownId: string,
  onSelect: string
): string {
  return `
    ${items
      .map(
        (m) => `
      <div class="autosuggest-item" onclick="${onSelect}('${escapeJs(m.name)}', '${escapeJs(m.unit)}', ${m.price}, '${dropdownId}')">
        <div class="autosuggest-item-icon"><i data-lucide="${m.icon || "package"}" style="width:15px;height:15px;color:var(--gray-500);"></i></div>
        <div style="flex:1;">
          <div class="autosuggest-item-name">${m.name}</div>
          <div class="autosuggest-item-meta">${formatPriceMeta(m)}</div>
        </div>
        ${(m.usedIn || 0) > 5 ? '<div class="autosuggest-ranked" title="Sering dipakai"></div>' : ""}
      </div>`
      )
      .join("")}
    <div class="autosuggest-item create-new" onclick="APP.createNewSuggestion('${escapeJs(query)}', '${dropdownId}')">
      <i data-lucide="plus" style="width:15px;height:15px;"></i>
      Buat baru: "${query}"
    </div>`;
}

function formatPriceMeta(m: AutosuggestItem): string {
  const price = new Intl.NumberFormat("id-ID").format(m.price);
  const stock =
    m.stock != null && m.stock > 0 ? `Stock: ${m.stock} ${m.unit}` : "Stock: Habis";
  return `Rp ${price}/${m.unit} • ${stock}`;
}

function escapeJs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
