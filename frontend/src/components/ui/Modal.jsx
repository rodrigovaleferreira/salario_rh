// frontend/src/components/ui/Modal.jsx

import { useEffect } from "react"
import { X } from "lucide-react"
import { clsx } from "clsx"

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}) {
  // Fecha com ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose() }
    if (open) document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Trava scroll do body
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={clsx(
        "relative w-full bg-white rounded-2xl shadow-panel animate-in",
        "flex flex-col max-h-[90vh]",
        sizes[size],
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4
                        border-b border-surface-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-surface-900">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400
                       hover:bg-surface-100 hover:text-surface-700
                       transition-colors ml-4 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-surface-100
                          bg-surface-50 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}