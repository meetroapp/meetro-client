export const liquidGlassTokens = {
  surface:
    "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,255,255,0.48))",
  surfaceStrong:
    "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(248,250,252,0.72))",
  surfaceSubtle:
    "linear-gradient(145deg, rgba(255,255,255,0.58), rgba(255,255,255,0.34))",
  border: "1px solid rgba(255,255,255,0.62)",
  borderSubtle: "1px solid rgba(226,232,240,0.46)",
  shadow: "0 18px 44px rgba(15,23,42,0.10)",
  shadowSoft: "0 10px 28px rgba(15,23,42,0.06)",
  blur: "blur(18px)",
  blurStrong: "blur(24px)",
};

export const glassSurface = {
  background: liquidGlassTokens.surface,
  border: liquidGlassTokens.border,
  boxShadow: liquidGlassTokens.shadowSoft,
  backdropFilter: liquidGlassTokens.blur,
  WebkitBackdropFilter: liquidGlassTokens.blur,
};

export const glassNavigationSurface = {
  background: "rgba(255,255,255,0.62)",
  border: liquidGlassTokens.border,
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  backdropFilter: liquidGlassTokens.blurStrong,
  WebkitBackdropFilter: liquidGlassTokens.blurStrong,
};

export const glassPill = {
  background: "rgba(255,255,255,0.58)",
  border: "1px solid rgba(255,255,255,0.58)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), 0 8px 22px rgba(15,23,42,0.05)",
  backdropFilter: liquidGlassTokens.blur,
  WebkitBackdropFilter: liquidGlassTokens.blur,
};

export const glassPillActive = {
  background: "rgba(15,42,68,0.88)",
  border: "1px solid rgba(255,255,255,0.26)",
  boxShadow: "0 12px 28px rgba(15,42,68,0.22)",
};

export const glassActionMenu = {
  background: "rgba(255,255,255,0.78)",
  border: liquidGlassTokens.border,
  boxShadow: liquidGlassTokens.shadow,
  backdropFilter: liquidGlassTokens.blurStrong,
  WebkitBackdropFilter: liquidGlassTokens.blurStrong,
};

export const softPageSection = {
  background: liquidGlassTokens.surfaceSubtle,
  border: liquidGlassTokens.borderSubtle,
  boxShadow: "0 8px 24px rgba(15,23,42,0.045)",
};

export const nativeContactRow = {
  background: "rgba(255,255,255,0.58)",
  border: "1px solid rgba(255,255,255,0.52)",
  boxShadow: "0 8px 24px rgba(15,23,42,0.055)",
  backdropFilter: liquidGlassTokens.blur,
  WebkitBackdropFilter: liquidGlassTokens.blur,
};

export const bottomActionBar = {
  background: "rgba(255,255,255,0.72)",
  borderTop: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 -14px 34px rgba(15,23,42,0.08)",
  backdropFilter: liquidGlassTokens.blurStrong,
  WebkitBackdropFilter: liquidGlassTokens.blurStrong,
};

export const keyboardSafeFlowPage = {
  background:
    "radial-gradient(circle at 20% 0%, rgba(219,234,254,0.46), transparent 34%), linear-gradient(180deg, #fbfcff, #f6f8fc)",
  overscrollBehaviorX: "none",
  overflowX: "hidden",
};

export const glassField = {
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(255,255,255,0.62)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.68)",
  backdropFilter: liquidGlassTokens.blur,
  WebkitBackdropFilter: liquidGlassTokens.blur,
};

export const glassFloatingButton = {
  background:
    "linear-gradient(145deg, rgba(15,42,68,0.96), rgba(37,99,235,0.84))",
  border: "1px solid rgba(255,255,255,0.32)",
  boxShadow: "0 14px 32px rgba(15,42,68,0.24)",
};
