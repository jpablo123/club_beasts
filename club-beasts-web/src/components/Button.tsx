"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, children, className = "", disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-body font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-royal focus:ring-offset-2 focus:ring-offset-near-black disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
      primary: "bg-royal text-white hover:bg-royal-dark active:bg-royal-dark",
      secondary: "border-2 border-royal text-royal hover:bg-royal hover:text-white",
      ghost: "text-gray-400 hover:text-white hover:bg-dark-surface",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm rounded-[6px]",
      md: "px-6 py-2.5 text-sm rounded-full",
      lg: "px-8 py-3 text-base rounded-full",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Cargando...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
