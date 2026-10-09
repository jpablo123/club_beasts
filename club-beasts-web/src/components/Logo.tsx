interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={className}>
      <span className={`font-display font-bold text-royal ${textSizes[size]} uppercase tracking-wider`}>
        Club Beasts
      </span>
    </div>
  );
}
