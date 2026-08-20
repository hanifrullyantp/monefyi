"use client";
import { Star, MessageCircle } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import { useInView } from "@/lib/hooks/useInView";
import { cn } from "@/lib/utils/cn";

export function TestimonialSection() {
  const { content } = useContentStore();
  const { testimonial } = content;
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section id="cerita" className="py-24 md:py-32 bg-slate-50">
      <div
        ref={ref}
        className={cn(
          "max-w-3xl mx-auto px-6 transition-all duration-600",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold text-emerald-600 tracking-[0.2em] uppercase">
            {testimonial.label}
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mt-6 whitespace-pre-line">
            {testimonial.bigQuote}
          </h2>
          <p className="text-sm text-slate-500 mt-6 font-medium">{testimonial.attribution}</p>
        </div>

        {/* Story */}
        <div className="mt-16 space-y-8">
          {/* Opening — blockquote style */}
          <div className="border-l-4 border-emerald-500 pl-6 py-2">
            {testimonial.story.opening.split("\n\n").map((para, i) => (
              <p key={i} className={cn("text-xl italic text-slate-800 leading-[1.7] font-medium", i > 0 && "mt-4")}>
                {para}
              </p>
            ))}
          </div>

          {/* Subtle divider */}
          <div className="flex justify-center py-4">
            <div className="w-12 h-px bg-emerald-500" />
          </div>

          {/* Turning point */}
          {testimonial.story.turningPoint.split("\n\n").map((para, i) => (
            <p key={i} className="text-lg text-slate-700 leading-[1.8]">
              {para}
            </p>
          ))}

          {/* Transformation */}
          <p className="text-lg text-slate-700 leading-[1.8]">
            {testimonial.story.transformation}
          </p>

          {/* Results */}
          <div className="space-y-3">
            {testimonial.story.results.map((result, i) => (
              <p key={i} className="text-lg text-slate-700 leading-[1.8]">
                {result.includes("%") || result.includes("hire") || result.includes("booking") ? (
                  <strong className="font-semibold text-emerald-700">{result}</strong>
                ) : result}
              </p>
            ))}
          </div>
        </div>

        {/* Big Quote */}
        <div className="my-16 py-12 border-y border-slate-200 text-center">
          <p className="text-2xl md:text-4xl font-bold text-slate-900 leading-[1.2] tracking-tight whitespace-pre-line">
            {testimonial.story.bigQuote}
          </p>
        </div>

        {/* Closing */}
        <p className="text-lg text-slate-700 leading-[1.8]">{testimonial.story.closing}</p>

        {/* Author card */}
        <div className="mt-16 pt-12 border-t border-slate-200 flex items-center gap-4 justify-center flex-wrap">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
            {testimonial.author.initial}
          </div>
          <div className="text-center md:text-left">
            <p className="font-bold text-slate-900">{testimonial.author.name}</p>
            <p className="text-sm text-slate-500">{testimonial.author.title}</p>
            <p className="text-sm text-slate-500">{testimonial.author.duration}</p>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-16 text-center flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {testimonial.socialProof.rating} dari 5
          </p>
          <p className="text-sm text-slate-500">
            Berdasarkan {testimonial.socialProof.reviewCount.toLocaleString("id-ID")}+ ulasan pengguna
          </p>
        </div>
      </div>
    </section>
  );
}
