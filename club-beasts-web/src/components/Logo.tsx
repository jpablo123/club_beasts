import Image from "next/image";

interface LogoProps {
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({ variant = "full", size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <Image
          src="/images/logo/logo-icon.svg"
          alt="Club Beasts"
          width={size === "sm" ? 24 : size === "md" ? 32 : 48}
          height={size === "sm" ? 24 : size === "md" ? 32 : 48}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logo/logo-icon.svg"
        alt="Club Beasts"
        width={size === "sm" ? 20 : size === "md" ? 24 : 32}
        height={size === "sm" ? 20 : size === "md" ? 24 : 32}
        className="w-auto"
      />
      <span className={`font-display font-bold text-royal ${textSizes[size]} uppercase tracking-wider`}>
        Club Beasts
      </span>
    </div>
  );
}
