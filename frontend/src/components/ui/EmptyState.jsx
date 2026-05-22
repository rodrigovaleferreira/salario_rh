// frontend/src/components/ui/EmptyState.jsx

import { clsx } from "clsx"

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={clsx(
      "flex flex-col items-center justify-center py-16 px-6 text-center",
      className
    )}>
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12
                        rounded-xl bg-surface-100 mb-4">
          <Icon size={22} className="text-surface-400" />
        </div>
      )}
      <p className="text-sm font-medium text-surface-700">{title}</p>
      {description && (
        <p className="text-xs text-surface-400 mt-1 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}