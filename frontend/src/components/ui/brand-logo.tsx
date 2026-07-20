import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export default function BrandLogo({
  className,
  imageClassName,
  textClassName,
  showText = true,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/brand-logo.png"
        alt="Find a Client logo"
        width={34}
        height={34}
        priority
        className={cn("h-8 w-8 rounded-md object-cover", imageClassName)}
      />
      {showText ? (
        <span className={cn("text-lg font-bold tracking-tight text-neutral-900", textClassName)}>Find a Client</span>
      ) : null}
    </div>
  );
}