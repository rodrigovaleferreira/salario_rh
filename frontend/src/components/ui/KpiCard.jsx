// frontend/src/components/ui/KpiCard.jsx

import { clsx } from "clsx"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,        // "up" | "down" | "neutral"
  trendValue,   // ex: "+12%" ou "3 críticos"
  color = "brand",
  loading = false,
}) {
  const colorMap = {
    brand:   "bg-brand-50   text-brand-600   ring-brand-100",
    success: "bg-green-50   text-green-600   ring-green-100",
    warning: "bg-amber-50   text-amber-600   ring-amber-100",
    danger:  "bg-red-50     text-red-600     ring-red-100",
    neutral: "bg-surface-100 text-surface-600 ring-surface-200",
  }

  const trendIcon = {
    up:      <TrendingUp  size={12} className="text-green-500" />,
    down:    <TrendingDown size={12} className="text-red-500" />,
    neutral: <Minus        size={12} className="text-surface-400" />,
  }

  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-7 w-32 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    )
  }

  return (
    <div className="card p-5 hover:shadow-panel transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-surface-500 uppercase
                        tracking-wider truncate">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-display font-bold
                        text-surface-900 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-surface-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx(
            "flex items-center justify-center w-10 h-10 rounded-xl ring-1",
            colorMap[color]
          )}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {trendValue && (
        <div className="mt-3 pt-3 border-t border-surface-100
                        flex items-center gap-1.5">
          {trend && trendIcon[trend]}
          <span className="text-xs text-surface-500">{trendValue}</span>
        </div>
      )}
    </div>
  )
}