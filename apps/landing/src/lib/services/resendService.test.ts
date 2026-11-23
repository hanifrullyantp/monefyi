import assert from "node:assert/strict";
import test from "node:test";
import { sendResendEmail } from "./resendService.ts";
import { CS_AGENT_PROFILE, getCustomerSupportReply } from "./customerSupportService.ts";
import { getUpsellReason, productLabel } from "../permissions.ts";

test("sendResendEmail preserves default sender and Froyek copy across templates", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.RESEND_FROM_EMAIL;
  const prevFetch = globalThis.fetch;

  const sentPayloads: Array<{ from: string; to: string[]; subject: string; html: string }> = [];

  process.env.RESEND_API_KEY = "re_test_key";
  delete process.env.RESEND_FROM_EMAIL;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || "{}"));
    sentPayloads.push(body);
    return new Response(JSON.stringify({ id: `email_${sentPayloads.length}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const types = [
      "payment_confirmation",
      "account_access",
      "password_reset",
      "followup",
      "froyek_help",
      "froyek_access",
    ] as const;

    for (const type of types) {
      const res = await sendResendEmail({
        to: "user@example.com",
        type,
      });
      assert.equal(res.ok, true);
      assert.equal(res.status, "sent");
    }

    assert.equal(sentPayloads.length, types.length);
    for (const payload of sentPayloads) {
      assert.equal(payload.from, "froyek <noreply@froyek.com>");
      assert.equal(/monefyi/i.test(payload.subject), false, `Subject leaked Monefyi: ${payload.subject}`);
      assert.equal(/monefyi/i.test(payload.html), false, `HTML leaked Monefyi for subject: ${payload.subject}`);
    }

    const payment = sentPayloads[0];
    assert.ok(payment.html.includes("Pelanggan Froyek"));
    assert.ok(payment.html.includes("https://estimator.froyek.com/app/estimator"));

    const followup = sentPayloads[3];
    assert.ok(followup.html.includes("https://estimator.froyek.com/checkout"));

    const froyekHelp = sentPayloads[4];
    assert.ok(froyekHelp.subject.includes("froyek"));
    assert.ok(froyekHelp.html.includes("https://froyek.com/pilih"));

    const froyekAccess = sentPayloads[5];
    assert.ok(froyekAccess.subject.includes("froyek"));
    assert.ok(froyekAccess.html.includes("https://froyek.com/login"));
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = prevFrom;
  }
});

test("customerSupportService uses Froyek branding and froyek.com links", () => {
  assert.ok(CS_AGENT_PROFILE.title.includes("Froyek"));
  assert.equal(/monefyi/i.test(CS_AGENT_PROFILE.greeting), false);

  const queries = [
    "Lupa password akun",
    "Bagaimana cara login",
    "Info paket upgrade",
    "Cara bikin PDF penawaran",
    "Undang mandor dan tukang",
    "Hubungi WhatsApp support",
    "Pertanyaan umum lain",
  ];

  for (const q of queries) {
    const reply = getCustomerSupportReply(q);
    assert.equal(/monefyi/i.test(reply.text), false, `Support reply leaked Monefyi for "${q}"`);
    for (const action of reply.suggestedActions || []) {
      assert.equal(/monefyi/i.test(action.payload), false, `Action payload leaked Monefyi: ${action.payload}`);
    }
  }

  const pwdReply = getCustomerSupportReply("lupa password");
  assert.ok(pwdReply.text.includes("froyek.com/login"));
});

test("permissions product labels and upsell copy use Froyek", () => {
  assert.equal(productLabel("estimator"), "Froyek Estimator");
  assert.equal(productLabel("planner"), "Froyek");
  assert.equal(productLabel("stay"), "Froyek Stay");
  assert.equal(productLabel("finance"), "Froyek Finance");

  const upsell = getUpsellReason(null, "locked_feature", "team_members");
  assert.ok(upsell.includes("Froyek Lifetime"));
  assert.equal(/monefyi/i.test(upsell), false);
});
