export const COMMUNICATION_THREE_COLUMN_MIN_WIDTH = 1040;

export function getCommunicationLayout(snapshot = {}, { emergency = false } = {}) {
  const desktop = snapshot.layoutMode === "desktop";
  const contentWidth = Math.max(0, Number(snapshot.contentWidth) || 0);
  const threeColumns =
    desktop && contentWidth >= (
      emergency ? 840 : COMMUNICATION_THREE_COLUMN_MIN_WIDTH
    );

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
  if (route.valid !== true) return false;

  const layout = getCommunicationLayout(snapshot);
  const explicitCommunicationShell =
    route.shell === "communicationCenter";
  const shellLayoutEligible =
    snapshot.layoutMode === "desktop" ||
    snapshot.layoutMode === "tablet";

  if (explicitCommunicationShell) {
    return shellLayoutEligible;
  }

  return Boolean(
    layout.mode === "desktop" &&
      route.returnPage === "messagesInbox"
  );
}
