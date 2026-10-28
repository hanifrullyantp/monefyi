"use client";

import { BRANDS, type BrandId } from "@/lib/brand/brand.config";
import { cn } from "@/lib/utils/cn";

type Variant = "mark" | "lockup-light" | "lockup-dark";

type Props = {
  variant?: Variant;
  brand?: BrandId;
  /** Height in px for mark; lockup scales proportionally */
  size?: number;
  className?: string;
  alt?: string;
};

const ASSET_KEY: Record<Variant, "mark" | "lockupLight" | "lockupDark"> = {
  mark: "mark",
  "lockup-light": "lockupLight",
  "lockup-dark": "lockupDark",
};

export function BrandLogo({
  variant = "mark",
  brand = "estimator",
  size = 32,
  className,
  alt,
}: Props) {
  const def = BRANDS[brand];
  const src = def.assets[ASSET_KEY[variant]];
  const isLockup = variant !== "mark";
  const height = size;
  const width = isLockup ? Math.round(size * 4.4) : size;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? def.name}
      width={width}
      height={height}
      className={cn("object-contain shrink-0", className)}
      style={{ height, width: isLockup ? "auto" : height, maxHeight: height }}
    />
  );
}
