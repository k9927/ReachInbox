import { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "slack" | "danger" | "text";
  size?: "small" | "normal";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "normal",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let variantClass = "button button-primary";
  if (variant === "outline") variantClass = "button button-outline";
  else if (variant === "slack") variantClass = "button button-slack";
  else if (variant === "danger") variantClass = "text-button danger";
  else if (variant === "text") variantClass = "text-button";

  const sizeClass = size === "small" ? "small" : "";

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="spin" size={16} />
      ) : (
        icon && <span className="button-icon">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}
