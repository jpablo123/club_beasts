import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "dark" | "light";
  padding?: "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "dark", padding = "md", children, className = "", ...props }, ref) => {
    const variantStyles = {
      dark: "bg-dark-surface border border-gray-800 text-white",
      light: "bg-white border border-gray-200 text-gray-900",
    };

    const paddingStyles = {
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    };

    return (
      <div
        ref={ref}
        className={`rounded-card ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
