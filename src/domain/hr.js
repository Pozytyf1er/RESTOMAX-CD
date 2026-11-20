function minutes(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!match) return NaN;
  const hour = Number(match[1]); const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : NaN;
}
function validDate(dateISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO ?? "")) return false;
  const date = new Date(dateISO + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === dateISO;
}
export function canCreateShift(shift, staff, shifts, todayISO = new Date().toISOString().slice(0, 10)) {
  const member = staff.find((entry) => entry.id === shift.staffId);
  const start = minutes(shift.startTime); const end = minutes(shift.endTime);
  if (!member || !member.active || !validDate(shift.dateISO) || shift.dateISO < todayISO) return false;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  return !shifts.some((existing) => existing.staffId === shift.staffId && existing.dateISO === shift.dateISO && existing.status !== "cancelled" && start < minutes(existing.endTime) && minutes(existing.startTime) < end);
}
export function canCheckIn(shift, staff, attendance, now = new Date()) {
  if (!shift || shift.status !== "scheduled") return false;
  const member = staff.find((entry) => entry.id === shift.staffId);
  if (!member || !member.active || shift.dateISO !== now.toISOString().slice(0, 10)) return false;
  if (attendance.some((entry) => entry.shiftId === shift.id)) return false;
  return now.getTime() <= new Date(shift.dateISO + "T" + shift.endTime + ":00+00:00").getTime();
}
export function attendanceStatusForShift(shift, checkInISO) {
  const actual = new Date(checkInISO);
  const scheduledStart = new Date(shift.dateISO + "T" + shift.startTime + ":00+00:00");
  return actual.getTime() > scheduledStart.getTime() + 5 * 60 * 1000 ? "late" : "present";
}
export function canCheckOut(attendance) {
  return Boolean(attendance && attendance.checkInISO && !attendance.checkOutISO);
}
export function canCancelShift(shift, attendance) {
  return Boolean(shift && shift.status === "scheduled" && !attendance.some((entry) => entry.shiftId === shift.id));
}
export function workedMinutes(attendance, now = new Date()) {
  if (!attendance?.checkInISO) return 0;
  const end = attendance.checkOutISO ? new Date(attendance.checkOutISO) : now;
  const total = Math.floor((end.getTime() - new Date(attendance.checkInISO).getTime()) / 60000);
  return Math.max(0, total);
}
