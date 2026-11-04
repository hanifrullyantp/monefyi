var PlannerMoney = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../packages/domain/src/money.ts
  var money_exports = {};
  __export(money_exports, {
    COST_UNITS: () => COST_UNITS,
    firstRupiah: () => firstRupiah,
    orgToday: () => orgToday,
    parseCostCommand: () => parseCostCommand,
    parseRupiah: () => parseRupiah,
    readNumberToken: () => readNumberToken
  });

  // ../packages/domain/src/dates.ts
  function orgToday(timeZone = "Asia/Jakarta", now = /* @__PURE__ */ new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) return "1970-01-01";
    return `${year}-${month}-${day}`;
  }

  // ../packages/domain/src/money.ts
  var COST_UNITS = [
    "sak",
    "kg",
    "m2",
    "m\xB2",
    "m3",
    "m\xB3",
    "kubik",
    "btg",
    "batang",
    "buah",
    "unit",
    "ls",
    "lot",
    "pcs",
    "lembar",
    "lbr",
    "roll",
    "meter",
    "mtr",
    "kaleng",
    "ember",
    "galon",
    "dus",
    "set",
    "titik",
    "hari",
    "orang",
    "org"
  ];
  var UNIT_PATTERN = COST_UNITS.join("|");
  var VERB = /^(?:beli|bayar|byr|bl|catat(?:\s+beli)?|catat)\s+/i;
  function fail(reason) {
    return { ok: false, amount: 0, needsReview: true, reason };
  }
  function readNumberToken(token, allowDecimal) {
    const t = token.trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      return { ok: true, value: Number(t.replace(/\./g, "")), needsReview: false };
    }
    if (/^\d{1,3}(,\d{3})+$/.test(t)) {
      return {
        ok: true,
        value: Number(t.replace(/,/g, "")),
        needsReview: true,
        reason: "pemisah_koma"
      };
    }
    if (/^\d+$/.test(t)) {
      return { ok: true, value: Number(t), needsReview: false };
    }
    if (/^\d+,\d{1,2}$/.test(t)) {
      return {
        ok: true,
        value: Number(t.replace(",", ".")),
        needsReview: !allowDecimal,
        reason: allowDecimal ? void 0 : "desimal_tanpa_satuan"
      };
    }
    if (/^\d+\.\d{1,2}$/.test(t)) {
      return {
        ok: true,
        value: Number(t),
        needsReview: !allowDecimal,
        reason: allowDecimal ? void 0 : "titik_ambigu"
      };
    }
    return { ok: false, value: 0, needsReview: true, reason: "angka_tidak_jelas" };
  }
  function multiplier(suffix) {
    if (suffix === "juta" || suffix === "jt") return 1e6;
    if (suffix === "ribu" || suffix === "rb" || suffix === "k") return 1e3;
    return 1;
  }
  function parseRupiah(input) {
    const raw = String(input ?? "").trim();
    if (!raw) return fail("kosong");
    const s = raw.toLowerCase().replace(/\brp\.?\s*/g, "").replace(/\s+/g, " ").trim();
    if (!s) return fail("kosong");
    const number = "(?:\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)";
    const compound = s.match(
      new RegExp(`^(${number})\\s*(?:juta|jt)\\s+(${number})\\s*(?:ribu|rb|k)$`, "i")
    );
    if (compound) {
      const big = readNumberToken(compound[1], true);
      const small = readNumberToken(compound[2], true);
      if (!big.ok || !small.ok) return fail("angka_tidak_jelas");
      return {
        ok: true,
        amount: Math.round(big.value * 1e6 + small.value * 1e3),
        needsReview: big.needsReview || small.needsReview,
        reason: big.reason || small.reason
      };
    }
    const single = s.match(new RegExp(`^(${number})(?:\\s*(juta|jt|ribu|rb|k))?$`, "i"));
    if (!single) return fail("bukan_nominal");
    const suffix = (single[2] || "").toLowerCase();
    const num = readNumberToken(single[1], suffix.length > 0);
    if (!num.ok) return fail(num.reason || "angka_tidak_jelas");
    return {
      ok: true,
      amount: Math.round(num.value * multiplier(suffix)),
      needsReview: num.needsReview,
      reason: num.reason
    };
  }
  function firstRupiah(input) {
    const number = "(?:\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)";
    const re = new RegExp(
      `(?:rp\\.?\\s*)?${number}(?:\\s*(?:juta|jt|ribu|rb|k))?(?:\\s+${number}\\s*(?:ribu|rb|k))?`,
      "gi"
    );
    const unitAfter = new RegExp(`^\\s*(?:${UNIT_PATTERN})\\b`, "i");
    const text = String(input ?? "");
    const hits = [];
    for (const match of text.matchAll(re)) {
      const start = match.index ?? 0;
      const after = text.slice(start + match[0].length);
      hits.push({ token: match[0], isQty: unitAfter.test(after) });
    }
    const chosen = hits.filter((hit) => !hit.isQty).at(-1) ?? hits.at(-1);
    if (!chosen) return fail("bukan_nominal");
    return parseRupiah(chosen.token);
  }
  function parseCostCommand(input) {
    const original = String(input ?? "").trim();
    if (!VERB.test(original)) return null;
    let rest = original.replace(VERB, "").trim();
    let projectName = null;
    const project = rest.match(/\s+(?:project|proyek|prj)\s+(.+)$/i);
    if (project && project.index != null) {
      projectName = project[1].trim();
      rest = rest.slice(0, project.index).trim();
    }
    const withQty = rest.match(
      new RegExp(
        `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\s*(?:@|harga|hrg|x|\xD7)?\\s*(.+)$`,
        "i"
      )
    );
    if (withQty) {
      const qty = readNumberToken(withQty[2], false);
      const price2 = parseRupiah(withQty[4]);
      const item = withQty[1].trim();
      const unit = withQty[3].toLowerCase();
      if (!qty.ok || !price2.ok) {
        return {
          item,
          qty: qty.ok ? qty.value : null,
          unit,
          unitPrice: null,
          total: 0,
          needsReview: true,
          reason: "harga_tidak_jelas",
          projectName
        };
      }
      return {
        item,
        qty: qty.value,
        unit,
        unitPrice: price2.amount,
        total: Math.round(qty.value * price2.amount),
        needsReview: qty.needsReview || price2.needsReview,
        reason: price2.reason || qty.reason,
        projectName
      };
    }
    const tail = rest.match(
      /^(.+?)\s+(\d[\d.,]*(?:\s*(?:juta|jt|ribu|rb|k))?(?:\s+\d[\d.,]*\s*(?:ribu|rb|k))?)\s*$/i
    );
    if (!tail) {
      return {
        item: rest,
        qty: null,
        unit: null,
        unitPrice: null,
        total: 0,
        needsReview: true,
        reason: "nominal_tidak_ada",
        projectName
      };
    }
    const price = parseRupiah(tail[2]);
    return {
      item: tail[1].trim(),
      qty: null,
      unit: null,
      unitPrice: null,
      total: price.ok ? price.amount : 0,
      needsReview: !price.ok || price.needsReview,
      reason: price.reason,
      projectName
    };
  }
  return __toCommonJS(money_exports);
})();
