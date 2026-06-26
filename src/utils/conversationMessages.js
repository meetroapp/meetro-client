function getMessageIdentity(message) {
  if (!message) return "";

  return (
    message.backendId ||
    message.id ||
    [
      message.senderRole || message.sender || "",
      message.createdAt || message.time || "",
      message.type || "",
      message.text || message.title || message.imageUrl || "",
    ].join("|")
  );
}

function getMessageTimeValue(message) {
  const createdAt = message?.createdAt;

  if (typeof createdAt === "number") return createdAt;

  const parsed = Date.parse(createdAt || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function mergeConversationMessages(localMessages = [], incomingMessages = []) {
  const merged = [];
  const seen = new Set();

  [...localMessages, ...incomingMessages].forEach((message) => {
    const identity = getMessageIdentity(message);

    if (!identity || seen.has(identity)) return;

    seen.add(identity);
    merged.push(message);
  });

  return merged.sort((a, b) => getMessageTimeValue(a) - getMessageTimeValue(b));
}

