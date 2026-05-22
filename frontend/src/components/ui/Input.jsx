// frontend/src/components/ui/Input.jsx

import { forwardRef } from "react"
import { clsx } from "clsx"

const Input = forwardRef(function Input(
  { label, error, hint, className, required, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={clsx("input", error && "input-error", className)}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger mt-0.5">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-surface-400 mt-0.5">{hint}</p>
      )}
    </div>
  )
})

export default Input