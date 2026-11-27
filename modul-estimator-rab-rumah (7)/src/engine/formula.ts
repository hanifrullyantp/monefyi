/**
 * Parser rumus kecil tanpa eval/Function. Mendukung + - * / ( ), persen,
 * variabel, serta min, max, round, ceil, floor. Semua penolakan eksplisit.
 */
const ALLOWED_FUNCTIONS = new Set(["min", "max", "round", "ceil", "floor", "abs"]);

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

export class FormulaError extends Error {}

function tokenize(source: string): Token[] {
  if (source.length > 300) throw new FormulaError("Rumus terlalu panjang (maksimum 300 karakter).");
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/\d|\./.test(char)) {
      let raw = "";
      while (i < source.length && /[\d.]/.test(source[i])) raw += source[i++];
      if ((raw.match(/\./g) ?? []).length > 1 || raw === ".") throw new FormulaError(`Angka tidak valid: ${raw}`);
      tokens.push({ type: "number", value: Number(raw) });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let raw = "";
      while (i < source.length && /[\w]/.test(source[i])) raw += source[i++];
      tokens.push({ type: "ident", value: raw });
      continue;
    }
    if ("+-*/".includes(char)) {
      tokens.push({ type: "op", value: char });
      i++;
      continue;
    }
    if (char === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma" });
      i++;
      continue;
    }
    throw new FormulaError(`Karakter tidak diizinkan: ${char}`);
  }
  return tokens;
}

export function evaluateFormula(formula: string, vars: Record<string, number> = {}): number {
  if (!formula.trim()) throw new FormulaError("Rumus kosong.");
  const tokens = tokenize(formula);
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpr = (): number => {
    let value = parseTerm();
    while (peek()?.type === "op" && (peek() as { value: string }).value.match(/[+-]/)) {
      const op = (consume() as { value: string }).value;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek()?.type === "op" && (peek() as { value: string }).value.match(/[*/]/)) {
      const op = (consume() as { value: string }).value;
      const rhs = parseUnary();
      if (op === "*") value *= rhs;
      else if (rhs === 0) throw new FormulaError("Pembagian dengan nol.");
      else value /= rhs;
    }
    return value;
  };

  const parseUnary = (): number => {
    if (peek()?.type === "op") {
      const op = (consume() as { value: string }).value;
      if (op === "-") return -parseUnary();
      if (op === "+") return parseUnary();
      throw new FormulaError(`Operator tidak valid: ${op}`);
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const token = consume();
    if (!token) throw new FormulaError("Rumus belum lengkap.");
    if (token.type === "number") return token.value;
    if (token.type === "lparen") {
      depth++;
      if (depth > 24) throw new FormulaError("Rumus terlalu bertingkat.");
      const value = parseExpr();
      const close = consume();
      depth--;
      if (!close || close.type !== "rparen") throw new FormulaError("Kurung tutup belum ada.");
      return value;
    }
    if (token.type === "ident") {
      if (peek()?.type === "lparen") {
        const fn = token.value.toLowerCase();
        if (!ALLOWED_FUNCTIONS.has(fn)) throw new FormulaError(`Fungsi tidak diizinkan: ${token.value}`);
        consume();
        const args: number[] = [];
        if (peek()?.type !== "rparen") {
          args.push(parseExpr());
          while (peek()?.type === "comma") {
            consume();
            args.push(parseExpr());
          }
        }
        if (!peek() || consume()?.type !== "rparen") throw new FormulaError("Kurung fungsi belum ditutup.");
        if (fn === "min") return Math.min(...args);
        if (fn === "max") return Math.max(...args);
        if (fn === "round") return Math.round(args[0] ?? 0);
        if (fn === "ceil") return Math.ceil(args[0] ?? 0);
        if (fn === "floor") return Math.floor(args[0] ?? 0);
        return Math.abs(args[0] ?? 0);
      }
      if (!Object.prototype.hasOwnProperty.call(vars, token.value)) throw new FormulaError(`Variabel tidak dikenal: ${token.value}`);
      return vars[token.value];
    }
    throw new FormulaError("Urutan rumus tidak valid.");
  };

  const result = parseExpr();
  if (pos !== tokens.length) throw new FormulaError("Ada bagian rumus yang belum dipakai.");
  if (!Number.isFinite(result)) throw new FormulaError("Hasil rumus bukan angka finite.");
  return result;
}

export function previewFormula(formula: string, vars: Record<string, number>) {
  try {
    const value = evaluateFormula(formula, vars);
    return { ok: true as const, value: Math.round(value * 100) / 100 };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Rumus tidak valid." };
  }
}
