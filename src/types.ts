export type Member      = { id: string; name: string; initial: string; colorKey: 'blue' | 'purple' | 'pink' | 'orange' };
export type Chore       = { id: string; name: string; icon: string; iconColor: string };
export type Day         = { id: string; short: string };
export type WeekHistory = { week: string; assignments: Record<string, string>; completed: Record<string, boolean> };

export type Role        = 'parent' | 'shared';
export type Identity    = { role: Role; memberId: string | null };

export type DeviceRole = 'adult' | 'display';
export type FamilySummary = { id: string; name: string; slug: string; createdAt: string };
export type DeviceSummary = {
  id: string;
  role: DeviceRole;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type SessionInfo = {
  paired: boolean;
  family?: FamilySummary;
  device?: DeviceSummary;
  adminUnlocked?: boolean;
};
