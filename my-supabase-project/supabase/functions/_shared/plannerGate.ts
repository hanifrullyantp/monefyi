/** Gerbang input Edge Function Planner. Bentuk error datang dari packages/domain. */

import { structuredError, type StructuredError } from "./domain/errors.ts";
export type { StructuredError };

export type GateOk<T> = { ok: true; value: T };
export type GateFail = { ok: false; status: number; error: StructuredError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_PARSE_INPUT_CHARS = 4000;
export const MAX_CONTEXT_CHARS = 8000;
export const MAX_ANALYZE_PER_DAY = 30;

function fail(status: number, code: string, fixHint: string): GateFail {
  return {
    ok: false,
    status,
    error: structuredError(code, fixHint),
  };
}

export function assertParseInput(input: unknown): GateOk<string> | GateFail {
  if (typeof input !== "string") {
    return fail(400, "input_bukan_teks", "Kirim perintah sebagai teks.");
  }
  const value = input.trim();
  if (!value) return fail(400, "input_kosong", "Isi perintah sebelum mengirim.");
  if (value.length > MAX_PARSE_INPUT_CHARS) {
    return fail(400, "input_terlalu_panjang", `Persingkat perintah sampai ${MAX_PARSE_INPUT_CHARS} karakter.`);
  }
  return { ok: true, value };
}

export function assertContextSize(context: unknown): GateOk<true> | GateFail {
  if (context == null) return { ok: true, value: true };
  let encoded = "";
  try {
    encoded = JSON.stringify(context);
  } catch {
    return fail(400, "konteks_tidak_valid", "Kirim konteks sebagai objek JSON.");
  }
  if (encoded.length > MAX_CONTEXT_CHARS) {
    return fail(400, "konteks_terlalu_besar", "Kurangi daftar proyek atau contoh yang dikirim bersama perintah.");
  }
  return { ok: true, value: true };
}

export function assertProjectId(projectId: unknown): GateOk<string> | GateFail {
  if (typeof projectId !== "string" || !UUID.test(projectId)) {
    return fail(400, "proyek_tidak_valid", "Pilih proyek dari daftar, jangan mengetik id.");
  }
  return { ok: true, value: projectId };
}

export function quotaDecision(
  used: number,
  limit: number,
): { ok: true; next: number } | { ok: false; used: number; limit: number } {
  const safeUsed = Number.isFinite(used) && used > 0 ? used : 0;
  if (safeUsed >= limit) return { ok: false, used: safeUsed, limit };
  return { ok: true, next: safeUsed + 1 };
}
