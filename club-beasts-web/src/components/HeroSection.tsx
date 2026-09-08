import { ReactNode } from "react";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export default function HeroSection({
  title,
  subtitle,
  description,
  children,
  className = "",
}: HeroSectionProps) {
  return (
    <section
      className={`relative min-h-[80vh] flex items-center bg-near-black overflow-hidden ${className}`}
    >
      <div className="max-w-[1200px] mx-auto px-5 w-full">
        <div className="max-w-3xl">
          {subtitle && (
            <p className="text-royal font-body font-semibold text-sm uppercase tracking-widest mb-4">
              {subtitle}
            </p>
          )}
          <h1 className="text-poster text-6xl md:text-8xl lg:text-9xl text-white mb-6">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-gray-400 max-w-xl mb-8">{description}</p>
          )}
          {children}
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 bg-gradient-to-l from-royal/10 to-transparent pointer-events-none" />
    </section>
  );
}
