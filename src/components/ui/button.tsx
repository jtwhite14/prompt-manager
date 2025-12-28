import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 relative",
  {
    variants: {
      variant: {
        // Base - White button with subtle shadow
        base: [
          "bg-white text-gray-900 shadow-button",
          "hover:bg-gray-50",
          "dark:bg-gray-750 dark:text-gray-100 dark:hover:bg-gray-700",
        ],
        // Primary - Dark/light inverted button
        primary: [
          "bg-gray-900 text-white shadow-button",
          "hover:bg-gray-800",
          "dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
        ],
        // Flat - Subtle background on hover
        flat: [
          "bg-transparent text-gray-700",
          "hover:bg-gray-100",
          "dark:text-gray-300 dark:hover:bg-gray-800",
        ],
        // Ghost - Minimal styling
        ghost: [
          "bg-transparent text-gray-600",
          "hover:bg-gray-100 hover:text-gray-900",
          "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
        ],
        // Destructive - Red warning button
        destructive: [
          "bg-red-500 text-white",
          "hover:bg-red-600",
          "dark:bg-red-600 dark:hover:bg-red-700",
        ],
        // Important - Blue accent button
        important: [
          "bg-blue-500 text-white",
          "hover:bg-blue-600",
          "dark:bg-blue-600 dark:hover:bg-blue-700",
        ],
        // Brand - Orange gradient button
        brand: [
          "bg-gradient-to-r from-brand-primary to-brand-secondary text-white",
          "hover:opacity-90",
        ],
        // Outline - Bordered button
        outline: [
          "border border-[var(--border-primary)] bg-transparent text-gray-700",
          "hover:bg-gray-50",
          "dark:text-gray-300 dark:hover:bg-gray-800",
        ],
        // Secondary - Muted background
        secondary: [
          "bg-gray-100 text-gray-900",
          "hover:bg-gray-200",
          "dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
        ],
        // Link - Text only
        link: [
          "text-gray-600 underline-offset-4",
          "hover:text-gray-900 hover:underline",
          "dark:text-gray-400 dark:hover:text-gray-100",
        ],
      },
      size: {
        sm: "h-7 px-3 text-[13px] rounded",
        default: "h-8 px-4 text-[14px] rounded-md",
        lg: "h-10 px-6 text-[15px] rounded-lg",
        icon: "h-8 w-8 rounded-md",
        "icon-sm": "h-7 w-7 rounded",
        "icon-lg": "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "base",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
