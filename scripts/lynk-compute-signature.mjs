#!/usr/bin/env node
/**
 * Hitung X-Lynk-Signature sesuai dokumentasi Lynk.id:
 * SHA256(amount + refId + message_id + merchantKey)
 *
 * Usage:
 *   export LYNK_MERCHANT_KEY='...'
 *   node scripts/lynk-compute-signature.mjs --refId xxx --amount 99000 --messageId API_CALL_...
 */
import crypto from "crypto";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

const refId = arg("--refId");
const amount = arg("--amount");
const messageId = arg("--messageId");
const key = process.env.LYNK_MERCHANT_KEY || arg("--key");

if (!refId || !amount || !messageId || !key) {
  console.error("Usage: LYNK_MERCHANT_KEY=... node scripts/lynk-compute-signature.mjs --refId REF --amount 99000 --messageId MSG_ID");
  process.exit(1);
}

const signatureString = `${amount}${refId}${messageId}${key}`;
const hex = crypto.createHash("sha256").update(signatureString, "utf8").digest("hex");
console.log(hex);
console.error(`string: ${amount}+${refId}+${messageId}+[merchantKey]`);
