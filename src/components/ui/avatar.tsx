import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-5 w-5 text-[8px]",
        sm: "h-6 w-6 text-[10px]",
        default: "h-8 w-8 text-xs",
        lg: "h-10 w-10 text-sm",
        xl: "h-16 w-16 text-lg",
        "2xl": "h-28 w-28 text-2xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const avatarColors = [
  "bg-blue-300 text-blue-800",
  "bg-green-300 text-green-800",
  "bg-yellow-300 text-yellow-800",
  "bg-red-300 text-red-800",
  "bg-purple-300 text-purple-800",
  "bg-pink-300 text-pink-800",
  "bg-indigo-300 text-indigo-800",
  "bg-teal-300 text-teal-800",
]

function getColorFromName(name: string): string {
  const index = name.charCodeAt(0) % avatarColors.length
  return avatarColors[index]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  name?: string
  fallback?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, name, fallback, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const showFallback = !src || imageError
    const initials = fallback || (name ? getInitials(name) : "?")
    const colorClass = name ? getColorFromName(name) : avatarColors[0]

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {!showFallback ? (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center font-medium",
              colorClass
            )}
          >
            {initials}
          </div>
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar, avatarVariants }
