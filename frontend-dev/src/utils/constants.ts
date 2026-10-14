// FIX: Central constants - har jagah hardcode string likhna PDF me mana hai

// API Endpoints
export const API_BASE_URL = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:5000/api/v1';

// User Roles - Backend ke hisaab se
export const USER_ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
  MANAGER: 'manager',
  ADMIN: 'admin',
} as const;

// Issue Status - Lowercase (Backend jo bhejta hai)
export const ISSUE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ASSIGNED: 'assigned',
} as const;

// Issue Priority
export const ISSUE_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 8,
  COMMENT_LIMIT: 5,
};

// SLA Hours
export const SLA_HOURS = {
  LOW: 72,
  MEDIUM: 48,
  HIGH: 24,
  CRITICAL: 12,
};

// Map Default - Karachi
export const MAP_DEFAULT = {
  CENTER: [24.8607, 67.0011] as [number, number],
  ZOOM: 12,
};

// Regex
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PK: /^(\+92|0)3\d{9}$/,
  PASSWORD_MIN: 6,
};