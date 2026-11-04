"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, FileText, MessageCircle } from "lucide-react";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { trackEvent } from "@/lib/analytics/events";
import "@/styles/hero-estimator-demo.css";

const TOTAL_START = 63_145_000;
const TOTAL_END = 86_055_000;
const PROGRESS_PCT = 25;

const STEPS = [
  "Semua estimasi terpantau dalam satu layar",
  "Buka proyek — status, klien, dan total penawaran langsung terlihat",
  "Tambah item dari pricelist kelompok kerja",
  "Total penawaran terhitung otomatis",
  "Kirim template penawaran ke WhatsApp dengan sekali klik",
] as const;

function fmtRp(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type HeroEstimatorDemoAnimationProps = {
  pulseToken?: number;
};

export function HeroEstimatorDemoAnimation({ pulseToken = 0 }: HeroEstimatorDemoAnimationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const q = (sel: string) => root.querySelector<HTMLElement>(sel);
    const stage = q(".hed-scroll");
    if (!stage) return;

    const pos = (el: HTMLElement) => {
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    };

    const cur = q("#hed-cursor");
    let cancelled = false;

    const move = async (el: HTMLElement, ms = 750) => {
      if (!cur) return;
      const p = pos(el);
      cur.style.left = `${p.x}px`;
      cur.style.top = `${p.y}px`;
      await wait(ms + 80);
    };

    const tap = async (el: HTMLElement) => {
      await move(el);
      cur?.classList.add("press");
      el.classList.add("hed-pulse");
      await wait(160);
      cur?.classList.remove("press");
      await wait(180);
      el.classList.remove("hed-pulse");
    };

    const show = (id: string) => {
      root.querySelectorAll(".hed-scr").forEach((s) => {
        s.classList.toggle("on", s.id === id);
      });
    };

    const sheet = (open: boolean) => {
      q("#hed-sheet")?.classList.toggle("open", open);
      q("#hed-dim")?.classList.toggle("on", open);
    };

    const pane = (id: string) => {
      root.querySelectorAll(".hed-pane").forEach((p) => {
        p.classList.toggle("on", p.id === id);
      });
    };

    const caption = (i: number) => {
      const c = q("#hed-cap");
      if (!c) return;
      c.style.opacity = "0";
      window.setTimeout(() => {
        if (cancelled) return;
        c.textContent = STEPS[i] ?? "";
        c.style.opacity = "1";
      }, 250);
      root.querySelectorAll(".hed-dots i").forEach((d, k) => {
        d.classList.toggle("on", k === i);
      });
    };

    const count = (el: HTMLElement, from: number, to: number, ms: number) =>
      new Promise<void>((res) => {
        const t0 = performance.now();
        const frame = (t: number) => {
          const k = Math.min((t - t0) / ms, 1);
          const e = 1 - (1 - k) ** 3;
          el.textContent = fmtRp(from + (to - from) * e);
          if (k < 1) requestAnimationFrame(frame);
          else res();
        };
        requestAnimationFrame(frame);
      });

    const reset = () => {
      show("hed-s-dash");
      sheet(false);
      pane("hed-p-groups");
      const ni = q("#hed-new-item");
      if (ni) {
        ni.classList.remove("in");
        ni.style.display = "none";
      }
      root.querySelectorAll(".hed-cb").forEach((c) => c.classList.remove("on"));
      root.querySelectorAll(".hed-crow").forEach((r) => r.classList.remove("hl"));
      const tot = q("#hed-tot-val");
      if (tot) tot.textContent = fmtRp(TOTAL_START);
      const ic = q("#hed-item-count");
      if (ic) ic.textContent = "6 item";
      const b = q("#hed-btn-add");
      if (b) {
        b.textContent = "Tambah ke estimasi (0)";
        b.classList.remove("on");
      }
      q("#hed-wam")?.classList.remove("on");
      q("#hed-wa-open")?.classList.remove("on");
      if (cur) {
        cur.style.transition = "none";
        cur.style.left = "50%";
        cur.style.top = "85%";
        void cur.offsetHeight;
        cur.style.transition = "";
      }
    };

    const run = async () => {
      while (!cancelled) {
        reset();
        await wait(900);
        caption(0);
        await wait(2200);

        const card = q("#hed-card-paris");
        if (card) await tap(card);
        show("hed-s-detail");
        caption(1);
        await wait(1900);

        const tambah = q("#hed-btn-tambah");
        if (tambah) await tap(tambah);
        sheet(true);
        await wait(650);

        const kitchen = q("#hed-grp-kitchen");
        if (kitchen) await tap(kitchen);
        pane("hed-p-items");
        caption(2);
        await wait(900);

        const row = q("#hed-cb-bawah-row");
        if (row) await tap(row);
        q("#hed-cb-bawah")?.classList.add("on");
        row?.classList.add("hl");
        const addBtn = q("#hed-btn-add");
        if (addBtn) {
          addBtn.textContent = "Tambah ke estimasi (1)";
          addBtn.classList.add("on");
        }
        await wait(500);

        if (addBtn) await tap(addBtn);
        sheet(false);
        await wait(500);

        const ni = q("#hed-new-item");
        if (ni) {
          ni.style.display = "flex";
          requestAnimationFrame(() => requestAnimationFrame(() => ni.classList.add("in")));
        }
        const ic = q("#hed-item-count");
        if (ic) ic.textContent = "7 item";
        caption(3);
        const tot = q("#hed-tot-val");
        if (tot) await count(tot, TOTAL_START, TOTAL_END, 1000);
        await wait(700);

        const wa = q("#hed-btn-wa");
        if (wa) await tap(wa);
        q("#hed-wam")?.classList.add("on");
        caption(4);
        await wait(1600);

        const send = q("#hed-wa-send");
        if (send) await tap(send);
        q("#hed-wa-open")?.classList.add("on");
        await wait(1800);
        q("#hed-wam")?.classList.remove("on");
        q("#hed-wa-open")?.classList.remove("on");
        await wait(2000);
      }
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      reset();
      caption(3);
      const tot = q("#hed-tot-val");
      if (tot) tot.textContent = fmtRp(TOTAL_END);
      return;
    }

    const io = new IntersectionObserver(
      (es) => {
        if (!es[0]?.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        io.disconnect();
        trackEvent("view_hero", { variant_id: "hero_animation_demo" });
        reset();
        void run();
      },
      { threshold: 0.25 },
    );
    io.observe(root);

    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return (
    <PhoneMockup pulseToken={pulseToken}>
      <div id="hero-estimator-demo" ref={rootRef} aria-label="Demo alur Estimator">
        <div className="hed-scroll pt-10">
          {/* Daftar estimasi */}
          <div className="hed-scr on" id="hed-s-dash">
            <div className="hed-body">
              <div className="hed-dash-hero">
                <p className="hed-lbl">Estimasi baru · 30 hari</p>
                <div className="hed-big">
                  1 <small>dari 4 total</small>
                </div>
                <div className="hed-bar">
                  <i style={{ width: `${PROGRESS_PCT}%` }} />
                </div>
                <span className="hed-newbtn">+ Baru</span>
              </div>
              <div className="hed-row2">
                <div className="hed-mini hed-blue">
                  <p className="hed-lbl">Active</p>
                  <div className="hed-big2">4</div>
                  <div>project</div>
                  <b>Rp 318 jt</b>
                </div>
                <div className="hed-mini hed-purple">
                  <p className="hed-lbl">Leads</p>
                  <div className="hed-big2">0</div>
                  <div>project</div>
                  <b>Rp 0</b>
                </div>
              </div>
              <div className="hed-sec">
                <span>Total 4 estimasi</span>
              </div>
              <ListCard
                bar="#10b981"
                title="Gg djali Parit Bugis"
                sub="Novia · Update hari ini"
                value="Rp 33 jt"
                profit="Rp 12 jt"
              />
              <ListCard
                bar="#10b981"
                title="Karet"
                sub="Verita · Update hari ini"
                value="Rp 45 jt"
                profit="Rp 17 jt"
                pill="Active"
              />
              <ListCard
                id="hed-card-paris"
                bar="#10b981"
                title="Kc full Paris 2"
                sub="Bu Lisa · Update 1 hari lalu"
                value="Rp 63 jt"
                profit="Rp 29 jt"
                pill="Active"
              />
            </div>
          </div>

          {/* Detail estimasi */}
          <div className="hed-scr" id="hed-s-detail">
            <div className="hed-detail-hdr">
              <ChevronLeft className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
              <span className="hed-code">EST-2026-037</span>
            </div>
            <div className="hed-body" style={{ paddingBottom: 96 }}>
              <div className="hed-dhero">
                <span className="hed-badge">Active</span>
                <span className="hed-source">Sumber: Manual</span>
                <div className="hed-dt">Kc full Paris 2</div>
                <div className="hed-dsub">Bu Lisa</div>
                <div className="hed-dmeta">
                  <span id="hed-item-count">6 item</span> · Update 1 hari lalu
                </div>
              </div>
              <div className="hed-sec">
                <span>Rincian Produk</span>
                <span className="hed-addbtn" id="hed-btn-tambah">
                  + Tambah
                </span>
              </div>
              <ProductRow name="Backsplash" meta="7,9 m × Rp 500.000" price="Rp 3.950.000" />
              <ProductRow name="Kabinet Atas" meta="7,9 m × Rp 2.900.000" price="Rp 22.910.000" />
              <ProductRow
                id="hed-new-item"
                className="hed-nitem"
                name="Kabinet Bawah"
                meta="7,9 m × Rp 2.900.000"
                price="Rp 22.910.000"
              />
            </div>
            <div className="hed-tot">
              <div>
                <div className="hed-lbl">Total penawaran</div>
                <b id="hed-tot-val">{fmtRp(TOTAL_START)}</b>
              </div>
              <div className="flex gap-2">
                <span className="hed-iconbtn" aria-hidden>
                  <FileText className="w-4 h-4" />
                </span>
                <span className="hed-iconbtn" id="hed-btn-wa" title="Kirim WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="hed-dim" id="hed-dim" />
          <div className="hed-sheet" id="hed-sheet">
            <div className="flex-1 min-h-0 relative">
              <div className="hed-pane on" id="hed-p-groups">
                <div className="hed-ph">
                  Pricelist
                  <small>Pilih kelompok kerja, lalu item rinciannya</small>
                </div>
                <div className="hed-search">Cari item atau kelompok kerja...</div>
                <div className="hed-grid">
                  <div className="hed-gc hl" id="hed-grp-kitchen">
                    <b>Kitchen Set</b>
                    Kitchen set custom · 10 item
                  </div>
                  <div className="hed-gc">
                    <b>Kanopi</b>
                    Baja ringan · 1 item
                  </div>
                  <div className="hed-gc">
                    <b>Lemari</b>
                    Kelompok custom · 1 item
                  </div>
                  <div className="hed-gc">
                    <b>Videotron</b>
                    Kelompok custom · 1 item
                  </div>
                </div>
              </div>
              <div className="hed-pane" id="hed-p-items">
                <div className="hed-ph">← Kitchen Set</div>
                <div className="hed-search">Cari item...</div>
                <PricelistRow name="Backsplash" meta="Borongan · m · Rp 500.000" />
                <PricelistRow name="Kabinet Atas" meta="Borongan · m · Rp 2.900.000" checked />
                <PricelistRow
                  id="hed-cb-bawah-row"
                  name="Kabinet Bawah"
                  meta="Borongan · m · Rp 2.900.000"
                  cbId="hed-cb-bawah"
                />
                <PricelistRow name="Lemari Elektronik" meta="Borongan · m · Rp 2.900.000" />
              </div>
            </div>
            <div className="hed-sfoot">
              <span className="no">Batal</span>
              <span className="yes" id="hed-btn-add">
                Tambah ke estimasi (0)
              </span>
            </div>
          </div>

          <div className="hed-wam" id="hed-wam">
            <div className="hed-wam-card">
              <div className="hed-wam-h">
                <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <b>Kirim WhatsApp</b>
              </div>
              <div className="hed-wam-body">
                <div className="hed-tabs">
                  <span>Follow-up</span>
                  <span className="on">Penawaran</span>
                  <span>Penagihan</span>
                </div>
                <label className="hed-chk">
                  <input type="checkbox" checked readOnly className="rounded border-slate-300 text-emerald-600" />
                  Lampirkan PDF penawaran
                </label>
                <p className="text-[10px] text-slate-500 mt-2 line-clamp-4">
                  Berikut harga penawarannya… Total: {fmtRp(TOTAL_END)}
                </p>
              </div>
              <div className="hed-sfoot">
                <span className="no">Batal</span>
                <span className="yes on flex items-center justify-center gap-1" id="hed-wa-send">
                  <MessageCircle className="w-4 h-4" />
                  Kirim
                </span>
              </div>
            </div>
          </div>
          <div className="hed-wa-open" id="hed-wa-open">
            <MessageCircle className="w-10 h-10" />
            <b>Membuka WhatsApp…</b>
          </div>

          <div id="hed-cursor">
            <i />
          </div>

          <div className="hed-cap-wrap">
            <div id="hed-cap" />
            <div className="hed-dots">
              {STEPS.map((_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

function ListCard({
  id,
  bar,
  title,
  sub,
  value,
  profit,
  pill,
}: {
  id?: string;
  bar: string;
  title: string;
  sub: string;
  value: string;
  profit: string;
  pill?: string;
}) {
  return (
    <div className="hed-item" id={id}>
      <div className="hed-item-inner">
        <div className="hed-item-bar" style={{ background: bar }} />
        <div className="min-w-0 flex-1 pl-2">
          <div className="hed-nm">
            {title}
            {pill ? <span className="hed-pill active">{pill}</span> : null}
          </div>
          <div className="hed-sub">{sub}</div>
        </div>
      </div>
      <div className="hed-pr">
        {value}
        <small>{profit}</small>
      </div>
    </div>
  );
}

function ProductRow({
  id,
  className = "",
  name,
  meta,
  price,
}: {
  id?: string;
  className?: string;
  name: string;
  meta: string;
  price: string;
}) {
  return (
    <div className={`hed-item ${className}`} id={id} style={{ display: id === "hed-new-item" ? "none" : undefined }}>
      <div className="min-w-0 flex-1">
        <div className="hed-nm">{name}</div>
        <div className="hed-sub" style={{ color: "#64748b" }}>
          {meta}
        </div>
      </div>
      <div className="hed-pr">{price}</div>
    </div>
  );
}

function PricelistRow({
  id,
  name,
  meta,
  checked,
  cbId,
}: {
  id?: string;
  name: string;
  meta: string;
  checked?: boolean;
  cbId?: string;
}) {
  return (
    <div className="hed-crow" id={id}>
      <span className={`hed-cb${checked ? " on" : ""}`} id={cbId} />
      <div className="t">
        {name}
        <small>{meta}</small>
      </div>
    </div>
  );
}
