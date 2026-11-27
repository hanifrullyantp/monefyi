export class AiGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGuardError";
  }
}

const FORBIDDEN_KEY = /(rupiah|harga|biaya|total|amount|price|volume|koefisien|ppn|pajak|subtotal|unitprice)/i;

/**
 * AI dilarang mengirim angka uang/volume. Engine menolak seluruh payload,
 * bukan mempercayai atau membersihkannya diam-diam.
 */
export function assertNoMoneyFromAi(value: unknown, path = "root"): void {
  if (value === null || value === undefined) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AiGuardError(`Angka tidak finite pada ${path}.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoMoneyFromAi(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEY.test(key)) {
        const isGeometry = /(area|luas|panjang|lebar|tinggi|dimensi)/i.test(key);
        if (!isGeometry) throw new AiGuardError(`AI mencoba mengirim field terlarang "${key}" pada ${path}. Engine menolak angka uang/volume dari AI.`);
      }
      assertNoMoneyFromAi(child, `${path}.${key}`);
    }
  }
}

export function assertBuildingProposalFromAi(value: unknown): void {
  assertNoMoneyFromAi(value);
  if (!value || typeof value !== "object") throw new AiGuardError("Usulan model AI bukan object.");
}
