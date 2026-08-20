"use client";
import { useState } from "react";
import { ShieldCheck, ChevronDown, ArrowRight, MessageCircle } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export function GuaranteeFaqSection() {
  const { content } = useContentStore();
  const { guaranteeFaq } = content;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section id="faq" className="py-24 md:py-32 bg-white">
      <div
        ref={ref}
        className={cn(
          "max-w-3xl mx-auto px-6 transition-all duration-500",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Guarantee */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight mt-8">
            {guaranteeFaq.guarantee.title}
          </h2>
          <p className="text-lg text-slate-600 mt-6 leading-[1.7] max-w-2xl mx-auto">
            {guaranteeFaq.guarantee.description}
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <p className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase mb-8 text-center">
            {guaranteeFaq.faqLabel}
          </p>

          <div className="space-y-3">
            {guaranteeFaq.faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-200 rounded-2xl bg-white overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  aria-expanded={openIndex === i}
                >
                  <span className="text-base md:text-lg font-semibold text-slate-900 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-6">
                    <div className="text-slate-600 leading-[1.7] whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact links */}
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500">{guaranteeFaq.contactLinks.text}</p>
            <div className="mt-3 flex items-center justify-center gap-6 flex-wrap">
              {guaranteeFaq.contactLinks.links.map((link, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-sm text-slate-400 mr-2">atau</span>}
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
                  >
                    {i === 0 ? (
                      <ArrowRight className="w-4 h-4" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                    {link.text}
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
