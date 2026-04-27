export type Role = 'Verified' | 'Apex' | 'Overseer';

export interface Profile {
  id: string;
  username: string;
  role: Role | string; // Allow string for legacy roles
  avatar_url?: string;
  last_seen?: string;
}

export interface Invite {
  token: string;
  phrase: string;
  assigned_role: Role;
  used: boolean;
}

export interface OrionVaultItem {
  id: string;
  title: string;
  content: string;
  classification: Role;
  cover_url?: string;
  file_urls?: string[];
  created_at: string;
  type: 'file' | 'folder';
  parent_id: string | null;
  owner_id: string;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  'Verified': 1,
  'External': 1,
  'Restricted': 2,
  'Apex': 3,
  'Internal': 3,
  'Clearance+': 4,
  'Overseer': 5,
  'Root': 5,
};

export function getRoleLabel(role?: string): string {
  if (!role) return 'UNKNOWN';
  const uiRole = mapClassificationToUI(role);
  return uiRole.toUpperCase();
}

export function mapClassificationToUI(type?: string): Role {
  if (!type) return "Verified";
  if (type === "External" || type === "Restricted" || type === "Verified") return "Verified";
  if (type === "Internal" || type === "Clearance+" || type === "Apex") return "Apex";
  if (type === "Root" || type === "Overseer") return "Overseer";
  return "Verified";
}

export function mapUIToClassification(uiLabel: string): Role {
  // Return exact role as requested
  if (uiLabel === "Verified") return "Verified";
  if (uiLabel === "Apex") return "Apex";
  if (uiLabel === "Overseer") return "Overseer";
  return uiLabel as Role;
}

export interface OrionNotification {
  id: string;
  user_id: string;
  type: 'message' | 'mention' | 'system';
  content: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  sender_id?: string;
  sender?: Profile;
  receiver?: Profile;
}

export function canAccess(userRole: string, recordClassification: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const recordLevel = ROLE_HIERARCHY[recordClassification] || 0;
  return userLevel >= recordLevel;
}
