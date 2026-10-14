// ============================================================
// 📜 STATUS TRANSITIONS - Single Source of Truth
// ============================================================
// PDF Requirement: Issue lifecycle ka state machine yahan define hoga
// Har status change se pehle isValidTransition() se check hoga
// Agar invalid transition hua to 409 Conflict return hoga

// Sab allowed transitions - PDF ke flowchart ke according
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Citizen report karta hai - Starting state
  Submitted: ["Verified", "Rejected", "Duplicate"],

  // Manager verify karta hai - Report sahi hai ya nahi
  Verified: ["Assigned", "Rejected", "Duplicate"],

  // Manager officer ko assign karta hai
  Assigned: ["InProgress", "Rejected"],

  // Officer kaam kar raha hai
  InProgress: ["Resolved", "Escalated"],

  // Officer ko help chahiye - Senior ko escalate
  Escalated: ["InProgress", "Resolved"],

  // Officer ne kaam complete kiya - Proof ke sath
  Resolved: ["Closed", "Reopened"], // Reopened = Citizen 7 din me reopen kar sakta hai

  // Citizen satisfied hai ya 7 din guzar gaye - Terminal state
  Closed: [],

  // Manager ne reject kiya - Fake report - Terminal state
  Rejected: [],

  // Duplicate report hai - Terminal state
  Duplicate: [],

  // Citizen ne resolve ke baad reopen kiya - Wapas assigned hoga
  Reopened: ["Assigned", "InProgress"],
};

// ============================================================
// ✅ isValidTransition - Har status update se pehle call hoga
// ============================================================
// Example: isValidTransition("Submitted", "Verified") => true
// isValidTransition("Submitted", "Resolved") => false (409 dega)
export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  // 1. Current status exist karta hai ya nahi check karo
  const allowedNextStates = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!allowedNextStates) {
    console.warn(`⚠ Unknown current status: ${currentStatus}`);
    return false;
  }

  // 2. New status allowed list me hai ya nahi
  return allowedNextStates.includes(newStatus);
}

// ============================================================
// 📋 getAllowedTransitions - Frontend ko batane ke liye ke
// is status se kahan ja sakte hain (dropdown ke liye)
// ============================================================
export function getAllowedTransitions(currentStatus: string): string[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

// ============================================================
// 🔒 isTerminalState - Kya ye final state hai?
// ============================================================
// Closed, Rejected, Duplicate ke baad koi transition nahi ho sakta
export function isTerminalState(status: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[status];
  return allowed? allowed.length === 0 : false;
}