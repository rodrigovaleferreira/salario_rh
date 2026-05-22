// frontend/src/components/ui/Select.jsx

import { forwardRef } from "react"
import { clsx } from "clsx"
import { ChevronDown } from "lucide-react"

const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className, required, ...props },
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
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            "input appearance-none pr-8 cursor-pointer",
            error && "input-error",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2
                     text-surface-400 pointer-events-none"
        />
      </div>
      {error && (
        <p className="text-xs text-danger mt-0.5">{error}</p>
      )}
    </div>
  )
})

export default Select