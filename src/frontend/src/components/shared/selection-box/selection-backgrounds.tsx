import React from "react";

export type BackgroundVariantName =
  | "none"
  | "solid"
  | "stripes"
  | "crosses"
  | "dotted";

const stripeStops = "currentColor 2.25%, transparent 2.25% 50%, currentColor 50% 52.25%, transparent 52.25%";

export const BackgroundVariant: Record<
  BackgroundVariantName,
  React.CSSProperties | undefined
> = {
  none: undefined,
  solid: { backgroundColor: "currentColor", opacity: 0.12 },
  stripes: {
    opacity: 0.18,
    backgroundImage: `linear-gradient(135deg, ${stripeStops})`,
    backgroundSize: "20px 20px",
  },
  crosses: {
    opacity: 0.2,
    backgroundImage: `
      linear-gradient(135deg, ${stripeStops}),
      linear-gradient(45deg, ${stripeStops})
    `,
    backgroundSize: "20px 20px",
  },
  dotted: {
    opacity: 0.2,
    backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0, 6px 6px",
  },
};

interface Props {
  variant?: BackgroundVariantName
  contrast?: number // 0..1 multiplier between base and target
}

const mix = (b: number, t: number, c: number) => b + (t - b) * Math.max(0, Math.min(1, c));

const BASE_TINT = 0;
const TARGET_TINT = 0.2;

export function SelectionBackground({ variant = "none", contrast = 0.5 }: Props): React.ReactNode | null {
  const style = BackgroundVariant[variant]
  if (!style) return null
  const tint = mix(BASE_TINT, TARGET_TINT, contrast);
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "currentColor", opacity: tint }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={style}
      />
    </>
  )
}
