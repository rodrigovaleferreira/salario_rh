// frontend/src/components/ui/Alert.jsx

import { clsx } from "clsx"
import { AlertCircle, CheckCircle2, Info, XCircle, X } from "lucide-react"
import { useState } from "react"

const styles = {
  error:   "bg-red-50   border-red-200   text-red-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info:    "bg-blue-50  border-blue-200  text-blue-800",
}

const icons = {
  error:   XCircle,
  success: CheckCircle2,
  warning: AlertCircle,
  info:    Info,
}

export default function Alert({
  type = "info",
  title,
  message,
  dismissible = false,
}) {
  const [visible, setVisible] = useState(true)
  const Icon = icons[type]

  if (!visible) return null

  return (
    <div
      className={clsx(
        "flex gap-3 p-4 rounded-lg border text-sm animate-in",
        styles[type]
      )}
    >
      <Icon size={16} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {message && <p className="mt-0.5 opacity-90">{message}</p>}
      </div>
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}