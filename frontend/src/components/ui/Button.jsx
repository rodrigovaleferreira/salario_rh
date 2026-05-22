// frontend/src/components/ui/Button.jsx

import { clsx } from "clsx"
import { Loader2 } from "lucide-react"

const variants = {
  primary:   "btn-primary",
  secondary: "btn-secondary",
  danger:    "btn-danger",
  ghost:     "btn-ghost",
}

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <button
      className={clsx(
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}