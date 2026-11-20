import type { AttendanceEntry, StaffMember, StaffShift } from "./types";

export function canCreateShift(shift: Pick<StaffShift, "staffId" | "dateISO" | "startTime" | "endTime">, staff: StaffMember[], shifts: StaffShift[], todayISO?: string): boolean;
export function canCheckIn(shift: StaffShift | undefined, staff: StaffMember[], attendance: AttendanceEntry[], now?: Date): boolean;
export function attendanceStatusForShift(shift: StaffShift, checkInISO: string): "present" | "late";
export function canCheckOut(attendance: AttendanceEntry | undefined): boolean;
export function canCancelShift(shift: StaffShift | undefined, attendance: AttendanceEntry[]): boolean;
export function workedMinutes(attendance: AttendanceEntry, now?: Date): number;
