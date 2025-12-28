import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide min-h-[18px]",
  {
    variants: {
      variant: {
        default: [
          "bg-black/5 text-gray-700",
          "dark:bg-white/10 dark:text-gray-300",
        ],
        blue: [
          "bg-blue-50 text-blue-700",
          "dark:bg-blue-500/20 dark:text-blue-400",
        ],
        green: [
          "bg-green-50 text-green-700",
          "dark:bg-green-500/20 dark:text-green-400",
        ],
        red: [
          "bg-red-50 text-red-700",
          "dark:bg-red-500/20 dark:text-red-400",
        ],
        yellow: [
          "bg-yellow-50 text-yellow-700",
          "dark:bg-yellow-500/20 dark:text-yellow-400",
        ],
        purple: [
          "bg-purple-50 text-purple-700",
          "dark:bg-purple-500/20 dark:text-purple-400",
        ],
        orange: [
          "bg-orange-50 text-orange-700",
          "dark:bg-orange-500/20 dark:text-orange-400",
        ],
        brand: [
          "bg-brand-primary/10 text-brand-primary",
          "dark:bg-brand-primary/20 dark:text-brand-primary",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
