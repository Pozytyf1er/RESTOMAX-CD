import test from "node:test";
import assert from "node:assert/strict";
import { attendanceStatusForShift, canCancelShift, canCheckIn, canCheckOut, canCreateShift, workedMinutes } from "../src/domain/hr.js";

const staff = [{ id: "STAFF-1", name: "Aminata", role: "server", active: true }];
const shift = { id: "SHIFT-1", staffId: "STAFF-1", dateISO: "2026-11-19", startTime: "08:00", endTime: "16:00", status: "scheduled", createdAtISO: "2026-11-18T12:00:00Z" };
const now = new Date("2026-11-19T08:12:00Z");

test("creates shifts only for active staff with valid future dates and times", () => {
  assert.equal(canCreateShift(shift, staff, [], "2026-11-19"), true);
  assert.equal(canCreateShift({ ...shift, startTime: "16:00", endTime: "08:00" }, staff, [], "2026-11-19"), false);
  assert.equal(canCreateShift({ ...shift, dateISO: "2026-02-31" }, staff, [], "2026-11-19"), false);
  assert.equal(canCreateShift(shift, [{ ...staff[0], active: false }], [], "2026-11-19"), false);
  assert.equal(canCreateShift({ ...shift, dateISO: "2026-11-18" }, staff, [], "2026-11-19"), false);
});

test("prevents overlapping shifts for the same employee", () => {
  const existing = { ...shift, id: "SHIFT-2", startTime: "12:00", endTime: "18:00" };
  assert.equal(canCreateShift(shift, staff, [existing], "2026-11-19"), false);
  assert.equal(canCreateShift({ ...shift, startTime: "06:00", endTime: "08:00" }, staff, [existing], "2026-11-19"), true);
  assert.equal(canCreateShift(shift, staff, [{ ...existing, status: "cancelled" }], "2026-11-19"), true);
});

test("check-in is available only once for active staff on the shift date", () => {
  assert.equal(canCheckIn(shift, staff, [], now), true);
  assert.equal(canCheckIn(shift, staff, [{ id: "ATT-1", staffId: "STAFF-1", shiftId: "SHIFT-1", dateISO: "2026-11-19", checkInISO: now.toISOString(), status: "late" }], now), false);
  assert.equal(canCheckIn({ ...shift, dateISO: "2026-11-20" }, staff, [], now), false);
  assert.equal(canCheckIn(shift, [{ ...staff[0], active: false }], [], now), false);
});

test("marks late arrivals after a five-minute grace period", () => {
  assert.equal(attendanceStatusForShift(shift, "2026-11-19T08:04:00Z"), "present");
  assert.equal(attendanceStatusForShift(shift, "2026-11-19T08:06:00Z"), "late");
});

test("checks out only open attendance and calculates worked minutes", () => {
  const attendance = { id: "ATT-1", staffId: "STAFF-1", shiftId: "SHIFT-1", dateISO: "2026-11-19", checkInISO: "2026-11-19T08:00:00Z", status: "present" };
  assert.equal(canCheckOut(attendance), true);
  assert.equal(canCheckOut({ ...attendance, checkOutISO: "2026-11-19T16:00:00Z" }), false);
  assert.equal(workedMinutes({ ...attendance, checkOutISO: "2026-11-19T16:30:00Z" }), 510);
});

test("a shift cannot be cancelled after attendance has started", () => {
  assert.equal(canCancelShift(shift, []), true);
  assert.equal(canCancelShift(shift, [{ id: "ATT-1", staffId: "STAFF-1", shiftId: "SHIFT-1", dateISO: "2026-11-19", checkInISO: now.toISOString(), status: "present" }]), false);
  assert.equal(canCancelShift({ ...shift, status: "completed" }, []), false);
});
