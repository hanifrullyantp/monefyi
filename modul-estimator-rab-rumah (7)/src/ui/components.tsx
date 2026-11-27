import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, Check, CheckCircle2, Info, LoaderCircle, Sparkles, X } from "lucide-react";
import { cn } from "../utils/cn";
import type { ConfidenceLabel, Provenance } from "../data/types";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "finance" | "danger" | "ai"; size?: "sm" | "md" | "lg" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-accent text-white hover:bg-[#11694f] active:bg-[#0d5842] shadow-[0_1px_2px_rgba(6,78,59,.2)]",
    secondary: "bg-white text-ink border border-line hover:border-[#cbd7d2] hover:bg-[#fafcfb]",
    ghost: "text-muted hover:text-ink hover:bg-[#eef3f0]",
    finance: "bg-finance text-white hover:bg-[#1a44bd]",
    danger: "bg-[#fef2f2] text-danger border border-[#fecaca] hover:bg-[#fee2e2]",
    ai: "bg-ai text-white hover:bg-[#6d28d9]",
  };
  const sizes = { sm: "min-h-[38px] px-3 text-[12px]", md: "min-h-[44px] px-4 text-[13px]", lg: "min-h-[50px] px-5 text-[14px]" };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors hover:bg-[#f7faf8] hover:text-ink", className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[18px] border border-line bg-card soft-shadow", className)} {...props}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, tone = "accent", className }: { children: ReactNode; tone?: "accent" | "ai" | "muted" | "finance"; className?: string }) {
  const tones = { accent: "text-accent", ai: "text-[#6d28d9]", muted: "text-label", finance: "text-finance" };
  return <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em]", tones[tone], className)}>{children}</span>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet"; className?: string }) {
  const tones = {
    neutral: "bg-[#f3f6f4] text-muted border-[#e5eae8]",
    green: "bg-[#ecfdf5] text-[#047857] border-[#bbf7d0]",
    amber: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
    red: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
    blue: "bg-[#eff6ff] text-finance border-[#dbeafe]",
    violet: "bg-ai-soft text-[#6d28d9] border-ai-line",
  };
  return <span className={cn("inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold leading-5", tones[tone], className)}>{children}</span>;
}

export function statusTone(label: ConfidenceLabel | "warning" | "ok") {
  if (label === "Akurat" || label === "ok") return "green" as const;
  if (label === "Perlu cek" || label === "warning") return "amber" as const;
  return "red" as const;
}

export function ConfidenceBadge({ label, className }: { label: ConfidenceLabel; className?: string }) {
  return (
    <Badge tone={statusTone(label)} className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", label === "Akurat" ? "bg-success" : label === "Perlu cek" ? "bg-warning" : "bg-danger")} aria-hidden />
      {label}
    </Badge>
  );
}

export function SourceTag({ source, note }: { source: Provenance; note?: string }) {
  const labels: Record<Provenance, string> = {
    pengguna: "dari kamu",
    usulan_ai: "usulan AI",
    aturan_parametrik: "aturan otomatis",
    default_config: "default",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold", source === "pengguna" ? "text-accent" : source === "usulan_ai" ? "text-[#6d28d9]" : "text-label")}>
      {note?.includes("koreksi sebelumnya") && <Sparkles className="h-2.5 w-2.5" />}
      {note?.includes("koreksi sebelumnya") ? "dari koreksi sebelumnya" : labels[source]}
    </span>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
        active ? "border-[#a7d7c6] bg-[#eaf7f1] text-[#0d6b50]" : "border-line bg-white text-muted hover:border-[#cbd7d2] hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Meter({ value, compact = false, label }: { value: number; compact?: boolean; label?: string }) {
  const tone = value >= 75 ? "bg-success" : value >= 55 ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("w-full", compact ? "" : "space-y-1.5")}>
      {!compact && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-muted">{label ?? "Akurasi data"}</span>
          <span className="font-extrabold text-ink">{value}%</span>
        </div>
      )}
      <div className={cn("relative overflow-hidden rounded-full bg-[#e8eeeb]", compact ? "h-1.5" : "h-2")} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Akurasi data"}>
        <div className={cn("meter-fill h-full rounded-full", tone)} style={{ width: `${Math.min(100, Math.max(3, value))}%` }} />
      </div>
    </div>
  );
}

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(function SearchField({ className, icon, ...props }, ref) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label" aria-hidden>{icon}</span>
      <input ref={ref} className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13px] font-medium text-ink outline-none transition-colors placeholder:text-label focus:border-[#a7d7c6] focus:ring-3 focus:ring-[#dcf3e9]" {...props} />
    </div>
  );
});

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center justify-between text-[11px] font-bold text-[#405160]">
        <span>{label}</span>
        {hint && <span className="font-medium text-label">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}

export const inputClass = "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[13px] font-medium text-ink outline-none transition-colors placeholder:text-label focus:border-[#a7d7c6] focus:ring-3 focus:ring-[#dcf3e9]";

export function AIInsightCard({ children, title = "Analisa AI", action }: { children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-ai-line bg-ai-soft p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ede9fe] text-[#6d28d9]"><Sparkles className="h-3.5 w-3.5" /></span>
          <Eyebrow tone="ai">{title}</Eyebrow>
        </div>
        {action}
      </div>
      <div className="text-[12px] leading-5 text-[#4c3e68]">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, compact }: { icon: ReactNode; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d7e1dc] bg-[#fbfdfc] px-5 text-center", compact ? "py-8" : "py-14")}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white text-accent">{icon}</div>
      <p className="text-[14px] font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-5 text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Memuat data" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2"><div className="skeleton h-3 w-2/3 rounded" /><div className="skeleton h-2.5 w-1/3 rounded" /></div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[14px] border border-[#fecaca] bg-[#fef2f2] p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-[12px] font-bold text-[#991b1b]">Ada yang perlu dicek</p>
        <p className="mt-0.5 text-[11px] leading-4 text-[#b91c1c]">{message}</p>
      </div>
      {onRetry && <button onClick={onRetry} className="shrink-0 text-[11px] font-bold text-[#991b1b] underline">Coba lagi</button>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  panelClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0f172a]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("slide-up sm:pop-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-white sm:rounded-[20px]", sizes[size], panelClassName)}>
        <div className="flex items-start justify-between gap-4 border-b border-[#eef2f0] px-5 py-4">
          <div>
            <h2 className="text-[16px] font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
            {description && <p className="mt-1 text-[12px] leading-5 text-muted">{description}</p>}
          </div>
          <IconButton label="Tutup" onClick={onClose} className="h-9 w-9 border-0 bg-[#f4f7f5]"><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-[#eef2f0] bg-[#fbfdfc] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function DataBanner({ onLearn }: { onLearn?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-[#f5dfb0] bg-[#fffaf0] px-3 py-2 text-[10.5px] leading-4 text-[#925b0a]" role="status">
      <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-[0.07em]"><AlertTriangle className="h-3.5 w-3.5" /> Data contoh</span>
      <span className="text-[#9a6a20]">Belum untuk RAB nyata.</span>

      {onLearn && <button onClick={onLearn} className="ml-auto inline-flex items-center gap-1 font-bold text-[#925b0a] underline decoration-[#e8c884] underline-offset-2">Pelajari data <ArrowRight className="h-3 w-3" /></button>}
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }: { toasts: { id: string; title: string; detail?: string; tone: "success" | "info" | "warning" | "danger" }[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[154px] z-[120] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warning" ? AlertTriangle : toast.tone === "danger" ? AlertCircle : Info;
        return (
          <div key={toast.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border border-line bg-white p-3.5 shadow-[0_16px_48px_-12px_rgba(15,23,42,.28)]">
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", toast.tone === "success" ? "bg-[#ecfdf5] text-accent" : toast.tone === "warning" ? "bg-[#fffbeb] text-warning" : toast.tone === "danger" ? "bg-[#fef2f2] text-danger" : "bg-[#eff6ff] text-finance")}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold leading-4 text-ink">{toast.title}</p>
              {toast.detail && <p className="mt-0.5 text-[11px] leading-4 text-muted">{toast.detail}</p>}
            </div>
            <button aria-label="Tutup notifikasi" onClick={() => onDismiss(toast.id)} className="text-label hover:text-ink"><X className="h-3.5 w-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}

export function InlineCheck({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-4">
      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", checked ? "bg-[#dcfce7] text-[#047857]" : "bg-[#fef3c7] text-[#b45309]")}>
        {checked ? <Check className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
      </span>
      <span className={checked ? "font-medium text-[#405160]" : "font-medium text-[#8a5a0a]"}>{label}</span>
    </div>
  );
}

export function Spinner() {
  return <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />;
}
