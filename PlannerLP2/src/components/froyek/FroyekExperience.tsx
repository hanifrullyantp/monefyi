"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useAuthStore } from "@/lib/store/authStore";
import type { FroyekContent } from "@/lib/froyek/schema";
import { isPlaceholder, visibleQuotes } from "@/lib/froyek/schema";
import { useFroyekStore } from "@/lib/froyek/store";
import { trackFroyek } from "@/lib/froyek/track";
import { getSupabaseClient } from "@/lib/supabase/client";
import { T } from "./Text";
import { emitFroyekToast, FroyekToasts } from "./FroyekToasts";

function idr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Landing Froyek.
 * Tujuan tiap section dan metriknya ada di docs/landing/behavior-hypotheses.md.
 */
export function FroyekExperience({ initial }: { initial: FroyekContent }) {
  const content = useFroyekStore((state) => state.content);
  const hydrate = useFroyekStore((state) => state.hydrate);
  const editing = useFroyekStore((state) => state.editing);
  const setEditing = useFroyekStore((state) => state.setEditing);
  const dirty = useFroyekStore((state) => state.dirty);
  const undo = useFroyekStore((state) => state.undo);
  const markClean = useFroyekStore((state) => state.markClean);
  const moveSection = useFroyekStore((state) => state.moveSection);
  const toggleSection = useFroyekStore((state) => state.toggleSection);
  const { isAdmin, isEditMode, setEditMode } = useLandingAdmin();
  const user = useAuthStore((state) => state.user);
  const [variant, setVariant] = useState<"a" | "b">("a");
  const [cookieOn, setCookieOn] = useState(true);
  const [demoOn, setDemoOn] = useState(false);
  const [hours, setHours] = useState(4);
  const [rate, setRate] = useState(50000);
  const [leak, setLeak] = useState(0);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  useEffect(() => {
    setEditing(Boolean(isAdmin && isEditMode));
  }, [isAdmin, isEditMode, setEditing]);

  useEffect(() => {
    const saved = sessionStorage.getItem("froyek_ab");
    const next = saved === "b" ? "b" : saved === "a" ? "a" : Math.random() < 0.5 ? "a" : "b";
    sessionStorage.setItem("froyek_ab", next);
    setVariant(next);
    trackFroyek("page_view", { variant: next });
    setCookieOn(localStorage.getItem("froyek_cookie_ok") === "1");
    const seen = new Set<number>();
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const depth = height <= 0 ? 100 : Math.round((window.scrollY / height) * 100);
      for (const mark of [25, 50, 75, 100]) {
        if (depth >= mark && !seen.has(mark)) {
          seen.add(mark);
          trackFroyek("scroll_depth", { depth: String(mark) });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-section]");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.getAttribute("data-section") || "";
        trackFroyek("section_view", { section: id });
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.4 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [content.sectionOrder, content.sectionVisibility]);

  useEffect(() => {
    const onLeave = (event: MouseEvent) => {
      if (event.clientY > 8) return;
      emitFroyekToast("exit_intent");
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, []);

  const heroTitle = variant === "b" ? content.hero.titleAlt : content.hero.title;
  const heroCta = variant === "b" ? content.hero.ctaAlt : content.hero.cta;
  const monthly = Math.max(0, hours) * Math.max(0, rate) * 4 + Math.max(0, leak);
  const quotes = useMemo(() => visibleQuotes(content), [content]);
  const loggedIn = Boolean(user);

  async function publish() {
    setPublishError("");
    const supabase = getSupabaseClient();
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) {
      setPublishError("Masuk sebagai admin untuk menerbitkan.");
      return;
    }
    const res = await fetch("/api/landing/froyek", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPublishError(json.error || "Gagal menerbitkan");
      return;
    }
    markClean();
  }

  const sections: Record<string, ReactNode> = {
    hero: (
      <header className="px-5 py-16 md:py-24">
        <p className="text-sm font-semibold text-emerald-700"><T path="hero.eyebrow" text={content.hero.eyebrow} /></p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-froyek-display)] text-4xl font-bold leading-tight text-slate-900 md:text-6xl">
          <T path={variant === "b" ? "hero.titleAlt" : "hero.title"} text={heroTitle} />
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600"><T path="hero.subtitle" text={content.hero.subtitle} /></p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a className="rounded-2xl bg-emerald-600 px-5 py-3 text-center font-semibold text-white" href={content.navbar.ctaHref} onClick={() => trackFroyek("cta_click", { section: "hero", variant })}>
            <T path={variant === "b" ? "hero.ctaAlt" : "hero.cta"} text={heroCta} />
          </a>
          <a className="rounded-2xl px-5 py-3 text-center font-semibold text-emerald-800" href="#demo">{content.hero.secondary}</a>
        </div>
      </header>
    ),
    problem: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="problem.title" text={content.problem.title} /></h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {content.problem.scenes.map((scene, index) => (
            <article key={scene.title} className="rounded-2xl bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900"><T path={`problem.scenes.${index}.title`} text={scene.title} /></h3>
              <p className="mt-2 text-slate-600"><T path={`problem.scenes.${index}.body`} text={scene.body} /></p>
            </article>
          ))}
        </div>
      </div>
    ),
    beforeAfter: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="beforeAfter.title" text={content.beforeAfter.title} /></h2>
        <div className="mt-6 grid gap-3">
          {content.beforeAfter.rows.map((row, index) => (
            <div key={row.before} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
              <p className="text-slate-500"><T path={`beforeAfter.rows.${index}.before`} text={row.before} /></p>
              <p className="font-medium text-slate-900"><T path={`beforeAfter.rows.${index}.after`} text={row.after} /></p>
            </div>
          ))}
        </div>
      </div>
    ),
    demo: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="demo.title" text={content.demo.title} /></h2>
        <p className="mt-2 text-sm text-slate-500"><T path="demo.note" text={content.demo.note} /></p>
        <div className="mt-6 max-w-xl rounded-3xl border border-slate-200 bg-white p-5">
          <p className="rounded-2xl bg-slate-50 p-3 text-slate-800">{content.demo.prompt}</p>
          {demoOn ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-slate-800">{content.demo.reply}</p> : null}
          <button
            type="button"
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white"
            onClick={() => {
              if (!demoOn) trackFroyek("demo_started");
              setDemoOn(true);
              trackFroyek("demo_completed");
            }}
          >
            {content.demo.cta}
          </button>
        </div>
      </div>
    ),
    features: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="features.title" text={content.features.title} /></h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {content.features.groups.map((group) => (
            <section key={group.title}>
              <h3 className="font-semibold text-emerald-800">{group.title}</h3>
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.body}</p>
                    <p className="text-xs text-slate-500">{item.available ? "Ada di produk" : "Belum tersedia"}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    ),
    calculator: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="calculator.title" text={content.calculator.title} /></h2>
        <p className="mt-2 max-w-2xl text-slate-600"><T path="calculator.intro" text={content.calculator.intro} /></p>
        <form className="mt-6 grid max-w-xl gap-4" onSubmit={(event) => { event.preventDefault(); trackFroyek("calculator_used"); emitFroyekToast("calculator_done"); }}>
          <label className="text-sm text-slate-700">{content.calculator.hoursLabel}
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={0} value={hours} onChange={(event) => setHours(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">{content.calculator.rateLabel}
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={0} value={rate} onChange={(event) => setRate(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">{content.calculator.leakLabel}
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={0} value={leak} onChange={(event) => setLeak(Number(event.target.value))} />
          </label>
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Hitung</button>
          <p className="text-lg font-semibold text-slate-900">{content.calculator.resultLabel}: {idr(monthly)}</p>
        </form>
      </div>
    ),
    personas: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="personas.title" text={content.personas.title} /></h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.personas.items.map((item) => (
            <article key={item.role} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">{item.role}</h3>
              <p className="mt-2 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    ),
    proof: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{content.proof.title}</h2>
        {quotes.length === 0 ? <p className="mt-4 text-slate-500">Belum ada testimoni yang diverifikasi.</p> : (
          <div className="mt-6 grid gap-4">
            {quotes.map((quote) => (
              <blockquote key={quote.name} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-slate-800">{quote.quote}</p>
                <footer className="mt-2 text-sm text-slate-500">{quote.name} · {quote.role}</footer>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    ),
    steps: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900"><T path="steps.title" text={content.steps.title} /></h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {content.steps.items.map((item, index) => (
            <li key={item.title} className="rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">{index + 1}</p>
              <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-slate-600">{item.body}</p>
            </li>
          ))}
        </ol>
        <a className="mt-6 inline-block font-semibold text-emerald-700" href="/pilih" onClick={() => trackFroyek("cta_click", { section: "steps" })}>Mulai wawancara</a>
      </div>
    ),
    trust: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{content.trust.title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {content.trust.items.map((item) => (
            <article key={item.title}>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    ),
    comparison: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{content.comparison.title}</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr>
                <th className="p-3" />
                {content.comparison.columns.map((column) => <th key={column} className="p-3 text-slate-500">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {content.comparison.rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-200">
                  <th className="p-3 font-medium text-slate-900">{row.label}</th>
                  {row.cells.map((cell) => <td key={cell} className="p-3 text-slate-600">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
    pricing: (
      <div onMouseEnter={() => window.setTimeout(() => emitFroyekToast("idle_pricing"), 20000)}>
        <h2 className="text-3xl font-bold text-slate-900"><T path="pricing.title" text={content.pricing.title} /></h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.pricing.plans.map((plan) => (
            <article key={plan.id} className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{plan.priceLabel}</p>
              <p className="text-sm text-slate-500">{plan.period}</p>
              <p className="mt-3 text-slate-600">{plan.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {plan.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
              <a className="mt-5 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" href={plan.contactOnly ? "#kontak" : `/pilih?paket=${plan.id}`} onClick={() => trackFroyek("cta_click", { section: "pricing", plan: plan.id })}>
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
        <a className="mt-6 inline-block font-semibold text-emerald-800" href="/pilih" onClick={() => trackFroyek("cta_click", { section: "pricing", plan: "help" })}>{content.pricing.helpCta}</a>
      </div>
    ),
    faq: (
      <div>
        <h2 className="text-3xl font-bold text-slate-900">{content.faq.title}</h2>
        <div className="mt-6 space-y-3">
          {content.faq.items.map((item) => (
            <details key={item.q} className="rounded-2xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold text-slate-900">{item.q}</summary>
              <p className="mt-2 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    ),
    finalCta: (
      <div className="rounded-3xl bg-emerald-700 px-6 py-10 text-white">
        <h2 className="text-3xl font-bold"><T path="finalCta.title" text={content.finalCta.title} /></h2>
        <p className="mt-3 max-w-2xl text-emerald-50"><T path="finalCta.body" text={content.finalCta.body} /></p>
        <a className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-emerald-800" href="/pilih" onClick={() => trackFroyek("cta_click", { section: "finalCta" })}>{content.finalCta.cta}</a>
      </div>
    ),
  };

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        ["--brand-600" as string]: content.branding.primary,
        ["--brand-700" as string]: content.branding.primaryDark,
        fontFamily: "var(--font-froyek-sans), Inter, sans-serif",
      }}
    >
      <AuthHydrator />
      <FroyekToasts />
      {content.announcement.enabled && content.sectionVisibility.announcement !== false && !isPlaceholder(content.announcement.text) ? (
        <a className="block bg-emerald-700 px-4 py-2 text-center text-sm text-white" href={content.announcement.href} onClick={() => trackFroyek("cta_click", { section: "announcement" })}>
          {content.announcement.text}
        </a>
      ) : null}
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <a href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <img src={content.branding.logoSrc} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          {content.branding.name}
        </a>
        <div className="flex items-center gap-2">
          <a className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700" href={loggedIn ? "/app" : "/login"} onClick={() => trackFroyek("cta_click", { section: "navbar", target: loggedIn ? "app" : "login" })}>
            {loggedIn ? content.navbar.openAppLabel : content.navbar.loginLabel}
          </a>
          <a className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={content.navbar.ctaHref} onClick={() => trackFroyek("cta_click", { section: "navbar" })}>
            {content.navbar.ctaLabel}
          </a>
        </div>
      </nav>
      <main>
        {content.sectionOrder.map((id) => {
          const node = sections[id];
          if (!node) return null;
          const visible = content.sectionVisibility[id] !== false;
          if (!visible && !editing) return null;
          if (id === "proof" && quotes.length === 0 && !editing) return null;
          return (
            <section key={id} id={id === "faq" ? "faq" : id} data-section={id} className={`mx-auto max-w-6xl px-5 py-12 ${visible ? "" : "opacity-40"}`}>
              {editing ? (
                <div className="mb-3 flex gap-2 text-xs">
                  <button type="button" onClick={() => moveSection(id, -1)}>Naik</button>
                  <button type="button" onClick={() => moveSection(id, 1)}>Turun</button>
                  <button type="button" onClick={() => toggleSection(id)}>{visible ? "Sembunyi" : "Tampil"}</button>
                </div>
              ) : null}
              {node}
            </section>
          );
        })}
      </main>
      <footer id="kontak" className="border-t border-slate-200 bg-slate-50 px-5 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div>
            <p className="font-semibold">{content.branding.name}</p>
            <p className="mt-2 text-sm text-slate-600">{content.footer.blurb}</p>
            <p className="mt-2 text-sm text-slate-500">{isPlaceholder(content.branding.contactEmail) ? "Email diisi dari admin." : content.branding.contactEmail}</p>
          </div>
          {content.footer.columns.map((column) => (
            <div key={column.title}>
              <p className="font-semibold">{column.title}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}><a className="text-emerald-800" href={link.href} onClick={() => trackFroyek("cta_click", { section: "footer" })}>{link.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
      {isAdmin ? (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 rounded-2xl bg-slate-900 p-3 text-sm text-white">
          <button type="button" onClick={() => setEditMode(!isEditMode)}>{isEditMode ? "Tutup edit" : "Mode Edit"}</button>
          {isEditMode ? <button type="button" onClick={undo}>Urungkan</button> : null}
          {isEditMode ? <button type="button" onClick={publish}>Terbitkan{dirty ? " perubahan" : ""}</button> : null}
          {publishError ? <p className="max-w-xs text-amber-200">{publishError}</p> : null}
        </div>
      ) : null}
      {!cookieOn ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>Kami menyimpan peristiwa kunjungan tanpa nama. Data pribadi hanya ikut jika kamu mengizinkan.</p>
          <button type="button" className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white" onClick={() => { localStorage.setItem("froyek_cookie_ok", "1"); setCookieOn(true); }}>Mengizinkan</button>
        </div>
      ) : null}
    </div>
  );
}
