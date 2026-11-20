import type { PermissionKey, StaffRole } from "./types";

export function rolePermissionCeiling(role: StaffRole): PermissionKey[];
export function hasPermission(role: StaffRole, permission: PermissionKey, overrides?: Partial<Record<PermissionKey, boolean>>): boolean;
export function canManageStaff(actorRole: StaffRole, targetRole: StaffRole): boolean;
export function canAssignRole(actorRole: StaffRole, nextRole: StaffRole): boolean;
export function canGrantCustomPermission(actorRole: StaffRole, targetRole: StaffRole, permission: PermissionKey): boolean;
export function canRefund(role: StaffRole, amount: number, limit: number, overrides?: Partial<Record<PermissionKey, boolean>>): boolean;
