import { cn } from "@/lib/utils/cn";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** Konten landing publik — max 960px, padding token. */
export function Container({ children, className }: ContainerProps) {
  return <div className={cn("lp-container", className)}>{children}</div>;
}
