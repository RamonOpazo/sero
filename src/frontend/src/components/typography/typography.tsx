import { cn } from "@/lib/utils"
import type { ClassName } from "react-pdf/dist/shared/types.js"

interface Props {
  children: React.ReactNode
  className?: ClassName
}

interface StringProps {
  s: string
}

interface ItemsProps {
  is: React.ReactElement<"li">[]
}

export function TypographyH1({ s }: StringProps) {
  return (
    <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">{s}</h1>
  )
}

export function TypographyH2({ s }: StringProps) {
  return (
    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">{s}</h2>
  )
}

export function TypographyH3({ s }: StringProps) {
  return (
    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">{s}</h3>
  )
}

export function TypographyH4({ s }: StringProps) {
  return (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">{s}</h4>
  )
}

export function TypographyP({ s }: StringProps) {
  return (
    <p className="leading-7 [&:not(:first-child)]:mt-6">{s}</p>
  )
}

export function TypographyBlockquote({ s }: StringProps) {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">
      {s}
    </blockquote>
  )
}

export function TypographyList({ is }: ItemsProps) {
  return (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
      {is}
    </ul>
  )
}

export function TypographyInlineCode({ s }: StringProps) {
  return (
    <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
      {s}
    </code>
  )
}

export function TypographyTitle({ ...props }: Props) {
  return (
    <h1
      className={cn(
        "text-5xl font-bold tracking-tight sm:text-6xl",
        props.className
      )}
    >{props.children}</h1>
  )
}

export function TypographyLead({ ...props }: Props) {
  return (
    <p className={cn(
      "text-muted-foreground text-xl",
      props.className
    )}
    >{props.children}</p>
  )
}

export function TypographyLarge({ s }: StringProps) {
  return (
    <div className="text-lg font-semibold">{s}</div>
  )
}

export function TypographySmall({ s }: StringProps) {
  return (
    <small className="text-sm leading-none font-medium">{s}</small>
  )
}

export function TypographyMuted({ s }: StringProps) {
  return (
    <p className="text-muted-foreground text-sm">{s}</p>
  )
}
