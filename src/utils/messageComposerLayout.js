export const COMPACT_MESSAGE_COMPOSER = Object.freeze({
  sendWidthPx: 92,
  sendMinWidthPx: 88,
  sendMaxWidthPx: 100,
  minTouchHeightPx: 44,
  inputFontSizePx: 16,
  gapPx: 8,
});

export function getCompactMessageComposerGeometry({
  viewportWidth,
  outerInlinePadding,
  cardInlinePadding,
}) {
  const availableWidth =
    Number(viewportWidth) -
    Number(outerInlinePadding) * 2 -
    Number(cardInlinePadding) * 2;
  const inputWidth =
    availableWidth -
    COMPACT_MESSAGE_COMPOSER.gapPx -
    COMPACT_MESSAGE_COMPOSER.sendWidthPx;

  return {
    availableWidth,
    inputWidth,
    sendWidth: COMPACT_MESSAGE_COMPOSER.sendWidthPx,
    totalWidth:
      inputWidth +
      COMPACT_MESSAGE_COMPOSER.gapPx +
      COMPACT_MESSAGE_COMPOSER.sendWidthPx,
    overflows: inputWidth < 0,
  };
}
