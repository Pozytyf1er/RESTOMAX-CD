function minuteOfDay(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!match) return NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : NaN;
}

function validDuration(value) {
  return Number.isSafeInteger(value) && value >= 30 && value <= 240;
}

function validSlot(time, durationMinutes) {
  const start = minuteOfDay(time);
  return Number.isFinite(start) && validDuration(durationMinutes) && start + durationMinutes <= 24 * 60;
}

export function reservationConflicts(existing, candidate) {
  if (!candidate.tableId || existing.id === candidate.id) return false;
  if (existing.tableId !== candidate.tableId || existing.dateISO !== candidate.dateISO) return false;
  if (["cancelled", "no_show", "completed"].includes(existing.status)) return false;
  if (!validSlot(existing.time, existing.durationMinutes) || !validSlot(candidate.time, candidate.durationMinutes)) return true;
  const startA = minuteOfDay(existing.time);
  const startB = minuteOfDay(candidate.time);
  const endA = startA + existing.durationMinutes;
  const endB = startB + candidate.durationMinutes;
  return startA < endB && startB < endA;
}

export function canTransitionReservation(current, next) {
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["arrived", "cancelled", "no_show"],
    arrived: ["seated", "cancelled"],
    seated: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  return transitions[current]?.includes(next) ?? false;
}

export function reservationHoldsTable(status) {
  return ["confirmed", "arrived", "seated"].includes(status);
}

export function validateReservation(input, tables, reservations, now = new Date()) {
  if (!input || !Array.isArray(tables) || !Array.isArray(reservations) || !(now instanceof Date) || !Number.isFinite(now.getTime())) return "invalid_input";
  const name = typeof input.customerName === "string" ? input.customerName.trim() : "";
  if (!name || name.length > 80) return "customer_name";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^\+?[0-9\s-]+$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15) return "phone";
  if (!Number.isSafeInteger(input.partySize) || input.partySize < 1 || input.partySize > 20) return "party_size";
  if (!validDuration(input.durationMinutes)) return "duration";
  if (typeof input.notes !== "undefined" && (typeof input.notes !== "string" || input.notes.length > 500)) return "notes";
  if (typeof input.dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dateISO)) return "date";
  const parsedDay = new Date(input.dateISO + "T00:00:00Z");
  if (!Number.isFinite(parsedDay.getTime()) || parsedDay.toISOString().slice(0, 10) !== input.dateISO) return "date";
  const minutes = minuteOfDay(input.time);
  if (!Number.isFinite(minutes)) return "time";
  if (minutes + input.durationMinutes > 24 * 60) return "duration";
  const start = new Date(input.dateISO + "T" + input.time + ":00+00:00");
  if (start.getTime() <= now.getTime()) return "date";
  if (input.tableId !== undefined && (typeof input.tableId !== "string" || !input.tableId.trim())) return "table_not_found";
  if (input.tableId) {
    const table = tables.find((entry) => entry.id === input.tableId);
    if (!table) return "table_not_found";
    if (!Number.isSafeInteger(table.seats) || table.seats < input.partySize) return "table_capacity";
    if (["cleaning", "unavailable"].includes(table.status)) return "table_unavailable";
    if (table.status === "occupied" && input.dateISO === now.toISOString().slice(0, 10)) return "table_occupied";
    if (reservations.some((entry) => reservationConflicts(entry, input))) return "table_conflict";
  }
  return null;
}

export function canReduceReservationTableCapacity(tableId, seats, reservations) {
  if (!Number.isSafeInteger(seats) || seats < 1 || !Array.isArray(reservations)) return false;
  return !reservations.some((reservation) => reservation.tableId === tableId
    && !["cancelled", "no_show", "completed"].includes(reservation.status)
    && reservation.partySize > seats);
}

export function canRemoveReservationTable(tableId, reservations) {
  if (!tableId || !Array.isArray(reservations)) return false;
  return !reservations.some((reservation) => reservation.tableId === tableId
    && !["cancelled", "no_show", "completed"].includes(reservation.status));
}
