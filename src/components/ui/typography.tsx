import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Display - For hero sections, large headers
export const Display = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" }
>(({ className, as: Comp = "h1", ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]", className)}
    {...props}
  />
))
Display.displayName = "Display"

// Title1 - Page titles, main section headers
export const Title1 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" }
>(({ className, as: Comp = "h1", ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("text-xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]", className)}
    {...props}
  />
))
Title1.displayName = "Title1"

// Title2 - Section headers
export const Title2 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }
>(({ className, as: Comp = "h2", ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("text-base font-semibold text-[var(--text-primary)]", className)}
    {...props}
  />
))
Title2.displayName = "Title2"

// Title3 - Card titles, smaller section headers
export const Title3 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h3" | "h4" | "h5" }
>(({ className, as: Comp = "h3", ...props }, ref) => (
  <Comp
    ref={ref}
    className={cn("text-sm font-medium text-[var(--text-primary)]", className)}
    {...props}
  />
))
Title3.displayName = "Title3"

// Label - Form labels, small headers
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium text-[var(--text-primary)]", className)}
    {...props}
  />
))
Label.displayName = "Label"

// Body - Regular body text
const bodyVariants = cva("leading-normal", {
  variants: {
    tone: {
      default: "text-[var(--text-primary)]",
      secondary: "text-[var(--text-secondary)]",
      tertiary: "text-[var(--text-tertiary)]",
    },
    size: {
      sm: "text-sm",
      default: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    tone: "default",
    size: "default",
  },
})

export interface BodyProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">,
    VariantProps<typeof bodyVariants> {}

export const Body = React.forwardRef<HTMLParagraphElement, BodyProps>(
  ({ className, tone, size, ...props }, ref) => (
    <p ref={ref} className={cn(bodyVariants({ tone, size }), className)} {...props} />
  )
)
Body.displayName = "Body"

// Text - Inline text with variants
const textVariants = cva("", {
  variants: {
    tone: {
      default: "text-[var(--text-primary)]",
      secondary: "text-[var(--text-secondary)]",
      tertiary: "text-[var(--text-tertiary)]",
      quaternary: "text-[var(--text-quaternary)]",
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    },
  },
  defaultVariants: {
    tone: "default",
    size: "sm",
    weight: "normal",
  },
})

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof textVariants> {}

export const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  ({ className, tone, size, weight, ...props }, ref) => (
    <span ref={ref} className={cn(textVariants({ tone, size, weight }), className)} {...props} />
  )
)
Text.displayName = "Text"

// Caption - Small metadata, timestamps, counts
const captionVariants = cva("text-xs", {
  variants: {
    tone: {
      default: "text-[var(--text-secondary)]",
      tertiary: "text-[var(--text-tertiary)]",
      quaternary: "text-[var(--text-quaternary)]",
    },
  },
  defaultVariants: {
    tone: "tertiary",
  },
})

export interface CaptionProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof captionVariants> {}

export const Caption = React.forwardRef<HTMLSpanElement, CaptionProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(captionVariants({ tone }), className)} {...props} />
  )
)
Caption.displayName = "Caption"

// Overline - Section labels, category indicators (uppercase)
export const Overline = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]",
      className
    )}
    {...props}
  />
))
Overline.displayName = "Overline"

// Code - Inline code
export const Code = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn(
      "rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[13px]",
      className
    )}
    {...props}
  />
))
Code.displayName = "Code"

// Legacy exports for compatibility
export const LargeTitle = Display
export const Headline = Title2
