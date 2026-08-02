export const COMMUNICATION_THREE_COLUMN_MIN_WIDTH = 1040;

export function getCommunicationLayout(snapshot = {}) {
  const desktop = snapshot.layoutMode === "desktop";
  const contentWidth = Math.max(0, Number(snapshot.contentWidth) || 0);
  const threeColumns =
    desktop && contentWidth >= COMMUNICATION_THREE_COLUMN_MIN_WIDTH;

  return Object.freeze({
    mode: desktop ? "desktop" : "mobile",
    columns: threeColumns ? 3 : desktop ? 2 : 1,
    contextMode: threeColumns ? "column" : desktop ? "inline" : "mobile",
    contentWidth,
  });
}

export function shouldUseCommunicationCenterConversationRoute(
  route = {},
  snapshot = {}
) {
  const layout = getCommunicationLayout(snapshot);

  return Boolean(
    layout.mode === "desktop" &&
      route.valid === true &&
      route.returnPage === "messagesInbox"
  );
}
