import type { DiningTable, Reservation, ReservationStatus } from "./types";

export function reservationConflicts(existing: Reservation, candidate: Partial<Reservation> & Pick<Reservation, "dateISO" | "time" | "durationMinutes">): boolean;
export function canTransitionReservation(current: ReservationStatus, next: ReservationStatus): boolean;
export function reservationHoldsTable(status: ReservationStatus): boolean;
export function validateReservation(input: Pick<Reservation, "customerName" | "phone" | "partySize" | "dateISO" | "time" | "durationMinutes"> & Partial<Pick<Reservation, "tableId" | "id" | "notes">>, tables: DiningTable[], reservations: Reservation[], now?: Date): string | null;

export function canReduceReservationTableCapacity(tableId: string, seats: number, reservations: Reservation[]): boolean;
export function canRemoveReservationTable(tableId: string, reservations: Reservation[]): boolean;
