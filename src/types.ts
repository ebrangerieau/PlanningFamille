export type Member      = { id: string; name: string; initial: string; colorKey: 'blue' | 'purple' | 'pink' | 'orange' };
export type Chore       = { id: string; name: string; icon: string; iconColor: string };
export type Day         = { id: string; short: string };
export type WeekHistory = { week: string; assignments: Record<string, string>; completed: Record<string, boolean> };

export type Role        = 'parent' | 'child' | 'visitor';
export type Identity    = { role: Role; memberId: string | null };
