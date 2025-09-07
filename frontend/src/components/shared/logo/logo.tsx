import * as React from "react"
import { cn } from "@/lib/utils" // shadcn/ui utility

type LogoProps = {
  variant?: "full" | "icon"
  interactive?: boolean
  className?: string
}

export function Logo({
  variant = "full",
  interactive = false,
  className,
}: LogoProps) {
  const [hover, setHover] = React.useState(false)

  const charS = interactive && hover ? "s" : "s"
  const charE = interactive && hover ? "e" : "E"
  const charR = interactive && hover ? "r" : "R"
  const charO = interactive && hover ? "o" : (
    <span style={{ position: "relative", display: "inline-block" }}>
      o
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "translate(0%, 0%)",
          color: "currentColor",
        }}
      >
        /
      </span>
    </span>
  )



  
    return (
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "font-['Major_Mono_Display'] font-extrabold text-purple-600 transition-all ease-in-out delay-100",
          className
        )}
        style={{ fontFamily: "'Major Mono Display', monospace" }}
      >
        {variant === "full" && (
          <>
            {charS}
            {charE}
            {charR}
            {charO}
          </>
        )}
        {variant === "icon" && (
          <>
            {charO}
          </>
        )}
      </span>
    )
  }

  {/* return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "font-['Major_Mono_Display'] font-bold text-purple-600",
        className
      )}
      style={{ fontFamily: "'Major Mono Display', monospace" }}
    >
      {charS}{charE}{charR}{charO}
    </span>
  )
} */}
