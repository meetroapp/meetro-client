function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validVerticalRect(rect) {
  return Boolean(
    rect &&
      finiteNumber(rect.top) &&
      finiteNumber(rect.bottom) &&
      rect.bottom >= rect.top
  );
}

export function resolveBusinessDocumentDeliveryMenuPlacement({
  triggerRect,
  menuHeight,
  boundaryRect,
  gap = 4,
} = {}) {
  if (
    !validVerticalRect(triggerRect) ||
    !validVerticalRect(boundaryRect) ||
    !finiteNumber(menuHeight) ||
    menuHeight <= 0
  ) {
    return "down";
  }

  const safeGap =
    finiteNumber(gap) && gap >= 0 ? gap : 4;

  const spaceBelow = Math.max(
    0,
    boundaryRect.bottom - triggerRect.bottom - safeGap
  );

  const spaceAbove = Math.max(
    0,
    triggerRect.top - boundaryRect.top - safeGap
  );

  if (spaceBelow >= menuHeight) {
    return "down";
  }

  if (spaceAbove >= menuHeight) {
    return "up";
  }

  return spaceAbove > spaceBelow ? "up" : "down";
}
