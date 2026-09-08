import { ESTIMATOR_LOGO_SRC } from "@/lib/brand/estimatorBrand";
import { cn } from "@/lib/utils/cn";

type Props = {
  className?: string;
  alt?: string;
};

export function EstimatorLogo({
  className = "w-8 h-8 object-contain shrink-0",
  alt = "Monefyi Estimator",
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ESTIMATOR_LOGO_SRC} alt={alt} className={cn(className)} />
  );
}
