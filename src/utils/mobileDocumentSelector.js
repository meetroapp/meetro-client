export const MOBILE_DOCUMENT_SELECTOR_MIN_DELTA = 3;
export const MOBILE_DOCUMENT_SELECTOR_HIDE_DISTANCE = 28;
export const MOBILE_DOCUMENT_SELECTOR_REVEAL_DISTANCE = 20;

export function createMobileDocumentSelectorScrollState(lastTop = 0) {
  return {
    lastTop: Math.max(0, Number(lastTop) || 0),
    direction: "",
    distance: 0,
  };
}

export function updateMobileDocumentSelectorVisibility(
  previousState,
  scrollTop,
  { collapsed = false, keyboardOpen = false, editableFocused = false } = {}
) {
  const state = previousState || createMobileDocumentSelectorScrollState();
  const nextTop = Math.max(0, Number(scrollTop) || 0);
  const delta = nextTop - state.lastTop;
  const nextState = {
    lastTop: nextTop,
    direction: state.direction,
    distance: state.distance,
  };

  // Keyboard/viewport movement and focus-driven scroll are not intentional
  // document-area navigation and must not toggle the selector.
  if (
    keyboardOpen ||
    editableFocused ||
    Math.abs(delta) < MOBILE_DOCUMENT_SELECTOR_MIN_DELTA
  ) {
    nextState.direction = "";
    nextState.distance = 0;
    return { collapsed, state: nextState };
  }

  if (nextTop <= 1) {
    nextState.direction = "";
    nextState.distance = 0;
    return { collapsed: false, state: nextState };
  }

  const direction = delta > 0 ? "down" : "up";
  nextState.direction = direction;
  nextState.distance = direction === state.direction
    ? state.distance + Math.abs(delta)
    : Math.abs(delta);

  if (
    !collapsed &&
    direction === "down" &&
    nextState.distance >= MOBILE_DOCUMENT_SELECTOR_HIDE_DISTANCE
  ) {
    return { collapsed: true, state: nextState };
  }

  if (
    collapsed &&
    direction === "up" &&
    nextState.distance >= MOBILE_DOCUMENT_SELECTOR_REVEAL_DISTANCE
  ) {
    return { collapsed: false, state: nextState };
  }

  return { collapsed, state: nextState };
}
