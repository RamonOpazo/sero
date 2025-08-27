import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import type { ClassName } from "react-pdf/dist/shared/types.js"
import { type LinkProps, Link } from "react-router-dom"

interface Props {
  children: React.ReactNode
  className?: ClassName
}

export function TypographyHeader({ className, children }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col justify-start gap-8 mb-8 leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TypographyContent({ className, children }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col justify-start gap-2 mb-8 leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TypographyFooter({ className, children }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col justify-start gap-2 mt-8 leading-relaxed text-sm",
        className,
      )}
    >
      <Separator className="mb-8"/>
      {children}
    </div>
  )
}

export function TypographyH1({ className, children }: Props) {
  return (
    <h1 className={cn(
      "scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance",
      className,
    )}
    >{children}</h1>
  )
}

export function TypographyH2({ className, children }: Props) {
  return (
    <h2 className={cn(
      "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
      className,
    )}
    >{children}</h2>
  )
}

export function TypographyH3({ className, children }: Props) {
  return (
    <h3 className={cn(
      "scroll-m-20 text-2xl font-semibold tracking-tight",
      className,
    )}
    >{children}</h3>
  )
}

export function TypographyH4({ className, children }: Props) {
  return (
    <h4 className={cn(
      "scroll-m-20 text-xl font-semibold tracking-tight",
      className,
    )}
    >{children}</h4>
  )
}

export function TypographyP({ className, children }: Props) {
  return (
    <p className={cn(
      "text-md text-foreground",
      className,
    )}
    >{children}</p>
  )
}

export function TypographyBlockquote({ className, children }: Props) {
  return (
    <blockquote className={cn(
      "mt-6 border-l-2 pl-6 italic",
      className,
    )}
    >{children}</blockquote>
  )
}

export function TypographyUnorderedList({ className, children }: Props) {
  return (
    <ul className={cn(
      "list-disc ml-6 space-y-2 text-muted-foreground marker:text-foreground",
      className
    )}
    >{children}</ul>
  )
}

export function TypographyOrderedList({ className, children }: Props) {
  return (
    <ol className={cn(
      "list-decimal ml-2 space-y-2 text-muted-foreground marker:text-foreground",
      className
    )}
    >{children}</ol>
  )
}

export function TypographyInlineCode({ className, children }: Props) {
  return (
    <code className={cn(
      "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      "before:content-[''] after:content-[''] align-[0.05em]",
      className,
    )}
    >
      {children}
    </code>
  )
}

export function TypographyTitle({ className, children }: Props) {
  return (
    <h1
      className={cn(
        "text-5xl font-bold tracking-tight sm:text-6xl",
        className
      )}
    >{children}</h1>
  )
}

export function TypographyLead({ className, children }: Props) {
  return (
    <p className={cn(
      "text-muted-foreground text-xl",
      className
    )}
    >{children}</p>
  )
}

export function TypographySubtitle({ className, children }: Props) {
  return (
    <h2
      className={cn(
        "text-md font-medium text-primary mt-4 mb-1",
        className
      )}
    >{children}</h2>
  )
}

export function TypographyMuted({ className, children }: Props) {
  return (
    <p
      className={cn(
        "text-md text-muted-foreground",
        className
      )}
    >{children}</p>
  )
}

export function TypographyLink({ className, children, ...props }: Props & LinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        "no-underline text-md text-primary hover:underline",
        className
      )}
    >{children}</Link>
  )
}