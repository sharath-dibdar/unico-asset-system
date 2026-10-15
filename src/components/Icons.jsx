import { Laptop, Mouse, HardDrive, Cable, Clapperboard, Router, Package } from "lucide-react";

// Line icons (lucide) in place of emoji, so they inherit the text colour and
// render identically on every phone.
const CAT_ICONS = {
  computing:   Laptop,
  peripherals: Mouse,
  storage:     HardDrive,
  cables:      Cable,
  studio:      Clapperboard,
  networking:  Router,
};

export function CatIcon({ cat, size = 18, strokeWidth = 1.9, style }) {
  const I = CAT_ICONS[cat] || Package;
  return <I size={size} strokeWidth={strokeWidth} aria-hidden="true" style={{ flexShrink:0, verticalAlign:"-0.15em", ...style }} />;
}
