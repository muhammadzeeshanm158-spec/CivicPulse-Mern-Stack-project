export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  Submitted: ["Verified", "Rejected", "Duplicate"],
  Verified: ["Assigned", "Rejected", "Duplicate"],
  Assigned: ["In_Progress", "Rejected"],
  In_Progress: ["Resolved", "Escalated"],
  Escalated: ["In_Progress", "Resolved"],
  Resolved: ["Closed", "In_Progress"], // Reopened within 7 days
  Closed: [], // Terminal state
  Rejected: [], // Terminal state
  Duplicate: [], // Terminal state
};

// ⚠️ Make sure 'export' keyword is present here!
export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowedNextStates = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedNextStates) return false;
  return allowedNextStates.includes(newStatus);
}