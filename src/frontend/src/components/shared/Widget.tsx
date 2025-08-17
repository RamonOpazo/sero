import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion"
import { createContext, useContext } from "react"

// Context for widget components to understand their container type
type WidgetContextType = {
  isAccordion: boolean
}

const WidgetContext = createContext<WidgetContextType>({ isAccordion: false })

type WidgetExtraProps = {
  expanded?: boolean,
  orthocentered?: boolean
}

type AccordionWidgetProps = WidgetExtraProps & {
  value?: string
  title?: React.ReactNode
  icon?: React.ReactNode
}

type AccordionOnlyProps = {
  accordion?: boolean
  accordionDefaultValue?: string
  accordionType?: "single" | "multiple"
  collapsible?: boolean
}

type AccordionContainerProps = WidgetExtraProps & AccordionOnlyProps

type WidgetContainerProps = Omit<React.ComponentProps<"div">, keyof AccordionOnlyProps> & AccordionContainerProps

export function WidgetContainer({
  // Widget-specific props
  expanded,
  orthocentered,
  className,
  children,
  // Accordion-specific props
  accordion = false,
  accordionDefaultValue,
  accordionType = "single",
  collapsible = true,
  // Everything else for the div
  ...restProps
}: WidgetContainerProps) {
  if (accordion) {
    const accordionProps = accordionType === "single" ? {
      type: "single" as const,
      defaultValue: accordionDefaultValue,
      collapsible
    } : {
      type: "multiple" as const,
      defaultValue: accordionDefaultValue ? [accordionDefaultValue] : undefined,
      collapsible
    }

    return (
      <WidgetContext.Provider value={{ isAccordion: true }}>
        <Accordion
          {...accordionProps}
          className={cn(
            "flex flex-col gap-4 overflow-hidden",
            `${expanded && "flex-1 h-full w-full"}`,
            `${orthocentered && "justify-center items-center"}`,
            className
          )}
        >
          {children}
        </Accordion>
      </WidgetContext.Provider>
    )
  }

  return (
    <WidgetContext.Provider value={{ isAccordion: false }}>
      <div
        data-slot="widget-container"
        className={cn(
          "flex flex-col gap-4 overflow-hidden",
          `${expanded && "flex-1 h-full w-full"}`,
          `${orthocentered && "justify-center items-center"}`,
          className
        )}
        {...restProps}
      >
        {children}
      </div>
    </WidgetContext.Provider>
  )
}

export function Widget({
  expanded,
  orthocentered,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & WidgetExtraProps & Partial<AccordionWidgetProps>) {
  const { isAccordion } = useContext(WidgetContext)

  // Always return a div with data-slot="widget"
  return (
    <div
      data-slot="widget"
      className={cn(
        "flex flex-col gap-4 bg-muted/50 rounded-md",
        `${!isAccordion && "py-4"}`, // Only add these styles when not in accordion
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...(isAccordion ? {} : props)} // Only pass through props when not in accordion
    >
      {isAccordion ? (
        (() => {
          const { value, title, icon } = props

          if (!value) {
            console.warn('Widget in accordion context is missing required "value" prop')
            return children // Fallback to just children if no value
          }

          return (
            <AccordionItem value={value} className="px-4">
              <AccordionTrigger className="hover:no-underline group">
                <div className="flex items-center gap-2">
                  {icon && <span className="text-muted-foreground">{icon}</span>}
                  <span className="text-muted-foreground text-xs group-hover:text-primary group-data-[state=open]:text-primary transition-colors">{title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {children}
              </AccordionContent>
            </AccordionItem>
          )
        })()
      ) : (
        children
      )}
    </div>
  )
}

export function WidgetHeader({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgetExtraProps) {
  return (
    <div
      data-slot="widget-header"
      className={cn(
        "flex flex-col gap-1.5 px-4",
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-title"
      className={cn(
        "leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

export function WidgetDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-description"
      className={cn(
        "text-muted-foreground text-sm",
        className
      )}
      {...props}
    />
  )
}

export function WidgetContent({ expanded, orthocentered, className, ...props }: React.ComponentProps<"div"> & WidgetExtraProps) {
  return (
    <div
      data-slot="widget-content"
      className={cn(
        "flex flex-col gap-4 px-4",
        `${expanded && "flex-1 h-full w-full"}`,
        `${orthocentered && "justify-center items-center"}`,
        className
      )}
      {...props}
    />
  )
}

export function WidgetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="widget-footer"
      className={cn(
        "flex flex-shrink-0 flex-col gap-1.5 px-4",
        className
      )}
      {...props}
    />
  )
}