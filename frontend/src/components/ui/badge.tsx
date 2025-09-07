import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type statusVariants = "default" | "muted" | "info" | "success" | "warning" | "error" | "custom"

function Badge({
  className,
  variant,
  status = "default",
  customStatusColor,
  icon,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean, status?: statusVariants, customStatusColor?: string, icon?: LucideIcon }) {
  const Comp = asChild ? Slot : "span"

  if (status === "custom" && customStatusColor === undefined) {
    throw new Error("A custom 'status' requires a 'customStatusColor' value")
  }

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {status !== "default" && icon === undefined && (
        <span
          className={cn(
            "size-1.5 rounded-full mr-1 animate-pulse",
            status === "muted" && "bg-muted-foreground/50",
            status === "info" && "bg-blue-500",
            status === "success" && "bg-green-500",
            status === "warning" && "bg-yellow-500",
            status === "error" && "bg-red-500",
            status === "custom" && customStatusColor
          )}
        />
      )}
      {icon && (() => {
        const Icon = icon;
        return <Icon
          className={cn(
            "mr-1 animate-pulse",
            status === "muted" && "text-muted-foreground/50",
            status === "info" && "text-blue-500",
            status === "success" && "text-green-500",
            status === "warning" && "text-yellow-500",
            status === "error" && "text-red-500",
            status === "custom" && customStatusColor
          )}
        />
      })()}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
