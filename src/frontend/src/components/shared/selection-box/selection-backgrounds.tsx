import React from "react";

export type BackgroundVariantName =
  | "none"
  | "solid"
  | "stripes"
  | "crosses"
  | "polka";

export const BackgroundVariant: Record<BackgroundVariantName, React.CSSProperties | undefined> = {
  none: undefined,
  solid: { backgroundImage: "currentColor" },
  stripes: {
    backgroundImage: `
      linear-gradient(135deg, currentColor 2.25%, transparent 2.25% 50%, currentColor 50% 52.25%, transparent 52.25%)
    `,
    backgroundSize: "15px 15px",
  },
  crosses: {
    backgroundImage: `
      linear-gradient(135deg, currentColor 2.25%, transparent 2.25% 50%, currentColor 50% 52.25%, transparent 52.25%),
      linear-gradient(45deg, currentColor 2.25%, transparent 2.25% 50%, currentColor 50% 52.25%, transparent 52.25%)
    `,
    backgroundSize: "15px 15px",

  },
  polka: {
    backgroundImage: `
      radial-gradient(circle at center, currentColor 2px, transparent 0),
      radial-gradient(circle at center, currentColor 2px, transparent 0)
  `,
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0, 5px 5px",
  }
};

interface Props {
  variant?: BackgroundVariantName;
  contrast?: number; // 0..1 multiplier
}

const BASE_OPACITY = 0;
const MAX_OPACITY = 0.5;

const mix = (base: number, target: number, contrast: number) =>
  base + (target - base) * Math.max(0, Math.min(1, contrast));

export function SelectionBackground({
  variant = "none",
  contrast = 1,
}: Props): React.ReactNode | null {
  const style = BackgroundVariant[variant];
  if (!style) return null;

  // Compute final opacity
  const opacity = mix(BASE_OPACITY, MAX_OPACITY, contrast);

  return (
    <div
      className="absolute inset-0 pointer-events-none bg-current/20 transition duration-150 ease-in-out"
      style={{
        ...style,
        backgroundImage: style.backgroundImage ?? "currentColor",
        opacity,
      }}
    />
  );
}
