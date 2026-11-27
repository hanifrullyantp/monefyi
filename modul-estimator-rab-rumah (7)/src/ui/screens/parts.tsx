import { ShieldCheck } from "lucide-react";

export function AIProviderGuardNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-2.5">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />
      <div>
        <p className="text-[10px] font-bold text-[#4b356c]">AI hanya menafsirkan dan mengusulkan field model.</p>
        <p className="mt-0.5 text-[9px] leading-4 text-[#6f5d88]">Engine menolak payload AI yang memuat rupiah, volume, koefisien, atau pajak. Jika output gagal validasi, modul menampilkan “perlu input manual” tanpa fallback diam-diam.</p>
      </div>
    </div>
  );
}

export function StatusNote({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "green" | "blue" }) {
  const tones = {
    amber: "border-[#f5dfb0] bg-[#fffaf0] text-[#8b621d]",
    green: "border-[#c9e7da] bg-[#f4fbf7] text-[#28604b]",
    blue: "border-[#dbeafe] bg-[#f6f9ff] text-[#1e40af]",
  };
  return <div className={`rounded-xl border px-3 py-2.5 text-[9.5px] leading-4 ${tones[tone]}`}>{children}</div>;
}
