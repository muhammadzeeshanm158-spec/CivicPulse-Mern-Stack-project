// FIX: Saare forms ki validation ek jagah - duplicate logic khatam

import { REGEX } from "./constants";

export interface ValidationError {
  field: string;
  message: string;
}

// Email validate
export const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) return "Email required hai";
  if (!REGEX.EMAIL.test(email)) return "Valid email likho";
  return undefined;
};

// Password validate
export const validatePassword = (password: string): string | undefined => {
  if (!password) return "Password required hai";
  if (password.length < REGEX.PASSWORD_MIN)
    return `Password kam se kam ${REGEX.PASSWORD_MIN} characters ka ho`;
  return undefined;
};

// Issue Report validate - CitizenDashboard ke liye
export const validateIssueForm = (data: {
  title: string;
  description: string;
  category_id?: number;
  area_id?: number;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!data.title?.trim()) errors.title = "Title required";
  else if (data.title.trim().length < 5) errors.title = "Title min 5 chars";

  if (!data.description?.trim()) errors.description = "Description required";
  else if (data.description.trim().length < 10)
    errors.description = "Description min 10 chars";

  if (!data.category_id) errors.category_id = "Category select karo";
  if (!data.area_id) errors.area_id = "Area select karo";

  return errors;
};

// Comment validate
export const validateComment = (text: string): string | undefined => {
  if (!text.trim()) return "Comment empty nahi ho sakta";
  if (text.trim().length < 3) return "Comment min 3 chars";
  return undefined;
};

// Login validate
export const validateLogin = (email: string, password: string) => {
  const errors: any = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;
  return errors;
};
