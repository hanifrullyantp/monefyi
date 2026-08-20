import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

export function Container({ children, className, size = "xl" }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-6", sizeClasses[size], className)}>
      {children}
    </div>
  );
}
