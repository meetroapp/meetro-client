// Proposal only. The owning Deposit workspace applies this after explicit review.
export function proposeDepositInstruction(instruction) {
  const text = String(instruction || "").trim();
  if (!text) return null;
  const note = text.match(/^notes?\s*:\s*(.+)$/is);
  if (note) return { notes: note[1].trim() };
  const patch = { customerMessage: text };
  const due = text.match(/(?:due|make it due)\s+(.+?)(?:[.!]|$)/i);
  if (due) patch.dueDate = due[1].trim();
  const method = text.match(/(?:pay|payment)(?:\s+via|\s+by|\s+with|\s+instructions?\s*:?)\s+(.+?)(?:[.!]|$)/i);
  if (method) patch.paymentInstructions = method[1].trim();
  return patch;
}
