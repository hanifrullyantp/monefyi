import { formatRupiah, projectIdJs } from "../utils";

function formatQty(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function renderItemRow(
  item: Record<string, unknown>,
  idx: number,
  projectId: number | string
): string {
  const isOver = item.status === "over";
  const isPending = item.status === "pending";
  const isChecked = Boolean(item.checked);
  const pid = projectIdJs(projectId);

  return `
  <div class="item-row ${isChecked ? "checked" : ""}" id="item-row-${idx}" data-idx="${idx}" data-project="${projectId}">
    <div class="item-drag-handle"><i data-lucide="grip-vertical"></i></div>
    <button class="item-check-btn ${isChecked ? "checked" : ""}" onclick="APP.toggleItemCheck(${idx}, ${pid})" title="${isChecked ? "Tandai belum" : "Tandai selesai"}">
      <i data-lucide="${isChecked ? "square-check" : "square"}"></i>
    </button>
    <div class="item-content">
      <div>
        <span class="item-name" onclick="APP.startInlineEdit(this, ${idx}, ${pid}, 'name')">${String(item.name)}</span>
        ${isOver ? '<i data-lucide="alert-triangle" style="color:var(--danger);width:14px;height:14px;margin-left:6px;vertical-align:middle;"></i>' : ""}
      </div>
      <div class="item-meta">
        <span class="item-qty">
          <span class="qty-actual ${isOver ? "over" : ""}">${formatQty(item.qtyActual)}</span>
          <span class="qty-plan"> / ${formatQty(item.qtyPlan)} ${String(item.unit)}</span>
        </span>
        <span style="margin-left:8px;">@${formatRupiah(Number(item.unitPrice), true)}</span>
        <span style="margin-left:8px;color:${isOver ? "var(--danger)" : "var(--gray-700)"}"> = ${formatRupiah(Number(item.total))}</span>
        ${!isPending ? `<span style="margin-left:6px;color:var(--gray-400);font-size:11px;">(RAP: ${formatRupiah(Number(item.rapTotal), true)})</span>` : ""}
      </div>
    </div>
    <div class="item-status-dot ${String(item.status)}"></div>
    <div class="dropdown">
      <button class="item-menu-btn" onclick="APP.toggleItemDropdown(this, ${idx}, ${pid})">
        <i data-lucide="more-vertical"></i>
      </button>
    </div>
  </div>`;
}
