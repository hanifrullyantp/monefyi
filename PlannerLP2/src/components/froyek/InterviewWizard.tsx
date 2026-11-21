"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FroyekContent, FroyekPlanId } from "@/lib/froyek/schema";
import { isPlaceholder } from "@/lib/froyek/schema";
import { recommendPlan, resolveFroyekCharge, type WizardAnswers } from "@/lib/froyek/pricing";
import { trackFroyek } from "@/lib/froyek/track";
import { emitFroyekToast } from "./FroyekToasts";

const STORAGE = "froyek_wizard_v1";
const STEPS = ["role", "team", "project", "scale", "problem", "features", "result", "name", "email", "phone", "summary", "pay"] as const;

const CHOICES = {
  role: [
    ["pemilik", "Pemilik usaha"],
    ["pm", "Pengelola proyek"],
    ["lapangan", "Tim lapangan"],
    ["keuangan", "Keuangan"],
  ],
  team: [
    ["solo", "Saya sendiri"],
    ["2-5", "2 sampai 5 orang"],
    ["6+", "Lebih dari 5 orang"],
  ],
  project: [
    ["konstruksi", "Konstruksi"],
    ["interior", "Interior atau furnitur"],
    ["jasa", "Jasa proyek lain"],
  ],
  scale: [
    ["kecil", "Satu proyek kecil"],
    ["sedang", "Beberapa proyek"],
    ["banyak", "Banyak proyek sekaligus"],
  ],
  problem: [
    ["berantakan", "Data proyek berantakan"],
    ["laporan", "Laporan sering telat"],
    ["uang", "Uang proyek sulit ditelusuri"],
    ["penawaran", "Penawaran terlambat terkirim"],
  ],
  features: [
    ["penawaran", "Penawaran harga"],
    ["proyek", "Kelola proyek"],
    ["rap", "RAP dan realisasi"],
    ["keuangan", "Keuangan proyek"],
    ["laporan", "Laporan"],
    ["catat", "Catat cepat"],
  ],
} as const;

interface Draft {
  step: number;
  answers: WizardAnswers;
  name: string;
  email: string;
  phone: string;
  promo: string;
  optIn: boolean;
}

const emptyDraft: Draft = {
  step: 0,
  answers: { role: "", team: "", projectType: "", scale: "", problem: "", features: [] },
  name: "",
  email: "",
  phone: "",
  promo: "",
  optIn: false,
};

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return emptyDraft;
    return { ...emptyDraft, ...JSON.parse(raw) } as Draft;
  } catch {
    return emptyDraft;
  }
}

export function InterviewWizard({ content }: { content: FroyekContent }) {
  const params = useSearchParams();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    const saved = readDraft();
    const preset = params.get("paket");
    if (preset && content.pricing.plans.some((plan) => plan.id === preset)) {
      saved.step = STEPS.indexOf("result");
    }
    setDraft(saved);
    setReady(true);
    trackFroyek("wizard_step_viewed", { step: STEPS[saved.step] || "role" });
  }, [content.pricing.plans, params]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE, JSON.stringify(draft));
  }, [draft, ready]);

  const recommendation = useMemo(
    () => recommendPlan(draft.answers, content.wizard.rules),
    [content.wizard.rules, draft.answers],
  );
  const preset = params.get("paket");
  const planId = (preset && content.pricing.plans.some((plan) => plan.id === preset)
    ? preset
    : recommendation.planId) as FroyekPlanId;
  const plan = content.pricing.plans.find((item) => item.id === planId) || content.pricing.plans[0];
  const charge = resolveFroyekCharge(planId, draft.promo, content.promos);
  const stepName = STEPS[draft.step] || "role";
  const progress = Math.round(((draft.step + 1) / STEPS.length) * 100);

  function save(next: Draft) {
    setDraft(next);
    setError("");
  }

  function go(nextStep: number) {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, nextStep));
    save({ ...draft, step: bounded });
    trackFroyek("wizard_step_viewed", { step: STEPS[bounded] });
  }

  function answer(partial: Partial<WizardAnswers>, next = true) {
    const answers = { ...draft.answers, ...partial };
    save({ ...draft, answers, step: next ? draft.step + 1 : draft.step });
    trackFroyek("wizard_step_answered", { step: stepName });
    if (next) trackFroyek("wizard_step_viewed", { step: STEPS[draft.step + 1] || "result" });
    emitFroyekToast("progress_saved");
  }

  async function remindOnce() {
    if (!draft.optIn || reminded || !draft.email.includes("@")) return;
    setReminded(true);
    await fetch("/api/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: draft.email,
        name: draft.name || "Pengunjung",
        type: "froyek_help",
        resetLink: `${window.location.origin}/pilih`,
      }),
    }).catch(() => undefined);
  }

  async function pay() {
    if (!charge.ok || charge.contact) {
      setError(charge.ok ? "Paket ini tidak dibayar otomatis." : charge.error);
      return;
    }
    setPaying(true);
    setError("");
    trackFroyek("checkout_started", { plan: planId });
    const response = await fetch("/api/checkout/mayar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "froyek",
        froyekPlan: planId,
        promoCode: draft.promo,
        product: charge.product,
        customerName: draft.name,
        email: draft.email,
        mobile: draft.phone,
        bumpTaken: false,
        amount: charge.amount,
        paymentMethod: "qris",
      }),
    });
    const json = await response.json().catch(() => ({}));
    setPaying(false);
    if (!response.ok || !json.ok) {
      setError(json.error || "Pembayaran belum bisa dibuat. Kamu bisa mencoba lagi.");
      trackFroyek("payment_failed", { plan: planId });
      emitFroyekToast("payment_fail");
      return;
    }
    if (json.redirectUrl) {
      setPaymentUrl(json.redirectUrl);
      setPaymentId(String(json.paymentId || ""));
    }
  }

  if (!ready) return <p className="p-8 text-slate-600">Menyiapkan pertanyaan…</p>;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8">
      <a href="/" className="text-sm font-semibold text-emerald-700">Kembali ke beranda</a>
      <p className="mt-6 text-sm text-slate-500">Langkah {draft.step + 1} dari {STEPS.length}</p>
      <div className="mt-2 h-2 rounded-full bg-slate-100" aria-hidden>
        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-8 flex-1">
        {stepName === "role" ? <Choice title="Kamu mengerjakan proyek sebagai apa?" options={CHOICES.role} onPick={(value) => answer({ role: value })} /> : null}
        {stepName === "team" ? <Choice title="Berapa orang yang perlu masuk ke akun yang sama?" options={CHOICES.team} onPick={(value) => answer({ team: value })} /> : null}
        {stepName === "project" ? <Choice title="Proyek seperti apa yang paling sering kamu kerjakan?" options={CHOICES.project} onPick={(value) => answer({ projectType: value })} /> : null}
        {stepName === "scale" ? <Choice title="Berapa skala pekerjaan yang ingin kamu kelola?" options={CHOICES.scale} onPick={(value) => answer({ scale: value })} /> : null}
        {stepName === "problem" ? <Choice title="Masalah mana yang paling mengganggu sekarang?" options={CHOICES.problem} onPick={(value) => answer({ problem: value })} /> : null}
        {stepName === "features" ? (
          <fieldset>
            <legend className="text-2xl font-bold text-slate-900">Fitur mana yang paling kamu butuhkan?</legend>
            <div className="mt-4 grid gap-2">
              {CHOICES.features.map(([value, label]) => (
                <label key={value} className="flex gap-2 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={draft.answers.features.includes(value)}
                    onChange={(event) => {
                      const features = event.target.checked
                        ? [...draft.answers.features, value]
                        : draft.answers.features.filter((item) => item !== value);
                      save({ ...draft, answers: { ...draft.answers, features } });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <button type="button" className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => answer({})}>Lanjut</button>
          </fieldset>
        ) : null}
        {stepName === "result" ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{plan.name}</h1>
            <p className="mt-2 text-emerald-700">{plan.priceLabel} · {plan.period}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
              {(preset === planId ? [plan.summary] : recommendation.reasons).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            <p className="mt-4 text-sm text-slate-500">{plan.summary}</p>
            {plan.contactOnly ? (
              <p className="mt-4 text-slate-700">
                {isPlaceholder(content.branding.contactEmail)
                  ? "Harga Enterprise belum diisi. Hubungi admin lewat kontak di beranda."
                  : `Hubungi ${content.branding.contactEmail} untuk paket ini.`}
              </p>
            ) : (
              <button type="button" className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => go(draft.step + 1)}>Lanjut isi data</button>
            )}
          </div>
        ) : null}
        {stepName === "name" ? <Field label="Nama yang akan tercatat di akun" value={draft.name} onChange={(name) => save({ ...draft, name })} onNext={() => draft.name.trim().length >= 2 ? go(draft.step + 1) : setError("Isi nama, minimal 2 huruf.")} /> : null}
        {stepName === "email" ? <Field label="Email untuk akses dan tanda terima" value={draft.email} type="email" onChange={(email) => save({ ...draft, email })} onNext={() => draft.email.includes("@") ? go(draft.step + 1) : setError("Isi email yang bisa dihubungi.")} /> : null}
        {stepName === "phone" ? <Field label="Nomor WhatsApp" value={draft.phone} onChange={(phone) => save({ ...draft, phone })} onNext={() => draft.phone.replace(/\D/g, "").length >= 9 ? go(draft.step + 1) : setError("Isi nomor yang bisa dihubungi.")} /> : null}
        {stepName === "summary" ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ringkasan</h1>
            <p className="mt-3 text-slate-700">{plan.name} untuk {draft.name}</p>
            <p className="text-slate-600">{charge.ok && !charge.contact ? `Rp ${charge.amount.toLocaleString("id-ID")}` : plan.priceLabel}</p>
            <label className="mt-4 block text-sm text-slate-700">Kode promo, kalau ada
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={draft.promo} onChange={(event) => save({ ...draft, promo: event.target.value })} />
            </label>
            <p className="mt-2 text-sm text-slate-500">Periode yang tertera: {plan.period}. Tidak ada harga tahunan sampai admin mengisinya.</p>
            <label className="mt-4 flex gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.optIn} onChange={(event) => save({ ...draft, optIn: event.target.checked })} />
              Kirim satu pengingat bantuan jika saya belum selesai. Bukan diskon.
            </label>
            <button type="button" className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => go(draft.step + 1)}>Lanjut bayar</button>
          </div>
        ) : null}
        {stepName === "pay" ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
            <p className="mt-2 text-slate-600">Pembayaran diproses Mayar, sama seperti checkout Estimator. Lisensi Froyek diaktifkan setelah pembayaran terkonfirmasi.</p>
            {paymentUrl ? (
              <div className="mt-4">
                <a className="font-semibold text-emerald-700" href={paymentUrl}>Buka halaman bayar</a>
                <button
                  type="button"
                  className="mt-4 block rounded-xl border border-emerald-700 px-4 py-2 font-semibold text-emerald-800"
                  onClick={async () => {
                    if (!paymentId) return;
                    const status = await fetch(`/api/checkout/mayar?id=${encodeURIComponent(paymentId)}`).then((res) => res.json()).catch(() => null);
                    if (status?.isPaid) {
                      trackFroyek("payment_success", { plan: planId });
                      emitFroyekToast("payment_ok");
                      window.location.href = "/pilih/sukses";
                      return;
                    }
                    setError("Pembayaran belum masuk. Kamu bisa mencoba lagi atau mengganti metode di halaman bayar.");
                    trackFroyek("payment_failed", { plan: planId });
                    emitFroyekToast("payment_fail");
                  }}
                >
                  Saya sudah membayar
                </button>
              </div>
            ) : (
              <button type="button" className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" disabled={paying} onClick={pay}>
                {paying ? "Menyiapkan…" : "Buat pembayaran"}
              </button>
            )}
            <button type="button" className="mt-4 block text-sm text-slate-500" onClick={() => { trackFroyek("wizard_abandoned", { step: "pay" }); void remindOnce(); }}>
              Berhenti dulu
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p> : null}
      </div>
      {draft.step > 0 ? (
        <button type="button" className="mt-6 self-start text-sm font-semibold text-slate-600" onClick={() => go(draft.step - 1)}>Kembali</button>
      ) : null}
    </main>
  );
}

function Choice({
  title,
  options,
  onPick,
}: {
  title: string;
  options: readonly (readonly [string, string])[];
  onPick: (value: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-4 grid gap-2">
        {options.map(([value, label]) => (
          <button key={value} type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-left font-medium text-slate-800 hover:border-emerald-600" onClick={() => onPick(value)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  onChange,
  onNext,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onNext(); }}>
      <label className="text-2xl font-bold text-slate-900">{label}
        <input className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-3 text-base font-normal" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <button type="submit" className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Lanjut</button>
    </form>
  );
}
