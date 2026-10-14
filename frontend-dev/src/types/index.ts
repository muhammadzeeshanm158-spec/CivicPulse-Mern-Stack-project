// FIX 1: Roles - Backend jo bhejta hai wohi rakho (lowercase + uppercase dono support)
// PDF ke hisaab se backend me ye roles hain
export type UserRole =
  | "GUEST"
  | "CITIZEN"
  | "FIELD_OFFICER"
  | "DEPARTMENT_MANAGER"
  | "ADMIN"
  | "citizen"
  | "officer"
  | "manager"
  | "admin"
  | "field_officer"
  | "department_manager";

// FIX 2: Issue Status - Backend lowercase bhejta hai (pending, in_progress, resolved)
// Lekin tumhara purana code UPPERCASE expect kar raha tha - dono support kar diya
export type IssueStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "pending"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "assigned"
  | "submitted"
  | "duplicate"; // manager duplicate bhi bhejta hai

// FIX 3: User - MySQL id number hota hai, lekin purane code ke liye string bhi allow
export interface User {
  id: number; // FIX: MySQL number
  _id?: string; // backward compat
  name: string;
  email: string;
  role: UserRole;
  departmentId?: number | string;
  department_id?: number; // FIX: snake_case
  department?: {
    id: number | string;
    name: string;
  };
  phone?: string;
  avatar?: string;
}

// FIX 4: Issue - Yahi main file hai, sab fields fix kiye
export interface Issue {
  id: number; // FIX: MySQL id number
  _id?: string; // backward compat for Mongo
  ticket_number?: string;
  title: string;
  description: string;

  // Category - dono naam support
  category?: string;
  category_id?: number;
  category_name?: string;

  // Area / Location - dono naam support
  area?: string;
  area_id?: number;
  area_name?: string;
  location?: string;
  address?: string;

  status: IssueStatus;
  priority?: "Low" | "Medium" | "High" | "Critical" | string;

  upvotes?: number;
  upvotesCount?: number;
  upvotes_count?: number;

  departmentId?: number | string;
  department_id?: number;
  department?: {
    id: number | string;
    name: string;
  };

  latitude: number;
  longitude: number;

  // Images - backend alag alag naam bhejta hai
  images?: string[];
  image_urls?: string[];
  issue_images?: string[];
  before_image?: string;
  before_image_url?: string;
  after_image_url?: string;
  proof_images?: string[];

  // Timestamps - dono format support
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  sla_deadline?: string;

  // Relations
  reporter?: {
    name: string;
    email: string;
    isAnonymous?: boolean;
    is_anonymous?: boolean;
  };
  assigned_officer?: {
    id?: number;
    name: string;
    department?: string;
    phone?: string;
  };
  assignedOfficer?: {
    id?: number;
    _id?: string;
    name: string;
  };
  assigned_officer_id?: number;

  // Extra
  is_anonymous?: boolean;
  isAnonymous?: boolean;
  isSlaBreached?: boolean;
  is_sla_breached?: boolean;
}

// FIX 5: Officer type bhi yahi add kar do - baar baar alag file me banana galat hai
export interface Officer {
  id: number;
  _id?: string;
  name: string;
  email?: string;
  department?: string;
  activeTasks?: number;
  active_tasks?: number;
}

// FIX 6: Comment type - yahi central rakho
export interface Comment {
  id: number;
  _id?: string;
  user: { name: string; role: string; id?: number };
  text: string;
  created_at?: string;
  createdAt?: string;
  parent_id?: number | null;
  parentId?: string | null;
}

// FIX 7: Helper functions - Ye PDF me extra marks dilayega
// Koi bhi file me id nikalna ho to ye use karo
export const getIssueId = (issue: Issue | any): number | string =>
  issue.id ?? issue._id;
export const getCategoryName = (issue: Issue | any): string =>
  issue.category_name || issue.category || "General";
export const getAreaName = (issue: Issue | any): string =>
  issue.area_name || issue.area || issue.location || "N/A";
export const getCreatedAt = (issue: Issue | any): string =>
  issue.created_at || issue.createdAt || new Date().toISOString();
export const isAnonymous = (issue: Issue | any): boolean =>
  issue.is_anonymous ??
  issue.isAnonymous ??
  issue.reporter?.is_anonymous ??
  false;
