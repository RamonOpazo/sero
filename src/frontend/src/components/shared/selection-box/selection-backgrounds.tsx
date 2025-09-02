import React from "react";

export type BackgroundVariantName =
  | "none"
  | "solid"
  | "stripes"
  | "crosses"
  | "polka"
  | "zigzag";

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
  polka: {
    opacity: 0.2,
    background: `
      radial-gradient(circle, currentColor 10%, transparent 11%),
      radial-gradient(circle at bottom left, currentColor 5%, transparent 6%),
      radial-gradient(circle at bottom right, currentColor 5%, transparent 6%),
      radial-gradient(circle at top left, currentColor 5%, transparent 6%),
      radial-gradient(circle at top right, currentColor 5%, transparent 6%)
    `,
    backgroundSize: "12px 12px",
  },
  zigzag: {
    opacity: 0.2,
    background: `
      linear-gradient(45deg, #ffffff 25%, transparent 25%),
      linear-gradient(315deg, #ffffff 25%, transparent 25%),
      linear-gradient(45deg, transparent 24%, currentColor 25%, currentColor 45%, transparent 45%),
      linear-gradient(315deg, transparent 24%, currentColor 25%, currentColor 45%, transparent 45%)`,
    backgroundSize: "12px 12px",
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
