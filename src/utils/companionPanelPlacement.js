import {
  APP_DESKTOP_LAYOUT_MIN_WIDTH,
  APP_TABLET_LAYOUT_MIN_WIDTH,
} from "./appLayout.js";

export const COMPANION_TABLET_MIN_WIDTH = APP_TABLET_LAYOUT_MIN_WIDTH;
export const COMPANION_PREFERRED_WIDTH = 388;
export const COMPANION_TABLET_WIDTH = 520;
export const COMPANION_TABLET_DESKTOP_WIDTH = 720;
export const COMPANION_PREFERRED_GUIDANCE_HEIGHT = 520;
export const COMPANION_PREFERRED_CONVERSATION_HEIGHT = 720;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getCompanionLayoutMode(usableViewportWidth = 0) {
  const width = finite(usableViewportWidth);
  if (width >= APP_DESKTOP_LAYOUT_MIN_WIDTH) return "desktop";
  if (width >= COMPANION_TABLET_MIN_WIDTH) return "tablet";
  return "mobile";
}

export function getCompanionPreferredPanelWidth(usableViewportWidth = 0) {
  const width = finite(usableViewportWidth);
  if (width >= APP_DESKTOP_LAYOUT_MIN_WIDTH && width < 1180) {
    return COMPANION_TABLET_DESKTOP_WIDTH;
  }
  if (width >= COMPANION_TABLET_MIN_WIDTH && width < APP_DESKTOP_LAYOUT_MIN_WIDTH) {
    return COMPANION_TABLET_WIDTH;
  }
  return COMPANION_PREFERRED_WIDTH;
}

export function calculateExpandedPanelPlacement({
  viewport = {},
  panelSize = {},
  launcherRect = {},
  safeInsets = {},
  bottomClearance = 0,
  topClearance = 0,
  edgeGap = 14,
  panelGap = 12,
  preferredWidth = COMPANION_PREFERRED_WIDTH,
  preferredHeight = COMPANION_PREFERRED_GUIDANCE_HEIGHT,
} = {}) {
  const viewportWidth = Math.max(0, finite(viewport.width));
  const viewportHeight = Math.max(0, finite(viewport.height));
  const offsetLeft = finite(viewport.offsetLeft);
  const offsetTop = finite(viewport.offsetTop);
  const leftBound = offsetLeft + Math.max(0, finite(safeInsets.left)) + edgeGap;
  const rightBound =
    offsetLeft + viewportWidth - Math.max(0, finite(safeInsets.right)) - edgeGap;
  const topBound =
    offsetTop + Math.max(0, finite(safeInsets.top)) + topClearance + edgeGap;
  const bottomBound =
    offsetTop +
    viewportHeight -
    Math.max(0, finite(safeInsets.bottom)) -
    bottomClearance -
    edgeGap;
  const availableWidth = Math.max(0, rightBound - leftBound);
  const availableHeight = Math.max(0, bottomBound - topBound);
  const width = Math.min(
    Math.max(0, finite(panelSize.width, preferredWidth) || preferredWidth),
    preferredWidth,
    availableWidth
  );
  const requestedHeight =
    finite(panelSize.height) > 0
      ? Math.min(finite(panelSize.height), preferredHeight)
      : preferredHeight;
  const maxHeight = Math.min(requestedHeight, availableHeight);
  const launcherLeft = finite(launcherRect.left, rightBound);
  const launcherTop = finite(launcherRect.top, bottomBound);
  const launcherWidth = Math.max(0, finite(launcherRect.width, 126));
  const launcherHeight = Math.max(0, finite(launcherRect.height, 50));
  const launcherRight = launcherLeft + launcherWidth;
  const launcherBottom = launcherTop + launcherHeight;
  const viewportCenter = offsetLeft + viewportWidth / 2;
  const opensLeft = launcherLeft + launcherWidth / 2 >= viewportCenter;
  const desiredLeft = opensLeft ? launcherRight - width : launcherLeft;
  const left = clamp(desiredLeft, leftBound, Math.max(leftBound, rightBound - width));
  const aboveTop = launcherTop - panelGap - maxHeight;
  const belowTop = launcherBottom + panelGap;
  const fitsAbove = aboveTop >= topBound;
  const fitsBelow = belowTop + maxHeight <= bottomBound;
  const spaceAbove = launcherTop - panelGap - topBound;
  const spaceBelow = bottomBound - launcherBottom - panelGap;
  const opensAbove = fitsAbove || (!fitsBelow && spaceAbove >= spaceBelow);
  const desiredTop = opensAbove ? aboveTop : belowTop;
  const top = clamp(desiredTop, topBound, Math.max(topBound, bottomBound - maxHeight));

  return {
    left,
    top,
    width,
    maxHeight,
    horizontalPlacement: opensLeft ? "left" : "right",
    verticalPlacement: opensAbove ? "above" : "below",
    layoutMode: getCompanionLayoutMode(viewportWidth),
    bounds: { left: leftBound, right: rightBound, top: topBound, bottom: bottomBound },
  };
}
