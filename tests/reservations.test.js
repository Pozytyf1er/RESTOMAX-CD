import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionReservation, reservationConflicts, reservationHoldsTable, validateReservation } from "../src/domain/reservations.js";

const now = new Date("2026-11-19T08:00:00.000Z");
const table = { id: "table-1", label: "T1", area: "Salle", seats: 4, status: "available" };
const input = (overrides = {}) => ({
  customerName: "Aminata Coulibaly",
  phone: "+225 0700000000",
  partySize: 4,
  dateISO: "2026-11-19",
  time: "18:00",
  durationMinutes: 90,
  tableId: "table-1",
  ...overrides,
});
const existing = (overrides = {}) => ({
  id: "RES-1", customerName: "Koffi Yao", phone: "+225 0500000000", partySize: 2,
  dateISO: "2026-11-19", time: "17:00", durationMinutes: 90,
  tableId: "table-1", tableLabel: "T1", status: "confirmed",
  createdAtISO: "2026-11-19T08:00:00.000Z", ...overrides,
});

test("accepts a valid future reservation with a suitable table", () => {
  assert.equal(validateReservation(input(), [table], [], now), null);
});

test("rejects invalid guest details, party size and duration", () => {
  assert.equal(validateReservation(input({ customerName: " " }), [table], [], now), "customer_name");
  assert.equal(validateReservation(input({ phone: "abc" }), [table], [], now), "phone");
  assert.equal(validateReservation(input({ phone: "--------" }), [table], [], now), "phone");
  assert.equal(validateReservation(input({ phone: "+225 0700 000 000 000 000" }), [table], [], now), "phone");
  assert.equal(validateReservation(input({ partySize: 5 }), [table], [], now), "table_capacity");
  assert.equal(validateReservation(input({ partySize: 0 }), [table], [], now), "party_size");
  assert.equal(validateReservation(input({ partySize: 1.5 }), [table], [], now), "party_size");
  assert.equal(validateReservation(input({ durationMinutes: 15 }), [table], [], now), "duration");
  assert.equal(validateReservation(input({ notes: "x".repeat(501) }), [table], [], now), "notes");
});

test("rejects past reservations, invalid calendar dates and invalid time slots", () => {
  assert.equal(validateReservation(input({ dateISO: "2026-11-18" }), [table], [], now), "date");
  assert.equal(validateReservation(input({ dateISO: "2026-02-30" }), [table], [], now), "date");
  assert.equal(validateReservation(input({ time: "25:00" }), [table], [], now), "time");
  assert.equal(validateReservation(input({ time: "23:30", durationMinutes: 90 }), [table], [], now), "duration");
  assert.equal(validateReservation(input({ time: "08:00" }), [table], [], now), "date");
});

test("prevents overlapping reservations on the same table", () => {
  assert.equal(validateReservation(input(), [table], [existing()], now), "table_conflict");
  assert.equal(reservationConflicts(existing(), input()), true);
});

test("allows adjacent reservations and ignores terminal reservations", () => {
  assert.equal(reservationConflicts(existing({ time: "16:00", durationMinutes: 120 }), input()), false);
  assert.equal(reservationConflicts(existing({ status: "cancelled" }), input()), false);
  assert.equal(reservationConflicts(existing({ status: "no_show" }), input()), false);
  assert.equal(reservationConflicts(existing({ status: "completed" }), input()), false);
});

test("does not conflict across tables or dates and ignores the reservation being edited", () => {
  assert.equal(reservationConflicts(existing(), input({ tableId: "table-2" })), false);
  assert.equal(reservationConflicts(existing(), input({ dateISO: "2026-11-20" })), false);
  assert.equal(reservationConflicts(existing(), input({ id: "RES-1" })), false);
});

test("fails closed when an existing reservation has an invalid time or duration", () => {
  assert.equal(reservationConflicts(existing({ time: "bad" }), input()), true);
  assert.equal(reservationConflicts(existing({ durationMinutes: 0 }), input()), true);
});

test("blocks tables that are cleaning or unavailable", () => {
  assert.equal(validateReservation(input(), [{ ...table, status: "cleaning" }], [], now), "table_unavailable");
  assert.equal(validateReservation(input(), [{ ...table, status: "unavailable" }], [], now), "table_unavailable");
  assert.equal(validateReservation(input(), [{ ...table, status: "occupied" }], [], now), "table_occupied");
  assert.equal(validateReservation(input({ tableId: "missing" }), [table], [], now), "table_not_found");
});

test("enforces reservation lifecycle transitions", () => {
  assert.equal(canTransitionReservation("pending", "confirmed"), true);
  assert.equal(canTransitionReservation("confirmed", "arrived"), true);
  assert.equal(canTransitionReservation("arrived", "seated"), true);
  assert.equal(canTransitionReservation("seated", "completed"), true);
  assert.equal(canTransitionReservation("cancelled", "confirmed"), false);
  assert.equal(canTransitionReservation("completed", "cancelled"), false);
  assert.equal(canTransitionReservation("arrived", "no_show"), false);
});

test("only confirmed, arrived and seated reservations hold the physical table", () => {
  assert.equal(reservationHoldsTable("pending"), false);
  assert.equal(reservationHoldsTable("confirmed"), true);
  assert.equal(reservationHoldsTable("arrived"), true);
  assert.equal(reservationHoldsTable("seated"), true);
  assert.equal(reservationHoldsTable("cancelled"), false);
  assert.equal(reservationHoldsTable("no_show"), false);
  assert.equal(reservationHoldsTable("completed"), false);
});

test("prevents reducing capacity below an active reservation", async () => {
  const { canReduceReservationTableCapacity } = await import("../src/domain/reservations.js");
  assert.equal(canReduceReservationTableCapacity("table-1", 3, [existing({ partySize: 4 })]), false);
  assert.equal(canReduceReservationTableCapacity("table-1", 4, [existing({ partySize: 4 })]), true);
  assert.equal(canReduceReservationTableCapacity("table-1", 2, [existing({ status: "pending", partySize: 4 })]), false);
});

test("prevents deleting a table with a confirmed, arrived or seated reservation", async () => {
  const { canRemoveReservationTable } = await import("../src/domain/reservations.js");
  assert.equal(canRemoveReservationTable("table-1", [existing({ status: "confirmed" })]), false);
  assert.equal(canRemoveReservationTable("table-1", [existing({ status: "arrived" })]), false);
  assert.equal(canRemoveReservationTable("table-1", [existing({ status: "seated" })]), false);
  assert.equal(canRemoveReservationTable("table-1", [existing({ status: "pending" })]), false);
  assert.equal(canRemoveReservationTable("table-1", [existing({ status: "completed" })]), true);
});
