"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils/cn";

type Props = {
  className?: string;
  alt?: string;
  /** mark = ikon saja; lockup = ikon + wordmark */
  variant?: "mark" | "lockup-light" | "lockup-dark";
  size?: number;
};

/** Backward-compatible wrapper → BrandLogo Estimator */
export function EstimatorLogo({
  className,
  alt = "Estimator",
  variant = "lockup-light",
  size = 32,
}: Props) {
  return (
    <BrandLogo
      brand="estimator"
      variant={variant}
      size={size}
      alt={alt}
      className={cn(className)}
    />
  );
}
